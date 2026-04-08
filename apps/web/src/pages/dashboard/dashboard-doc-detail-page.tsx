import {
  ArrowLeftOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { App, Button, FloatButton, Popconfirm, Skeleton, Tag, Typography } from 'antd';
import { getApiErrorMessage, type DocContentSource, type DocDetail } from '@repo/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from 'usehooks-ts';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  buildDocsMenuGroups,
  DocMarkdown,
  DocsErrorState,
  DocsSidebar,
  DOCS_ALL_MENU_KEY,
  useDocsCategories,
} from '../../features/docs';
import { formatDocDateTime } from '../../features/docs/format-doc-time';
import { useIsAdmin } from '../../hooks/use-is-admin';
import { useWebApi } from '../../hooks/use-web-api';

const SOURCE_LABEL: Record<DocContentSource, string> = {
  repo: '仓库',
  upload: '上传',
  inline: '库内',
};

export function DashboardDocDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const api = useWebApi();
  const { message } = App.useApp();
  const isAdmin = useIsAdmin();
  const { categories } = useDocsCategories();
  const menuGroups = useMemo(() => buildDocsMenuGroups(categories), [categories]);

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [markdownFromFile, setMarkdownFromFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      if (data.can_view === true) {
        let md: string | null = null;
        if (data.content_url?.trim()) {
          try {
            const res = await api.docs.content(data.content_url.trim());
            md = typeof res.data === 'string' ? res.data : String(res.data ?? '');
          } catch {
            md = null;
          }
        }
        if (!md?.trim()) {
          try {
            const res = await api.docs.contentById(docId);
            md = typeof res.data === 'string' ? res.data : String(res.data ?? '');
          } catch {
            md = null;
          }
        }
        setMarkdownFromFile(md?.trim() ? md : null);
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

  const sourceLabel = useMemo(() => {
    const s = doc?.content_source;
    return s && SOURCE_LABEL[s] ? SOURCE_LABEL[s] : null;
  }, [doc?.content_source]);

  const canDelete = doc?.can_delete === true;

  const handleDelete = async () => {
    if (!docId) return;
    setDeleting(true);
    try {
      await api.docs.remove(docId);
      message.success('已删除');
      navigate('/dashboard/docs', { replace: true });
    } catch (e) {
      message.error(getApiErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 min-[1200px]:flex-row min-[1200px]:items-start">
        <DocsSidebar
          menuGroups={menuGroups}
          activeKey={DOCS_ALL_MENU_KEY}
          detailMode
          onSelectKey={() => navigate('/dashboard/docs')}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/dashboard/docs">
              <Button type="link" icon={<ArrowLeftOutlined />} className="!px-0">
                返回文档列表
              </Button>
            </Link>
            {doc && canDelete && isAdmin ? (
              <Popconfirm
                title="确定删除该文档？"
                description="上传类文档将同时删除服务器上的文件，且不可恢复。"
                okText="删除"
                okType="danger"
                cancelText="取消"
                onConfirm={() => void handleDelete()}
              >
                <Button danger icon={<DeleteOutlined />} loading={deleting}>
                  删除
                </Button>
              </Popconfirm>
            ) : null}
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {sourceLabel ? <Tag color="blue">{sourceLabel}</Tag> : null}
                {formatDocDateTime(doc.created_at) ? (
                  <Typography.Text type="secondary" className="text-xs">
                    上传/创建：{formatDocDateTime(doc.created_at)}
                    {doc.updated_at && doc.updated_at !== doc.created_at
                      ? ` · 更新：${formatDocDateTime(doc.updated_at) ?? ''}`
                      : ''}
                  </Typography.Text>
                ) : null}
              </div>
              <Typography.Title level={3} className="!mt-0">
                {doc.title?.trim() || '未命名文档'}
              </Typography.Title>
              {doc.summary?.trim() ? (
                <Typography.Paragraph type="secondary" className="text-base">
                  {doc.summary.trim()}
                </Typography.Paragraph>
              ) : null}
              {doc.docs_relpath?.trim() ? (
                <Typography.Text type="secondary" className="mb-2 block font-mono text-xs">
                  {doc.docs_relpath.trim()}
                </Typography.Text>
              ) : null}
              {displayMarkdown ? (
                <div className="mt-6 max-w-none text-neutral-800">
                  <DocMarkdown source={displayMarkdown} />
                </div>
              ) : (
                <Typography.Paragraph type="secondary" className="!mb-0 mt-6">
                  暂无正文（可检查详情中的 body，或后端正文接口）。
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
