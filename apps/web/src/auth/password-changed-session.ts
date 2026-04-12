/** 其他标签页收到「密码已修改」推送后写入，登录页读出并提示后清除 */
export const PASSWORD_CHANGED_RELOGIN_SESSION_KEY = 'stc:password-changed-relogin';

export function markPasswordChangedRelogin() {
  try {
    sessionStorage.setItem(PASSWORD_CHANGED_RELOGIN_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePasswordChangedReloginFlag(): boolean {
  try {
    if (sessionStorage.getItem(PASSWORD_CHANGED_RELOGIN_SESSION_KEY) !== '1') return false;
    sessionStorage.removeItem(PASSWORD_CHANGED_RELOGIN_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
