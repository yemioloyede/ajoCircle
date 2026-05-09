'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/dashboard').then(setD).catch(() => setError('Failed to load dashboard'));
  }, []);

  const stats = d ? [
    ['Users', d.users],
    ['Active Groups', d.activeGroups],
    ['Transactions', d.transactions],
    ['Pending Payouts', d.pendingPayouts],
    ['Total Volume', d.totalVolumeKobo != null ? '₦' + Math.round(d.totalVolumeKobo / 100).toLocaleString() : '—'],
    ['Platform Fees', d.platformFeesKobo != null ? '₦' + Math.round(d.platformFeesKobo / 100).toLocaleString() : '—'],
    ['Pending KYC', d.pendingKycCount],
  ] : [];

  return (
    <>
      <h1>Dashboard</h1>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {!d && !error && <p style={{ color: '#888' }}>Loading…</p>}
      <div className="grid">
        {stats.map(([label, value]) => (
          <div className="card" key={label as string}>
            <p style={{ color: '#52655c', margin: '0 0 8px' }}>{label}</p>
            <div className="stat">{value ?? '—'}</div>
          </div>
        ))}
      </div>
    </>
  );
}
