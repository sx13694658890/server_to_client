import { MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Menu, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { DOCS_ALL_MENU_KEY, type DocsMenuGroup } from './docs-menu-config';

const DOC_NAV_MIN_WIDTH = 1200;

type Props = {
  menuGroups: DocsMenuGroup[];
  activeKey: string;
  onSelectKey: (key: string) => void;
  /** 文档详情页时仍高亮「使用文档」侧栏语境 */
  detailMode?: boolean;
};

export function DocsSidebar({ menuGroups, activeKey, onSelectKey, detailMode }: Props) {
  const desktopNav = useMediaQuery(`(min-width: ${DOC_NAV_MIN_WIDTH}px)`);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selectedKeys = detailMode ? [DOCS_ALL_MENU_KEY] : [activeKey];

  const items: MenuProps['items'] = useMemo(
    () =>
      menuGroups.map((g) => ({
        type: 'group' as const,
        label: <span className="text-xs font-medium text-neutral-500">{g.title}</span>,
        children: g.items.map((item) => ({
          key: item.key,
          label: item.badge ? (
            <span className="flex items-center justify-between gap-2 pr-1">
              <span>{item.label}</span>
              <Tag color="green" className="!m-0 scale-90">
                {item.badge}
              </Tag>
            </span>
          ) : (
            item.label
          ),
        })),
      })),
    [menuGroups]
  );

  const handleMenuClick = (key: string) => {
    onSelectKey(key);
    setDrawerOpen(false);
  };

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={selectedKeys}
      items={items}
      className="!border-0"
      style={{ borderInlineEnd: 'none' }}
      onClick={({ key, domEvent }) => {
        domEvent.preventDefault();
        handleMenuClick(key);
      }}
    />
  );

  return (
    <>
      {!desktopNav ? (
        <div className="w-full shrink-0">
          <Button
            block
            type="default"
            icon={<MenuOutlined />}
            className="!mb-3 !flex !items-center !justify-center"
            onClick={() => setDrawerOpen(true)}
          >
            文档分类
          </Button>
          <Drawer
            title="文档导航"
            placement="left"
            width={280}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            styles={{ body: { paddingTop: 8 } }}
          >
            {menu}
          </Drawer>
        </div>
      ) : null}

      {desktopNav ? (
        <aside className="w-full shrink-0 lg:w-52 xl:w-56">
          <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">{menu}</div>
        </aside>
      ) : null}
    </>
  );
}
