import { EyeOutlined } from '@ant-design/icons';
import { App, Button, Card, Rate, Space, Tag, Typography } from 'antd';
import type { DocListItem } from '@repo/api';
import { useNavigate } from 'react-router-dom';

type Props = {
  doc: DocListItem;
};

export function DocCardItem({ doc }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const title = doc.title?.trim() || '未命名文档';
  const summary = doc.summary?.trim() || '';
  const tags = Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [];
  const hasScore = typeof doc.score === 'number' && !Number.isNaN(doc.score);
  const canView = doc.can_view === true;
  const disabled = !canView;

  const goPreview = () => {
    if (!canView) {
      message.warning('暂无访问权限');
      return;
    }
    navigate(`/dashboard/docs/${encodeURIComponent(doc.id)}`);
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
          <button
            type="button"
            onClick={goPreview}
            className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
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
          {summary ? (
            <Typography.Paragraph type="secondary" className="!mb-0 line-clamp-2 text-sm leading-relaxed">
              {summary}
            </Typography.Paragraph>
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
        <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
          {hasScore ? (
            <div className="flex items-center gap-1" aria-label={`评分 ${doc.score}`}>
              <Rate disabled allowHalf value={doc.score} className="!text-sm" />
            </div>
          ) : null}
          <Button
            type="primary"
            ghost={disabled}
            disabled={false}
            icon={<EyeOutlined />}
            onClick={goPreview}
            className="shrink-0"
          >
            预览
          </Button>
        </div>
      </div>
    </Card>
  );
}
