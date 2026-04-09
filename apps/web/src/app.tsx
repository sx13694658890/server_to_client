import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@repo/hooks';
import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/require-auth';
import { DashboardLayout } from './layouts/dashboard-layout';
import {
  AccountPage,
  DashboardDocDetailPage,
  DashboardDocsPage,
  DashboardHomePage,
  LandingPage,
  LoginPage,
  MessagesCenterPage,
  RegisterPage,
  UsersManagementPage,
} from './pages';

const AgriRemoteSensingPage = lazy(() =>
  import('./pages/dashboard/agri-remote-sensing-page').then((m) => ({
    default: m.AgriRemoteSensingPage,
  }))
);

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true }}>
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
                  <Route
                    path="agri"
                    element={
                      <Suspense fallback={null}>
                        <AgriRemoteSensingPage />
                      </Suspense>
                    }
                  />
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
