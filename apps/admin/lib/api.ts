import { useEffect, useRef } from 'react';

const API = '';

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  window.location.href = '/login';
}

/** Calls `fn` immediately and then every `intervalMs` milliseconds while the component is mounted. */
export function usePolling(fn: () => void, intervalMs = 30_000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    fnRef.current();
    const id = setInterval(() => fnRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function toProxyPath(path: string) {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const normalized = clean.startsWith('api/') ? clean.slice(4) : clean;
  return `/api/proxy/${normalized}`;
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
  if (r.status === 401 || r.status === 403) {
    redirectToLogin();
    return null;
  }
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
  if (r.status === 401 || r.status === 403) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

