'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

const PAGE_SIZE = 50;

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/transactions?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setRows(d?.transactions || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load transactions'));
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || [r.full_name, r.email, r.paystack_reference].some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <h1>Transactions</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search user, reference…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: '#888', fontSize: 13 }}>{total} transactions total</span>
      </div>
      <table>
        <thead><tr><th>User</th><th>Group</th><th>Amount</th><th>Status</th><th>Reference</th><th>Date</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>{r.full_name || r.email}</td>
              <td>{r.group_name || '—'}</td>
              <td>₦{(r.amount_kobo / 100).toLocaleString()}</td>
              <td><span className="badge" style={{
                background: r.status === 'COMPLETED' ? '#eef8f2' : r.status === 'FAILED' ? '#fdecea' : '#fff3e0',
                color: r.status === 'COMPLETED' ? '#0b6b45' : r.status === 'FAILED' ? '#c62828' : '#e65100',
              }}>{r.status}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.paystack_reference}</td>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
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
