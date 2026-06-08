import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from './benchConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export default function JudgeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bench/judge/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Store token and judge info
      localStorage.setItem('clearcase_token', data.token);
      localStorage.setItem('judge_info', JSON.stringify(data.judge));

      navigate('/judge/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Jost',sans-serif", background: C.ink, color: C.parchment, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, padding: '48px', maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: 48, marginBottom: '12px' }}>⚖️</div>
          <h1 style={{ fontFamily: "'EB Garamond',serif", fontSize: 32, fontWeight: 700, color: C.parchment, marginBottom: '8px' }}>Judge Portal</h1>
          <p style={{ color: C.gray, fontSize: 13 }}>Access your session bookings and manage consultations</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 4, padding: '12px 14px', color: '#FCA5A5', fontSize: 12, marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="judge.initials@clearcase.legal"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: C.charcoalMid,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.parchment,
                fontSize: 13,
                fontFamily: "'Jost',sans-serif",
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: C.charcoalMid,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.parchment,
                fontSize: 13,
                fontFamily: "'Jost',sans-serif",
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: C.gold,
              color: C.ink,
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: "'Jost',sans-serif",
            }}
          >
            {loading ? 'Logging in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '24px', paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: C.gray, lineHeight: 1.6, marginBottom: 0 }}>
            Don't have login credentials yet?<br />
            Contact ClearCase support to activate your judge account.
          </p>
        </div>
      </div>
    </div>
  );
}
