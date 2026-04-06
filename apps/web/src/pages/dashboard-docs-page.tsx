import { Card, Typography } from 'antd';
import { useDocumentTitle } from 'usehooks-ts';

const DOC_LINKS = [
  { title: 'HTTP API 参考（接口专篇）', path: 'docs/FRONTEND_API.md' },
  { title: '前端对接总览（工程与安全）', path: 'docs/FRONTEND.md' },
  { title: '登录后导航与规划', path: 'docs/POST_LOGIN_NAV.md' },
  { title: '前端工程开发计划', path: 'docs/FRONTEND_DEV_PLAN.md' },
];

/** 仓库内 Markdown 说明索引（开发时在 IDE 中打开对应路径） */
export function DashboardDocsPage() {
  useDocumentTitle('使用文档 · client-react-sp');

  return (
    <div>
      <Typography.Title level={4} className="!mb-6">
        使用文档
      </Typography.Title>
      <Card>
        <Typography.Paragraph type="secondary" className="!mb-4">
          以下为仓库 <code>docs/</code> 目录中的说明文件，请在编辑器或版本库中打开查看完整内容。
        </Typography.Paragraph>
        <ul className="list-inside list-disc space-y-2 text-neutral-800">
          {DOC_LINKS.map((d) => (
            <li key={d.path}>
              <Typography.Text strong>{d.title}</Typography.Text>
              <Typography.Text type="secondary" className="ml-2 font-mono text-sm">
                {d.path}
              </Typography.Text>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
