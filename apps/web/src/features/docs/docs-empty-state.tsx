import { FileTextOutlined } from '@ant-design/icons';
import { Empty, Typography } from 'antd';

type Props = {
  keyword?: string;
};

export function DocsEmptyState({ keyword }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white py-16">
      <Empty
        image={<FileTextOutlined className="text-5xl text-neutral-300" />}
        description={
          <div className="space-y-1">
            <Typography.Text>暂无文档</Typography.Text>
            {keyword ? (
              <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
                未找到与「{keyword}」相关的内容，可更换关键词或切换左侧分类。
              </Typography.Paragraph>
            ) : (
              <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
                该分类下还没有可用文档，或后端尚未同步数据。
              </Typography.Paragraph>
            )}
          </div>
        }
      />
    </div>
  );
}
