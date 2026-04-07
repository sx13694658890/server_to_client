import { Menu, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { DOCS_MENU_GROUPS } from './docs-menu-config';

type Props = {
  activeKey: string;
  onSelectKey: (key: string) => void;
  /** 文档详情页时仍高亮「使用文档」侧栏语境 */
  detailMode?: boolean;
};

export function DocsSidebar({ activeKey, onSelectKey, detailMode }: Props) {
  const selectedKeys = detailMode ? ['docs-all'] : [activeKey];

  const items: MenuProps['items'] = DOCS_MENU_GROUPS.map((g) => ({
    type: 'group',
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
  }));

  return (
    <aside className="w-full shrink-0 lg:w-52 xl:w-56">
      <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={items}
          className="!border-0"
          style={{ borderInlineEnd: 'none' }}
          onClick={({ key, domEvent }) => {
            domEvent.preventDefault();
            onSelectKey(key);
          }}
        />
      </div>
    </aside>
  );
}
