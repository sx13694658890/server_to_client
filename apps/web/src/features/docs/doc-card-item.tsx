import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { App, Button, Card, Popconfirm, Rate, Space, Tag, Typography } from 'antd';
import type { DocContentSource, DocListItem } from '@repo/api';
import { getApiErrorMessage } from '@repo/api';
import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebApi } from '../../hooks/use-web-api';
import { formatDocDateTime } from './format-doc-time';

type Props = {
  doc: DocListItem;
  onDeleted?: () => void;
};

const SOURCE_LABEL: Record<DocContentSource, string> = {
  repo: '仓库',
  upload: '上传',
  inline: '库内',
};

export function DocCardItem({ doc, onDeleted }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const api = useWebApi();
  const [deleting, setDeleting] = useState(false);

  const title = doc.title?.trim() || '未命名文档';
  const summary = doc.summary?.trim() || '';
  const tags = Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [];
  const hasScore = typeof doc.score === 'number' && !Number.isNaN(doc.score);
  const canView = doc.can_view === true;
  const disabled = !canView;
  const canDelete = doc.can_delete === true;
  const createdLabel = formatDocDateTime(doc.created_at);
  const src = doc.content_source;
  const sourceLabel = src && SOURCE_LABEL[src] ? SOURCE_LABEL[src] : null;

  const goPreview = () => {
    if (!canView) {
      message.warning('暂无访问权限');
      return;
    }
    navigate(`/dashboard/docs/${encodeURIComponent(doc.id)}`);
  };

  const handleDelete = async (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setDeleting(true);
    try {
      await api.docs.remove(doc.id);
      message.success('已删除');
      onDeleted?.();
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      className={`transition-shadow duration-200 ${
        disabled ? '!border-neutral-200 !bg-neutral-50/80 opacity-90' : 'hover:shadow-md'
      } !border-neutral-200 shadow-sm`}
      styles={{ body: { padding: 20 } }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goPreview}
              className="block min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left sm:flex-none"
            >
              <Typography.Title
                level={5}
                className={`!mb-0 line-clamp-2 !text-base !font-semibold ${
                  disabled ? 'text-neutral-500' : 'text-neutral-900 hover:text-emerald-700'
                }`}
              >
                {title}
              </Typography.Title>
            </button>
            {sourceLabel ? (
              <Tag color="blue" className="!m-0 shrink-0">
                {sourceLabel}
              </Tag>
            ) : null}
          </div>
          {summary ? (
            <Typography.Paragraph type="secondary" className="!mb-0 line-clamp-2 text-sm leading-relaxed">
              {summary}
            </Typography.Paragraph>
          ) : null}
          {createdLabel ? (
            <Typography.Text type="secondary" className="!block text-xs">
              {doc.updated_at && doc.updated_at !== doc.created_at
                ? `上传/创建：${createdLabel} · 更新：${formatDocDateTime(doc.updated_at) ?? ''}`
                : `上传/创建：${createdLabel}`}
            </Typography.Text>
          ) : null}
          {tags.length > 0 ? (
            <Space size={[4, 4]} wrap className="pt-0.5">
              {tags.map((t) => (
                <Tag key={t} className="m-0">
                  {t}
                </Tag>
              ))}
            </Space>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          {hasScore ? (
            <div className="flex items-center gap-1" aria-label={`评分 ${doc.score}`}>
              <Rate disabled allowHalf value={doc.score} className="!text-sm" />
            </div>
          ) : null}
          <Space wrap className="sm:!justify-end">
            <Button
              type="primary"
              ghost={disabled}
              icon={<EyeOutlined />}
              onClick={goPreview}
              className="shrink-0"
            >
              预览
            </Button>
            {canDelete ? (
              <Popconfirm
                title="确定删除该文档？"
                description="上传类文档将同时删除服务器上的文件，且不可恢复。"
                okText="删除"
                okType="danger"
                cancelText="取消"
                onConfirm={() => void handleDelete()}
              >
                <Button
                  danger
                  type="default"
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>
      </div>
    </Card>
  );
}
