"use client";
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  async function requestPasswordReset() {
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(j.message || "Password reset request sent.");
        setShowReset(true);
      } else {
        setMsg(j.error || "Could not request password reset");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function completePasswordReset() {
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(j.message || "Password reset successful. You can now sign in.");
        setShowReset(false);
        setResetToken("");
        setResetPassword("");
      } else {
        setMsg(j.error || "Could not reset password");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <h1 style={{ marginBottom: 4 }}>Forgot Password</h1>
        <p style={{ color: "#52655c", marginBottom: 20 }}>Enter your email to request a password reset.</p>
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button
          className="btn"
          onClick={requestPasswordReset}
          disabled={loading || !email}
          style={{ width: "100%", marginTop: 8 }}
        >
          {loading ? "Requesting…" : "Request Reset"}
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
              style={{ width: "100%", marginTop: 8 }}
            >
              Reset Password
            </button>
          </>
        )}
        {msg && <p style={{ color: msg.includes("successful") ? "#0b6b45" : "red", marginTop: 8, wordBreak: "break-word" }}>{msg}</p>}
      </div>
    </div>
  );
}
