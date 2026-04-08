import type { DocListItem } from '@repo/api';

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

/** 与侧栏「全部」项 key 一致 */
export const DOCS_ALL_MENU_KEY = 'docs-all';

const CATEGORY_KEY_PREFIX = 'cat:';

/** 由后端 category 生成稳定菜单 key（避免特殊字符干扰） */
export function categoryMenuKey(category: string): string {
  return `${CATEGORY_KEY_PREFIX}${encodeURIComponent(category)}`;
}

/**
 * 当前列表请求应使用的 category：未选或「全部」为 undefined。
 */
export function listCategoryFromMenuKey(menuKey: string): string | undefined {
  if (menuKey === DOCS_ALL_MENU_KEY) return undefined;
  if (!menuKey.startsWith(CATEGORY_KEY_PREFIX)) return undefined;
  try {
    return decodeURIComponent(menuKey.slice(CATEGORY_KEY_PREFIX.length));
  } catch {
    return undefined;
  }
}

function normalizeListCategory(raw: DocListItem['category']): string | null {
  if (raw == null) return null;
  const c = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  return c.length ? c : null;
}

/**
 * 从 `GET /docs` 列表项里的 `category` 字段聚合去重（与接口、列表筛选一致）。
 */
export function mergeCategoriesFromDocItems(
  into: Set<string>,
  items: Pick<DocListItem, 'category'>[]
): void {
  for (const it of items) {
    const c = normalizeListCategory(it.category);
    if (c) into.add(c);
  }
}

export function collectCategoriesFromDocItems(
  items: Pick<DocListItem, 'category'>[]
): string[] {
  const seen = new Set<string>();
  mergeCategoriesFromDocItems(seen, items);
  return [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 根据接口返回的分类名构建侧栏分组（与数据库 category 一致） */
export function buildDocsMenuGroups(categories: string[]): DocsMenuGroup[] {
  const items: DocsMenuLeaf[] = [
    { key: DOCS_ALL_MENU_KEY, label: '全部文档' },
    ...categories.map((c) => ({
      key: categoryMenuKey(c),
      label: c,
      category: c,
    })),
  ];
  return [{ title: '文档分类', items }];
}

/** 直接从列表响应 `items` 生成侧栏（内部先按 `category` 聚合） */
export function buildDocsMenuGroupsFromListItems(
  items: Pick<DocListItem, 'category'>[]
): DocsMenuGroup[] {
  return buildDocsMenuGroups(collectCategoriesFromDocItems(items));
}
