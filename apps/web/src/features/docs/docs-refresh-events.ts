/** 文档列表页监听此事件；布局层在「刷新」按钮触发 */
export const DOCS_LIST_REFRESH_EVENT = 'sp:docs-list-refresh';

export function dispatchDocsListRefresh() {
  window.dispatchEvent(new Event(DOCS_LIST_REFRESH_EVENT));
}
