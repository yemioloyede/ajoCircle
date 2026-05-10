'use client';

import { useMemo, useState } from 'react';
import { api, apiWithBody, usePolling } from '../../lib/api';

type Country = {
  countryCode: string;
  countryName: string;
  primaryCurrencyCode: string;
  supportedPaymentProviders: string[];
};

type HealthRow = {
  providerName: string;
  isHealthy: boolean;
  failureCount: number;
  successRate: number;
};

type ProviderSelectionResult = {
  selected?: {
    name: string;
    countryCode: string;
    currencyCode: string;
  };
  alternatives?: Array<{
    name: string;
    countryCode: string;
    currencyCode: string;
  }>;
};

const OPERATIONS = ['COLLECTION', 'PAYOUT', 'REFUND', 'TRANSFER'] as const;

export default function PaymentsPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [operationType, setOperationType] = useState<(typeof OPERATIONS)[number]>('COLLECTION');
  const [loadingSelect, setLoadingSelect] = useState(false);
  const [loadingHealthEvent, setLoadingHealthEvent] = useState(false);
  const [selection, setSelection] = useState<ProviderSelectionResult | null>(null);
  const [health, setHealth] = useState<HealthRow[]>([]);

  usePolling(() => {
    api('/api/payments/countries')
      .then((d) => {
        const rows: Country[] = d?.countries || [];
        setCountries(rows);
        if (!rows.length) return;

        if (!countryCode) {
          setCountryCode(rows[0].countryCode);
          setCurrencyCode(rows[0].primaryCurrencyCode);
        }
      })
      .catch(() => setError('Failed to load payment countries'));
  }, 30_000);

  usePolling(() => {
    if (!countryCode) return;
    api(`/api/payments/providers/health/${countryCode}`)
      .then((d) => setHealth(d?.health || []))
      .catch(() => setError('Failed to load provider health'));
  }, 20_000);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.countryCode === countryCode) || null,
    [countries, countryCode]
  );

  async function runSelection() {
    setError('');
    setLoadingSelect(true);
    try {
      const result = await apiWithBody('/api/payments/providers/select', 'POST', {
        countryCode,
        currencyCode,
        operationType,
      });
      setSelection(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to select provider');
    } finally {
      setLoadingSelect(false);
    }
  }

  async function recordHealthEvent(success: boolean) {
    if (!selection?.selected?.name || !countryCode) return;

    setError('');
    setLoadingHealthEvent(true);
    try {
      await apiWithBody('/api/payments/providers/health/test', 'POST', {
        providerName: selection.selected.name,
        countryCode,
        success,
        amount: 10000,
        errorCode: success ? undefined : 'MANUAL_TEST_FAILURE',
      });

      const updated = await api(`/api/payments/providers/health/${countryCode}`);
      setHealth(updated?.health || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to record provider health event');
    } finally {
      setLoadingHealthEvent(false);
    }
  }

  return (
    <>
      <h1>Payments Ops</h1>
      <p style={{ color: '#52655c', marginTop: -8 }}>
        View country provider readiness, test provider routing, and monitor health in near real-time.
      </p>

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Provider Selection Test</h3>
          <label style={{ fontSize: 13, color: '#52655c' }}>Country</label>
          <select
            className="input"
            value={countryCode}
            onChange={(e) => {
              const next = e.target.value;
              setCountryCode(next);
              const c = countries.find((x) => x.countryCode === next);
              if (c) setCurrencyCode(c.primaryCurrencyCode);
            }}
          >
            {countries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.countryName} ({c.countryCode})
              </option>
            ))}
          </select>

          <label style={{ fontSize: 13, color: '#52655c' }}>Currency</label>
          <input
            className="input"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            placeholder="NGN"
            maxLength={3}
          />

          <label style={{ fontSize: 13, color: '#52655c' }}>Operation</label>
          <select
            className="input"
            value={operationType}
            onChange={(e) => setOperationType(e.target.value as (typeof OPERATIONS)[number])}
          >
            {OPERATIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>

          <button className="btn" disabled={loadingSelect || !countryCode || !currencyCode} onClick={runSelection}>
            {loadingSelect ? 'Selecting...' : 'Select Provider'}
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Country Snapshot</h3>
          {!selectedCountry && <p style={{ color: '#888' }}>No country selected.</p>}
          {selectedCountry && (
            <>
              <p><b>Country:</b> {selectedCountry.countryName} ({selectedCountry.countryCode})</p>
              <p><b>Primary Currency:</b> {selectedCountry.primaryCurrencyCode}</p>
              <p><b>Supported Providers:</b> {selectedCountry.supportedPaymentProviders.join(', ') || '—'}</p>
              <p><b>Live Health Rows:</b> {health.length}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Selection Result</h3>
          {!selection?.selected && <p style={{ color: '#888' }}>Run provider selection to see results.</p>}
          {selection?.selected && (
            <>
              <p><b>Selected:</b> {selection.selected.name}</p>
              <p><b>Country:</b> {selection.selected.countryCode}</p>
              <p><b>Currency:</b> {selection.selected.currencyCode}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  disabled={loadingHealthEvent}
                  onClick={() => recordHealthEvent(true)}
                  style={{ background: '#0b6b45' }}
                >
                  {loadingHealthEvent ? 'Saving...' : 'Mark Success Test'}
                </button>
                <button
                  className="btn"
                  disabled={loadingHealthEvent}
                  onClick={() => recordHealthEvent(false)}
                  style={{ background: '#c62828' }}
                >
                  {loadingHealthEvent ? 'Saving...' : 'Mark Failure Test'}
                </button>
              </div>
              <p style={{ marginBottom: 8 }}><b>Alternatives:</b></p>
              <ul style={{ marginTop: 0 }}>
                {(selection.alternatives || []).map((alt) => (
                  <li key={`${alt.name}-${alt.countryCode}-${alt.currencyCode}`}>
                    {alt.name} ({alt.countryCode}/{alt.currencyCode})
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Provider Health ({countryCode || '—'})</h3>
          {!health.length && <p style={{ color: '#888' }}>No health data yet.</p>}
          {!!health.length && (
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Success Rate</th>
                  <th>Failures</th>
                </tr>
              </thead>
              <tbody>
                {health.map((h) => (
                  <tr key={h.providerName}>
                    <td>{h.providerName}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: h.isHealthy ? '#eef8f2' : '#fdecea',
                          color: h.isHealthy ? '#0b6b45' : '#c62828',
                        }}
                      >
                        {h.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
                      </span>
                    </td>
                    <td>{Math.round((h.successRate || 0) * 100)}%</td>
                    <td>{h.failureCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
