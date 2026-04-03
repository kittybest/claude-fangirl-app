const COOKIE_NAME = 'fangirl_app_auth';
const TOKEN_VALUE = 'authorized';

export function setAuthCookie() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${TOKEN_VALUE}; expires=${expires}; path=/; SameSite=Strict`;
}

export function removeAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}

export function hasAuthCookie(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${COOKIE_NAME}=${TOKEN_VALUE}`));
}

export async function verifyPassword(input: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.ok === true;
    }
    return false;
  } catch {
    return false;
  }
}
