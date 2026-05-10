'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, usePolling } from '../../lib/api';

const PAGE_SIZE = 50;

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/audit?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setRows(d?.logs || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load audit logs'));
  }, [offset]);

  usePolling(load, 30_000);

  const formatDetails = (row: any) => {
    const md = row?.metadata || {};
    if (md.details && typeof md.details === 'string') return md.details;

    const entries = Object.entries(md)
      .filter(([k, v]) => !['ip', 'userAgent', 'method', 'path', 'details'].includes(k) && v !== undefined && v !== null)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);

    return entries.length ? entries.join(' | ') : 'No extra details';
  };

  return (
    <>
      <h1>Audit Logs</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <table>
        <thead><tr><th>Action</th><th>Actor</th><th>Entity Type</th><th>Entity ID</th><th>Details</th><th>IP</th><th>User Agent</th><th>Time</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td><span className="badge">{r.action}</span></td>
              <td style={{ fontSize: 12 }}>
                {r.actor_name || r.actor_email || (r.actor_id ? `${String(r.actor_id).slice(0, 8)}...` : 'System')}
              </td>
              <td>{r.entity_type}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.entity_id?.slice(0, 8)}…</td>
              <td style={{ fontSize: 12, maxWidth: 320 }}>{formatDetails(r)}</td>
              <td style={{ fontSize: 12 }}>{r.metadata?.ip || '—'}</td>
              <td style={{ fontSize: 11, color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.metadata?.userAgent || '—'}</td>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
        <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Prev</button>
        <span style={{ fontSize: 13, color: '#666' }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
        <button className="btn" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
      </div>
    </>
  );
}
