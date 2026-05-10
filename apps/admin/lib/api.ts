const API = '';

function toProxyPath(path: string) {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `/api/proxy/${clean}`;
}

export async function api(path: string, options: RequestInit = {}) {
  const r = await fetch(`${API}${toProxyPath(path)}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return r.json();
}

export async function apiWithBody(path: string, method: string, body: any) {
  const r = await fetch(`${API}${toProxyPath(path)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

