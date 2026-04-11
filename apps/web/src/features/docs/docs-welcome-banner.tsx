import { SoundOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

export function DocsWelcomeBanner() {
  return (
    <div className="flex items-stretch gap-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white px-5 py-4 shadow-sm">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-md"
        aria-hidden
      >
        <SoundOutlined />
      </div>
      <div className="min-w-0 flex-1">
        <Typography.Title level={5} className="!mb-1 !mt-0 !text-neutral-900">
          欢迎查阅文档
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0 text-sm leading-relaxed">
          在左侧选择业务分类，快速定位常用说明；支持关键词搜索与预览。若暂无访问权限，请联系管理员开通。
          <span className="mt-1 block text-neutral-500">
            管理员账号可在本页上方使用「上传文档」入库 .md / .docx（见接口 POST /api/v1/docs/upload）。
          </span>
        </Typography.Paragraph>
      </div>
    </div>
  );
}
