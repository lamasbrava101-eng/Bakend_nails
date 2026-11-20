const API_BASE = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export type AuthHandlers = {
  getToken: () => string | null;
  setSession: (token: string, user: unknown) => void;
  clearSession: () => void;
};

let handlers: AuthHandlers | null = null;

export function registerAuth(h: AuthHandlers): void {
  handlers = h;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path}`;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers, credentials: 'include' });
  };

  let res = await doFetch(handlers?.getToken() ?? null);

  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const json = (await refreshRes.json()) as { data: { accessToken: string; user: unknown } };
      handlers?.setSession(json.data.accessToken, json.data.user);
      res = await doFetch(json.data.accessToken);
    } else {
      handlers?.clearSession();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
  }

  return res;
}