import { App, Button, Card, Form, Input, Space, Typography } from 'antd';
import { getApiErrorMessage } from '@repo/api';
import { useAuth } from '@repo/hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from 'usehooks-ts';
import { useWebApi } from '../hooks/use-web-api';
import { zodErrorToFormFieldData } from '../lib/zod-antd';
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from '../schemas/account';

export function AccountPage() {
  useDocumentTitle('账户信息 · client-react-sp');

  const { message } = App.useApp();
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const api = useWebApi();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(raw: ChangePasswordFormValues) {
    const parsed = changePasswordFormSchema.safeParse(raw);
    if (!parsed.success) {
      form.setFields(zodErrorToFormFieldData(parsed.error));
      return;
    }
    const v = parsed.data;

    setSubmitting(true);
    let exitAfterOk = false;
    try {
      await api.auth.changePassword({
        current_password: v.current_password,
        new_password: v.new_password,
      });
      exitAfterOk = true;
      clearAuth();
      message.success('密码已更新，请使用新密码重新登录');
      navigate('/login', { replace: true });
    } catch (e) {
      message.error(getApiErrorMessage(e));
    } finally {
      if (!exitAfterOk) setSubmitting(false);
    }
  }

  return (
    <div>
      <Typography.Title level={4} className="!mb-6">
        账户信息
      </Typography.Title>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="更改密码" className="shadow-sm">
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
            <Form.Item name="current_password" label="当前密码">
              <Input.Password autoComplete="current-password" placeholder="请输入当前密码" />
            </Form.Item>
            <Form.Item name="new_password" label="新密码">
              <Input.Password autoComplete="new-password" placeholder="请输入您的新密码" />
            </Form.Item>
            <Form.Item name="new_password_confirm" label="重复新密码">
              <Input.Password autoComplete="new-password" placeholder="请再次输入您的新密码" />
            </Form.Item>
            <Typography.Paragraph type="secondary" className="!mb-4 !text-sm">
              <span className="font-medium text-neutral-700">密码安全性要求</span>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>至少 6 个字符（后端校验）；建议 8 位以上更安全</li>
                <li>可包含大小写与数字，勿与当前密码相同</li>
              </ul>
            </Typography.Paragraph>
            <Form.Item className="!mb-0">
              <Button type="primary" htmlType="submit" loading={submitting}>
                保存新密码
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="说明" className="shadow-sm">
          <Space direction="vertical" size="middle" className="w-full">
            <Typography.Paragraph type="secondary" className="!mb-0 !text-sm">
              修改密码成功后，本页会<strong>清除本地登录态并跳转登录页</strong>，请用新密码重新登录。
              其它设备上的旧令牌在服务端未撤销前仍可能有效至过期（见{' '}
              <code className="rounded bg-neutral-100 px-1">docs/FRONTEND_API.md</code> §2.1）。
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" className="!mb-0 !text-sm">
              管理员可在 <strong>用户管理</strong> 中删除其他用户账号（不可删除当前登录账号）。
            </Typography.Paragraph>
          </Space>
        </Card>
      </div>
    </div>
  );
}
