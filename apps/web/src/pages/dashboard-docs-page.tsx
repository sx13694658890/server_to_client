import { CustomerServiceOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, FloatButton, Input, Pagination, Typography } from 'antd';
import { useDocumentTitle } from 'usehooks-ts';
import { useEffect, useMemo, useState } from 'react';
import {
  dispatchDocsListRefresh,
  DocCardList,
  DocsEmptyState,
  DocsErrorState,
  DocsListSkeleton,
  DocsSidebar,
  DocsWelcomeBanner,
  findMenuLeaf,
  useDocsList,
} from '../features/docs';

const PAGE_SIZE = 10;

export function DashboardDocsPage() {
  useDocumentTitle('文档中心 · client-react-sp');
  const { message } = App.useApp();
  const [activeMenuKey, setActiveMenuKey] = useState('docs-all');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const category = useMemo(() => findMenuLeaf(activeMenuKey)?.category, [activeMenuKey]);

  const { list, total, loading, error, refreshing, reload } = useDocsList({
    category,
    keyword,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [activeMenuKey, keyword]);

  const mainBlock = (() => {
    if (loading && list.length === 0) {
      return <DocsListSkeleton />;
    }
    if (error) {
      return <DocsErrorState message={error} onRetry={reload} />;
    }
    if (list.length === 0) {
      return <DocsEmptyState keyword={keyword} />;
    }
    return <DocCardList items={list} />;
  })();

  return (
    <div className="relative pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
        <DocsSidebar activeKey={activeMenuKey} onSelectKey={setActiveMenuKey} />
        <div className="min-w-0 flex-1 space-y-6">
          <DocsWelcomeBanner />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Typography.Title level={4} className="!mb-0">
              全部文档
            </Typography.Title>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input.Search
                allowClear
                placeholder="搜索关键词"
                value={searchDraft}
                className="w-full sm:w-64"
                onChange={(e) => setSearchDraft(e.target.value)}
                onSearch={(v) => {
                  setKeyword(v.trim());
                  setPage(1);
                }}
              />
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={() => dispatchDocsListRefresh()}
              >
                刷新
              </Button>
            </div>
          </div>

          {mainBlock}

          {!error && !loading && total > PAGE_SIZE ? (
            <div className="flex justify-end pt-2">
              <Pagination
                current={page}
                pageSize={PAGE_SIZE}
                total={total}
                showSizeChanger={false}
                onChange={(p) => setPage(p)}
                showTotal={(t) => `共 ${t} 条`}
              />
            </div>
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
