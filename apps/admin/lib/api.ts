const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function api(path: string, options: RequestInit = {}) {
  // In server components, no document.cookie; in client components cookies are sent automatically
  // We still need Authorization header in client–side calls.
  const token = typeof document !== 'undefined'
    ? document.cookie.split('; ').find(r => r.startsWith('adminToken='))?.split('=')[1]
    : '';

  const r = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return r.json();
}

export async function apiWithBody(path: string, method: string, body: any) {
  const token = typeof document !== 'undefined'
    ? document.cookie.split('; ').find(r => r.startsWith('adminToken='))?.split('=')[1]
    : '';
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

export { API };
export function getToken() {
  return typeof document !== 'undefined'
    ? document.cookie.split('; ').find(r => r.startsWith('adminToken='))?.split('=')[1] ?? ''
    : '';
}

