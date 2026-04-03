import { useState, useCallback } from 'react';
import { hasAuthCookie, setAuthCookie, removeAuthCookie, verifyPassword } from '../utils/auth';

export function useAuth() {
  const [isAuthorized, setIsAuthorized] = useState(() => hasAuthCookie());

  const login = useCallback(async (password: string) => {
    const ok = await verifyPassword(password);
    if (ok) {
      setAuthCookie();
      setIsAuthorized(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    removeAuthCookie();
    setIsAuthorized(false);
  }, []);

  return { isAuthorized, login, logout };
}
