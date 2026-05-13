'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
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

  async function requestPasswordReset() {
    setForgotMsg('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail || email }),
      });
      const j = await r.json();
      if (r.ok) {
        const tokenText = j.resetToken ? ` Reset token: ${j.resetToken}` : '';
        setForgotMsg((j.message || 'Password reset request sent.') + tokenText);
        setShowReset(true);
      } else {
        setForgotMsg(j.error || 'Could not request password reset');
      }
    } catch {
      setForgotMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function completePasswordReset() {
    setForgotMsg('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      const j = await r.json();
      if (r.ok) {
        setForgotMsg(j.message || 'Password reset successful. You can now sign in.');
        setShowReset(false);
        setResetToken('');
        setResetPassword('');
      } else {
        setForgotMsg(j.error || 'Could not reset password');
      }
    } catch {
      setForgotMsg('Network error');
    } finally {
      setLoading(false);
    }
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

        <div style={{ marginTop: 14, borderTop: '1px solid #e3ebe7', paddingTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Forgot password?</p>
          <input
            className="input"
            placeholder="Email for reset"
            type="email"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
          />
          <button
            className="btn"
            onClick={requestPasswordReset}
            disabled={loading || !(forgotEmail || email)}
            style={{ width: '100%', marginTop: 8 }}
          >
            Request Reset
          </button>

          {showReset && (
            <>
              <input
                className="input"
                placeholder="Reset token"
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
              />
              <button
                className="btn"
                onClick={completePasswordReset}
                disabled={loading || !resetToken || resetPassword.length < 8}
                style={{ width: '100%', marginTop: 8 }}
              >
                Reset Password
              </button>
            </>
          )}

          {forgotMsg && <p style={{ color: '#0b6b45', marginTop: 8, wordBreak: 'break-word' }}>{forgotMsg}</p>}
        </div>
      </div>
    </div>
  );
}
