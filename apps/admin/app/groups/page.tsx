'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, getToken } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 50;

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/groups?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setRows(d?.groups || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load groups'));
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  async function action(id: string, endpoint: string) {
    setMsg('');
    const r = await fetch(`${API_URL}/api/admin/groups/${id}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setMsg(j.message);
    load();
  }

  const filtered = rows.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <h1>Groups</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#0b6b45', marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search groups…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: '#888', fontSize: 13 }}>{total} groups total</span>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Frequency</th><th>Amount</th><th>Members</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.frequency}</td>
              <td>₦{(r.contribution_amount_kobo / 100).toLocaleString()}</td>
              <td>{r.max_members}</td>
              <td><span className="badge" style={{
                background: r.status === 'ACTIVE' ? '#eef8f2' : r.status === 'FROZEN' ? '#fff3e0' : '#fdecea',
                color: r.status === 'ACTIVE' ? '#0b6b45' : r.status === 'FROZEN' ? '#e65100' : '#c62828',
              }}>{r.status}</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                {r.status === 'ACTIVE' && <button className="btn" style={{ fontSize: 12, padding: '5px 10px', background: '#e65100' }} onClick={() => action(r.id, 'freeze')}>Freeze</button>}
                {r.status !== 'CLOSED' && <button className="btn" style={{ fontSize: 12, padding: '5px 10px', background: '#c62828' }} onClick={() => action(r.id, 'close')}>Close</button>}
              </td>
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
