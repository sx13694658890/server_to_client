export type DocsMenuLeaf = {
  key: string;
  label: string;
  /** 列表查询 category（无则不限定） */
  category?: string;
  badge?: string;
};

export type DocsMenuGroup = {
  title: string;
  items: DocsMenuLeaf[];
};

/** 左侧分组导航；与需求文档示例一致，可按产品配置调整 */
export const DOCS_MENU_GROUPS: DocsMenuGroup[] = [
  {
    title: '使用文档',
    items: [{ key: 'docs-all', label: '全部文档' }],
  },
  {
    title: '回访',
    items: [
      { key: 'visit-overview', label: '回访概览', category: '回访' },
      { key: 'visit-guide', label: '操作指南', category: '回访指南' },
    ],
  },
  {
    title: '财务',
    items: [{ key: 'finance', label: '财务说明', category: '财务' }],
  },
  {
    title: '用户',
    items: [
      { key: 'user-manual', label: '用户手册', category: '用户', badge: 'New' },
      { key: 'user-role', label: '角色权限', category: '角色权限' },
    ],
  },
];

export function findMenuLeaf(key: string): DocsMenuLeaf | undefined {
  for (const g of DOCS_MENU_GROUPS) {
    const hit = g.items.find((i) => i.key === key);
    if (hit) return hit;
  }
  return undefined;
}
