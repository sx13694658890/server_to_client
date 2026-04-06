import { Layout, Typography } from 'antd';
import type { ReactNode } from 'react';

export type AppShellProps = {
  title?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** 追加到内容区 Layout.Content，可覆盖默认背景等 */
  contentClassName?: string;
};

/**
 * 应用级布局：antd Layout + Tailwind 辅助类（外层间距与背景）。
 */
export function AppShell({
  title = 'App',
  headerExtra,
  children,
  contentClassName,
}: AppShellProps) {
  return (
    <Layout className="min-h-screen">
      <Layout.Header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {headerExtra}
      </Layout.Header>
      <Layout.Content
        className={['bg-neutral-50 p-6', contentClassName].filter(Boolean).join(' ')}
      >
        {children}
      </Layout.Content>
    </Layout>
  );
}
