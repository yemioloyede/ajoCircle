'use client';
import { useState, useCallback } from 'react';
import { api, usePolling } from '../../lib/api';

const PAGE_SIZE = 50;
const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function Page() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // ledger drill-down
  const [selected, setSelected] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerError, setLedgerError] = useState('');

  const load = useCallback(() => {
    setError('');
    api(`/api/admin/wallets?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(d => { setWallets(d?.wallets || []); setTotal(d?.total || 0); })
      .catch(() => setError('Failed to load wallets'));
  }, [offset]);

  usePolling(load, 30_000);

  function openLedger(wallet: any) {
    setSelected(wallet);
    setLedgerOffset(0);
    setLedgerError('');
    api(`/api/admin/wallets/${wallet.id}/ledger?limit=${PAGE_SIZE}&offset=0`)
      .then(d => { setLedger(d?.entries || []); setLedgerTotal(d?.total || 0); })
      .catch(() => setLedgerError('Failed to load ledger'));
  }

  const loadLedger = useCallback(() => {
    if (!selected) return;
    setLedgerError('');
    api(`/api/admin/wallets/${selected.id}/ledger?limit=${PAGE_SIZE}&offset=${ledgerOffset}`)
      .then(d => { setLedger(d?.entries || []); setLedgerTotal(d?.total || 0); })
      .catch(() => setLedgerError('Failed to load ledger'));
  }, [selected, ledgerOffset]);

  // refresh ledger on offset change
  useState(() => { if (selected) loadLedger(); });

  const filtered = wallets.filter(w =>
    !search ||
    [w.owner_name, w.owner_email, w.owner_type, w.id]
      .some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const tdStyle: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid #e5e9e7', fontSize: 13 };
  const thStyle: React.CSSProperties = { ...tdStyle, fontWeight: 600, background: '#f4f6f5', textAlign: 'left' };

  if (selected) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setSelected(null)} style={{ background: '#e5e9e7', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>Ledger — {selected.owner_name}</h1>
          <span style={{ fontSize: 13, color: '#666' }}>{selected.owner_type}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 16 }}>{fmt(selected.balance_kobo)}</span>
        </div>
        {ledgerError && <div style={{ color: 'red', marginBottom: 12 }}>{ledgerError}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          <thead>
            <tr>
              {['Date', 'Type', 'Direction', 'Amount', 'Balance After', 'Reference'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, color: '#888', textAlign: 'center' }}>No ledger entries</td></tr>
            )}
            {ledger.map(e => (
              <tr key={e.id}>
                <td style={tdStyle}>{new Date(e.created_at).toLocaleString()}</td>
                <td style={tdStyle}>{e.type}</td>
                <td style={{ ...tdStyle, color: e.direction === 'CREDIT' ? '#1a7f4b' : '#c0392b', fontWeight: 600 }}>{e.direction}</td>
                <td style={tdStyle}>{fmt(e.amount_kobo)}</td>
                <td style={tdStyle}>{fmt(e.balance_after_kobo)}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{e.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button disabled={ledgerOffset === 0} onClick={() => setLedgerOffset(Math.max(0, ledgerOffset - PAGE_SIZE))}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: ledgerOffset === 0 ? 'not-allowed' : 'pointer' }}>
            Prev
          </button>
          <span style={{ lineHeight: '36px', fontSize: 13 }}>
            {ledgerOffset + 1}–{Math.min(ledgerOffset + PAGE_SIZE, ledgerTotal)} of {ledgerTotal}
          </span>
          <button disabled={ledgerOffset + PAGE_SIZE >= ledgerTotal}
            onClick={() => setLedgerOffset(ledgerOffset + PAGE_SIZE)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: ledgerOffset + PAGE_SIZE >= ledgerTotal ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Wallets</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Search owner name, email, type, ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ccc', fontFamily: 'inherit', fontSize: 14 }}
        />
        <span style={{ fontSize: 13, color: '#666' }}>{total} total</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <thead>
          <tr>
            {['Owner', 'Type', 'Currency', 'Balance', 'Status', 'Created', 'Actions'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} style={{ ...tdStyle, color: '#888', textAlign: 'center' }}>No wallets found</td></tr>
          )}
          {filtered.map(w => (
            <tr key={w.id}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{w.owner_name || '—'}</div>
                {w.owner_email && <div style={{ fontSize: 11, color: '#666' }}>{w.owner_email}</div>}
                <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{w.id}</div>
              </td>
              <td style={tdStyle}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: w.owner_type === 'USER' ? '#e8f4fd' : w.owner_type === 'GROUP' ? '#e8fdf0' : '#fdf5e8',
                  color: w.owner_type === 'USER' ? '#1565c0' : w.owner_type === 'GROUP' ? '#1a7f4b' : '#b45309',
                }}>
                  {w.owner_type}
                </span>
              </td>
              <td style={tdStyle}>{w.currency}</td>
              <td style={{ ...tdStyle, fontWeight: 700, color: w.balance_kobo === 0 ? '#aaa' : '#1a7f4b' }}>
                {fmt(w.balance_kobo)}
              </td>
              <td style={tdStyle}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: w.status === 'ACTIVE' ? '#e8fdf0' : '#fdf3f3',
                  color: w.status === 'ACTIVE' ? '#1a7f4b' : '#c0392b',
                }}>
                  {w.status}
                </span>
              </td>
              <td style={tdStyle}>{new Date(w.created_at).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <button onClick={() => openLedger(w)} style={{ background: '#1a7f4b', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  Ledger
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: offset === 0 ? 'not-allowed' : 'pointer' }}>
          Prev
        </button>
        <span style={{ lineHeight: '36px', fontSize: 13 }}>
          {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
        </span>
        <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer' }}>
          Next
        </button>
      </div>
    </>
  );
}
