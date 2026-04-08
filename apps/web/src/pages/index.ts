/** 页面按目录划分：`auth/`、`landing/`、`dashboard/`；此处统一导出供路由注册 */
export { LoginPage } from './auth/login-page';
export { RegisterPage } from './auth/register-page';
export { LandingPage } from './landing/landing-page';
export { AccountPage } from './dashboard/account-page';
/** 农业遥感页请 `lazy(() => import('./dashboard/agri-remote-sensing-page'))`，勿从此 barrel 导入以免打进首包 */
export { DashboardDocDetailPage } from './dashboard/dashboard-doc-detail-page';
export { DashboardDocsPage } from './dashboard/dashboard-docs-page';
export { DashboardHomePage } from './dashboard/dashboard-home-page';
export { MessagesCenterPage } from './dashboard/messages-center-page';
export { UsersManagementPage } from './dashboard/users-management-page';
