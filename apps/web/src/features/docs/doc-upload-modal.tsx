import { InboxOutlined } from '@ant-design/icons';
import { App, Form, Input, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { getApiErrorMessage } from '@repo/api';
import { useState } from 'react';
import { useWebApi } from '../../hooks/use-web-api';
import { formatDocDateTime } from './format-doc-time';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function normFile(e: { fileList: UploadFile[] }) {
  return e?.fileList;
}

export function DocUploadModal({ open, onClose, onSuccess }: Props) {
  const { message } = App.useApp();
  const api = useWebApi();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const fileList = values.file as UploadFile[] | undefined;
      const raw = fileList?.[0]?.originFileObj;
      if (!(raw instanceof File)) {
        message.warning('请选择 .md 或 .docx 文件');
        return;
      }
      const name = raw.name.toLowerCase();
      if (!name.endsWith('.md') && !name.endsWith('.docx')) {
        message.warning('仅支持 .md 与 .docx（.doc 不支持）');
        return;
      }

      setSubmitting(true);
      const titleStr = String(values.title).trim();
      const desc = values.description?.trim() ?? '';
      /** 与 DEV_PLAN 一致：无描述时用标题截断；多数 FastAPI 接口绑定的是 `summary` 表单字段 */
      const summaryForApi = desc || titleStr.slice(0, 120);

      const fd = new FormData();
      fd.append('title', titleStr);
      fd.append('summary', summaryForApi);
      if (desc) fd.append('description', desc);
      const cat = values.category?.trim();
      if (cat) fd.append('category', cat);
      const tagsRaw = values.tags?.trim();
      if (tagsRaw) {
        const arr = tagsRaw.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
        if (arr.length) fd.append('tags', JSON.stringify(arr));
      }
      // 显式文件名，避免部分服务端拿不到原始名
      fd.append('file', raw, raw.name);

      const { data } = await api.docs.upload(fd);
      message.success(
        `上传成功 · ${formatDocDateTime(data.created_at) ?? data.created_at}`
      );
      form.resetFields();
      onSuccess();
      onClose();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!submitting) {
      form.resetFields();
      onClose();
    }
  };

  return (
    <Modal
      title="上传文档（管理员）"
      open={open}
      onOk={() => void handleOk()}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="上传"
      destroyOnClose
      width={560}
    >
      <p className="mb-4 text-sm text-neutral-500">
        支持 UTF-8 的 <strong>.md</strong> 与 <strong>.docx</strong>（服务端转为 Markdown，版式为近似还原）。
      </p>
      <Form form={form} layout="vertical" className="!pt-1">
        <Form.Item
          name="title"
          label="文档标题"
          rules={[{ required: true, message: '请填写标题' }]}
        >
          <Input placeholder="将显示在文档列表中" maxLength={200} showCount />
        </Form.Item>
        <Form.Item name="description" label="简单描述（可选）">
          <Input.TextArea
            placeholder="对应列表摘要；将优先于 summary 字段提交为 description"
            rows={3}
            maxLength={2000}
            showCount
          />
        </Form.Item>
        <Form.Item name="category" label="分类（可选）">
          <Input placeholder="与后端 category 一致即可" maxLength={120} />
        </Form.Item>
        <Form.Item name="tags" label="标签（可选）">
          <Input placeholder="多个用英文或中文逗号分隔" maxLength={500} />
        </Form.Item>
        <Form.Item
          name="file"
          label="文件"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: '请选择文件' }]}
        >
          <Upload.Dragger
            maxCount={1}
            accept=".md,.docx"
            beforeUpload={() => false}
            className="!bg-neutral-50"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined className="text-emerald-600" />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此</p>
            <p className="ant-upload-hint text-xs text-neutral-500">.md ≤2MB · .docx ≤10MB（以后端限制为准）</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
