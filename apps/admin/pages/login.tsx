import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg('');
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (j.token) {
        const adminRoles = ['COMPLIANCE_ADMIN', 'SUPER_ADMIN'];
        const payload = JSON.parse(atob(j.token.split('.')[1]));
        if (!adminRoles.includes(payload.role)) {
          setMsg('Access denied: insufficient permissions');
          return;
        }
        document.cookie = `adminToken=${j.token}; path=/; max-age=${12 * 3600}; SameSite=Strict`;
        window.location.href = '/dashboard';
      } else {
        setMsg(j.error || 'Login failed');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ marginBottom: 4 }}>AjoCircle Admin</h1>
        <p style={{ color: '#52655c', marginBottom: 20 }}>Sign in with your admin credentials.</p>
        <input className="input" placeholder="Email" type="email" onChange={e => setEmail(e.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button className="btn" onClick={submit} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        {msg && <p style={{ color: 'red', marginTop: 8 }}>{msg}</p>}
      </div>
    </div>
  );
}
