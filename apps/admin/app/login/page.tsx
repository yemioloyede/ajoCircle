'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (r.ok) {
        window.location.href = '/dashboard';
      } else {
        setMsg(j.error || 'Login failed');
      }
    } catch { setMsg('Network error'); } finally { setLoading(false); }
  }


  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ marginBottom: 4 }}>AjoCircle Admin v2.1</h1>
        <p style={{ color: '#52655c', marginBottom: 20 }}>Sign in with your admin credentials.</p>
        <input className="input" placeholder="Email" type="email" onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <button className="btn" onClick={submit} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Signing in…' : 'Login'}
        </button>
        {msg && <p style={{ color: 'red', marginTop: 8 }}>{msg}</p>}
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <Link href="/forgot-password" style={{ color: '#0b6b45', textDecoration: 'underline', fontWeight: 500 }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
