import {
  BellOutlined,
  FileTextOutlined,
  HomeOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { App, Avatar, Dropdown, Layout, Menu, Space, Typography, theme } from 'antd';
import { useAuth } from '@repo/hooks';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DashboardMessageBell, MessageInboxProvider } from '../features/messages';
import { decodeJwtPayloadDisplay } from '../lib/jwt-payload';

const { Header, Sider, Content } = Layout;

export function DashboardLayout() {
  const { token: antToken } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, clearAuth } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const payload = useMemo(
    () => (accessToken ? decodeJwtPayloadDisplay(accessToken) : null),
    [accessToken]
  );
  const displayEmail = payload?.email ?? '用户';
  const displayInitial = displayEmail.charAt(0).toUpperCase();

  const selectedKeys = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/dashboard/users')) return ['/dashboard/users'];
    if (p.startsWith('/dashboard/account')) return ['/dashboard/account'];
    if (p.startsWith('/dashboard/docs')) return ['/dashboard/docs'];
    if (p.startsWith('/dashboard/messages')) return ['/dashboard/messages'];
    return ['/dashboard/home'];
  }, [location.pathname]);

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: '/dashboard/home',
        icon: <HomeOutlined />,
        label: <Link to="/dashboard/home">首页</Link>,
      },
      {
        key: '/dashboard/docs',
        icon: <FileTextOutlined />,
        label: <Link to="/dashboard/docs">使用文档</Link>,
      },
      {
        key: '/dashboard/messages',
        icon: <BellOutlined />,
        label: <Link to="/dashboard/messages">通知中心</Link>,
      },
      {
        key: '/dashboard/account',
        icon: <IdcardOutlined />,
        label: <Link to="/dashboard/account">个人中心</Link>,
      },
      {
        key: '/dashboard/users',
        icon: <UserOutlined />,
        label: <Link to="/dashboard/users">用户管理</Link>,
      },
    ],
    []
  );

  return (
    <MessageInboxProvider>
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={232}
        className="!border-r !border-neutral-200"
        style={{ background: antToken.colorBgContainer }}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-neutral-200 ${
            collapsed ? 'justify-center px-2' : 'gap-3 px-4'
          }`}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold tracking-tight text-white shadow-sm"
            aria-hidden
          >
            SP
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-neutral-900">Client React</div>
              <div className="truncate text-xs text-neutral-500">工作台</div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          className="border-none"
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          className="!m-0 !flex !h-14 !items-center !justify-between !gap-4 !border-b !border-neutral-200 !bg-white !px-4"
          style={{ paddingInline: antToken.paddingLG }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label={collapsed ? '展开菜单' : '收起菜单'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-lg text-neutral-700 hover:bg-neutral-100"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <Typography.Text type="secondary" className="hidden truncate text-sm sm:inline">
              {location.pathname.startsWith('/dashboard/docs')
                ? '文档中心'
                : location.pathname.startsWith('/dashboard/messages')
                  ? '通知中心'
                  : location.pathname.startsWith('/dashboard/users')
                    ? '用户管理'
                    : location.pathname.startsWith('/dashboard/account')
                      ? '个人中心'
                      : '工作台首页'}
            </Typography.Text>
          </div>
          <Space size="middle" className="shrink-0">
            <DashboardMessageBell />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'account',
                    label: <Link to="/dashboard/account">个人中心</Link>,
                  },
                  {
                    key: 'settings',
                    icon: <SettingOutlined />,
                    label: '设置',
                    onClick: () => message.info('敬请期待'),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    label: '退出登录',
                    danger: true,
                    onClick: () => {
                      clearAuth();
                      message.success('已退出');
                      navigate('/login', { replace: true });
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 hover:bg-neutral-100"
              >
                <Avatar size="small" className="!shrink-0 !bg-emerald-600">
                  {displayInitial}
                </Avatar>
                <Typography.Text className="max-w-[140px] truncate text-sm">
                  {displayEmail}
                </Typography.Text>
              </button>
            </Dropdown>
          </Space>
        </Header>
        <Content className="m-0 min-h-[calc(100dvh-56px)] bg-neutral-100 p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
    </MessageInboxProvider>
  );
}
