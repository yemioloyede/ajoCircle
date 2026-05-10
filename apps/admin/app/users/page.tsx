'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, apiWithBody, usePolling } from '../../lib/api';
const PAGE_SIZE = 50;

export default function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/users?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setRows(d?.users || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load users'));
  }, [offset]);

  usePolling(load, 30_000);

  const filtered = rows.filter(r =>
    !search || [r.full_name, r.email, r.phone].some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  async function action(endpoint: string, method = 'POST', body?: any) {
    setMsg('');
    try {
      const j = await apiWithBody(endpoint, method, body || {});
      setMsg(j.message || 'Done');
      load();
      if (selected) setSelected(null);
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <>
      <h1>Users</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#0b6b45', marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search name, email, phone…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ color: '#888', fontSize: 13 }}>{total} users total</span>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>KYC</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>{r.full_name}</td>
              <td>{r.email}</td>
              <td>{r.phone}</td>
              <td><span className="badge">{r.role}</span></td>
              <td><span className="badge" style={{ background: r.kyc_status === 'VERIFIED' ? '#eef8f2' : '#fff3e0', color: r.kyc_status === 'VERIFIED' ? '#0b6b45' : '#e65100' }}>{r.kyc_status}</span></td>
              <td><span className="badge" style={{ background: r.status === 'FROZEN' ? '#fdecea' : '#eef8f2', color: r.status === 'FROZEN' ? '#c62828' : '#0b6b45' }}>{r.status}</span></td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setSelected(r)}>View</button>
                {r.status === 'ACTIVE'
                  ? <button className="btn" style={{ fontSize: 12, padding: '5px 10px', background: '#c62828' }} onClick={() => action(`/api/admin/users/${r.id}/freeze`)}>Freeze</button>
                  : <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => action(`/api/admin/users/${r.id}/unfreeze`)}>Unfreeze</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
        <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Prev</button>
        <span style={{ fontSize: 13, color: '#666' }}>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
        <button className="btn" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{selected.full_name}</h2>
            <p><b>Email:</b> {selected.email}</p>
            <p><b>Phone:</b> {selected.phone}</p>
            <p><b>Current Role:</b> {selected.role}</p>
            <p><b>KYC:</b> {selected.kyc_status}</p>
            <p><b>Status:</b> {selected.status}</p>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Change role:</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {(['MEMBER', 'GROUP_ADMIN', 'COMPLIANCE_ADMIN', 'SUPER_ADMIN'] as const).map(role => (
                <button key={role} className="btn" style={{ fontSize: 12, padding: '5px 10px', background: role === selected.role ? '#082017' : undefined }}
                  onClick={() => action(`/api/admin/users/${selected.id}/role`, 'PATCH', { role })}>
                  {role}
                </button>
              ))}
            </div>
            <button className="btn" style={{ background: '#888' }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
