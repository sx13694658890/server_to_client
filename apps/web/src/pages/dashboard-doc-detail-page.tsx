import { ArrowLeftOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { App, Button, FloatButton, Skeleton, Typography } from 'antd';
import { getApiErrorMessage, type DocDetail } from '@repo/api';
import { useCallback, useEffect, useState } from 'react';
import { useDocumentTitle } from 'usehooks-ts';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocMarkdown, DocsErrorState, DocsSidebar } from '../features/docs';
import { useWebApi } from '../hooks/use-web-api';

export function DashboardDocDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const api = useWebApi();
  const { message } = App.useApp();

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [markdownFromFile, setMarkdownFromFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!docId) {
      setError('缺少文档 ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMarkdownFromFile(null);
    try {
      const { data } = await api.docs.detail(docId);
      setDoc(data);

      if (data.can_view === true && data.content_url?.trim()) {
        try {
          const res = await api.docs.content(data.content_url.trim());
          const text = typeof res.data === 'string' ? res.data : String(res.data ?? '');
          setMarkdownFromFile(text);
        } catch {
          setMarkdownFromFile(null);
        }
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [api, docId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = doc?.title?.trim() || '文档详情';
  useDocumentTitle(`${title} · 文档中心`);

  const fallbackBody = (doc?.content ?? doc?.body ?? '').trim();
  const displayMarkdown =
    (markdownFromFile != null && markdownFromFile.trim() !== ''
      ? markdownFromFile
      : fallbackBody) || '';

  return (
    <div className="relative pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 min-[1200px]:flex-row min-[1200px]:items-start">
        <DocsSidebar
          activeKey="docs-all"
          detailMode
          onSelectKey={() => navigate('/dashboard/docs')}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboard/docs">
              <Button type="link" icon={<ArrowLeftOutlined />} className="!px-0">
                返回文档列表
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <Skeleton active title paragraph={{ rows: 6 }} />
            </div>
          ) : error ? (
            <DocsErrorState message={error} onRetry={load} />
          ) : doc && doc.can_view !== true ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center shadow-sm">
              <Typography.Title level={4}>暂无访问权限</Typography.Title>
              <Typography.Paragraph type="secondary">
                您暂无法查看该文档，请联系管理员开通权限。
              </Typography.Paragraph>
              <Button type="primary" onClick={() => navigate('/dashboard/docs')}>
                返回列表
              </Button>
            </div>
          ) : doc ? (
            <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
              <Typography.Title level={3} className="!mt-0">
                {doc.title?.trim() || '未命名文档'}
              </Typography.Title>
              {doc.summary?.trim() ? (
                <Typography.Paragraph type="secondary" className="text-base">
                  {doc.summary.trim()}
                </Typography.Paragraph>
              ) : null}
              {doc.docs_relpath?.trim() ? (
                <Typography.Text type="secondary" className="block font-mono text-xs">
                  {doc.docs_relpath.trim()}
                </Typography.Text>
              ) : null}
              {displayMarkdown ? (
                <div className="mt-6 max-w-none text-neutral-800">
                  <DocMarkdown source={displayMarkdown} />
                </div>
              ) : (
                <Typography.Paragraph type="secondary" className="!mb-0 mt-6">
                  暂无正文（后端可提供 content_url 或详情中的 body/content）。
                </Typography.Paragraph>
              )}
            </article>
          ) : null}
        </div>
      </div>

      <FloatButton
        icon={<CustomerServiceOutlined />}
        tooltip="客服与反馈"
        type="primary"
        className="!bottom-6 !right-6"
        onClick={() => message.info('敬请期待')}
      />
    </div>
  );
}
