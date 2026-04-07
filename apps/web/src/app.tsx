import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@repo/hooks';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/require-auth';
import { DashboardLayout } from './layouts/dashboard-layout';
import { DashboardDocDetailPage } from './pages/dashboard-doc-detail-page';
import { DashboardDocsPage } from './pages/dashboard-docs-page';
import { DashboardHomePage } from './pages/dashboard-home-page';
import { LandingPage } from './pages/landing-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { AccountPage } from './pages/account-page';
import { MessagesCenterPage } from './pages/messages-center-page';
import { UsersManagementPage } from './pages/users-management-page';

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<DashboardHomePage />} />
                  <Route path="docs/:docId" element={<DashboardDocDetailPage />} />
                  <Route path="docs" element={<DashboardDocsPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="messages" element={<MessagesCenterPage />} />
                  <Route path="users" element={<UsersManagementPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
