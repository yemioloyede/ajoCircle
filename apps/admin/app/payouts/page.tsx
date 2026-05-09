'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, getToken } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 50;

export default function Payouts() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/payouts?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setRows(d?.payouts || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load payouts'));
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setMsg('');
    const r = await fetch(`${API_URL}/api/payouts/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setMsg('Payout approved — transfer initiated');
    load();
  }

  return (
    <>
      <h1>Payouts</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#0b6b45', marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      <table>
        <thead><tr><th>Recipient</th><th>Group</th><th>Amount</th><th>Status</th><th>Transfer Code</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.recipient_name || r.recipient_email}</td>
              <td>{r.group_name || '—'}</td>
              <td>₦{(r.amount_kobo / 100).toLocaleString()}</td>
              <td><span className="badge" style={{
                background: r.status === 'PAID' ? '#eef8f2' : r.status === 'FAILED' ? '#fdecea' : r.status === 'PROCESSING' ? '#e3f2fd' : '#fff3e0',
                color: r.status === 'PAID' ? '#0b6b45' : r.status === 'FAILED' ? '#c62828' : r.status === 'PROCESSING' ? '#1565c0' : '#e65100',
              }}>{r.status}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.transfer_code || '—'}</td>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td>
                {r.status === 'PENDING' && (
                  <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => approve(r.id)}>Approve</button>
                )}
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
