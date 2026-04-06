import { useAuth } from '@repo/hooks';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/** 未登录访问受保护路由时跳转登录页 */
export function RequireAuth() {
  const { accessToken } = useAuth();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
