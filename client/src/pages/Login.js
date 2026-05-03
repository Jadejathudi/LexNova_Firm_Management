import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      // Route based on role
      if (['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate', 'billing', 'reception'].includes(user.role)) {
        navigate('/crm');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #0A1628 0%, #1A2A44 100%)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36 }}>⚖️</div>
          <h1 style={{ fontSize: 24, color: '#0A1628', marginTop: 8 }}>CLEAR <span style={{ color: '#C9A84C' }}>CASE</span></h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Sign in to your account</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-navy btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>
            <Link to="/">← Back to Home</Link>
          </p>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#64748B' }}>
          <strong>Demo Accounts:</strong><br />
          Partner: prashanth@clearcase.in<br />
          Sr. Advocate: meera@clearcase.in<br />
          Client: rahul@example.com<br />
          <em>Password for all: password123</em>
        </div>
      </div>
    </div>
  );
}
