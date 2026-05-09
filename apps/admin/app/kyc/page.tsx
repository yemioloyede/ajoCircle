'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, getToken } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function KYCPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/kyc?status=${statusFilter}`)
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setError('Failed to load KYC submissions'));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setMsg('');
    const r = await fetch(`${API_URL}/api/admin/kyc/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setMsg('KYC approved');
    load();
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) { setMsg('Enter a rejection reason'); return; }
    const r = await fetch(`${API_URL}/api/admin/kyc/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setMsg('KYC rejected');
    setRejectTarget(null);
    setRejectReason('');
    load();
  }

  return (
    <>
      <h1>KYC Submissions</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#0b6b45', marginBottom: 12, fontWeight: 700 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['PENDING', 'VERIFIED', 'REJECTED'].map(s => (
          <button key={s} className="btn"
            style={{ background: statusFilter === s ? '#082017' : '#e8f0ec', color: statusFilter === s ? '#fff' : '#082017', padding: '6px 14px' }}
            onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
      </div>
      {rows.length === 0 && !error && <p style={{ color: '#888' }}>No {statusFilter.toLowerCase()} submissions.</p>}
      <table>
        <thead>
          <tr><th>User</th><th>Email</th><th>Status</th><th>Submitted</th><th>Rejection Reason</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.full_name}</td>
              <td>{r.email}</td>
              <td><span className="badge" style={{
                background: r.status === 'VERIFIED' ? '#eef8f2' : r.status === 'REJECTED' ? '#fdecea' : '#fff3e0',
                color: r.status === 'VERIFIED' ? '#0b6b45' : r.status === 'REJECTED' ? '#c62828' : '#e65100',
              }}>{r.status}</span></td>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td style={{ fontSize: 12, color: '#888' }}>{r.rejection_reason || '—'}</td>
              <td>
                {r.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => approve(r.id)}>Approve</button>
                    <button className="btn" style={{ fontSize: 12, padding: '5px 10px', background: '#c62828' }} onClick={() => setRejectTarget(r)}>Reject</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Reject KYC — {rejectTarget.full_name}</h3>
            <textarea
              style={{ width: '100%', minHeight: 100, padding: 12, border: '1px solid #d0d9d4', borderRadius: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Enter rejection reason (required)…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" style={{ background: '#c62828' }} onClick={() => reject(rejectTarget.id)}>Confirm Reject</button>
              <button className="btn" style={{ background: '#888' }} onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
