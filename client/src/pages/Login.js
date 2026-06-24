import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const INTERNAL_ROLES = ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate', 'billing', 'reception'];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || null;
  const message = location.state?.message || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const isInternal = INTERNAL_ROLES.includes(user.role);
      const destination = from || (
        user.role === 'judge' ? '/judge/dashboard' :
        isInternal ? '/crm' : '/dashboard'
      );
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121C2C' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,.28)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size={48} variant="light" style={{ display: 'inline-block' }} />
          <h1 style={{ fontSize: 24, color: '#1C2A40', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>ClearCase</h1>
          <p style={{ color: '#5E6577', fontSize: 14, marginTop: 4 }}>Sign in to your account</p>
        </div>

        {message && (
          <div style={{ background: '#FAF0DF', border: '1px solid rgba(176,127,42,.3)', borderRadius: 11, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#7A5A1A', fontWeight: 600 }}>
            🔒 {message}
          </div>
        )}
        {from && !message && (
          <div style={{ background: '#EAF1F8', border: '1px solid rgba(42,84,127,.2)', borderRadius: 11, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2A547F' }}>
            Sign in to continue — you'll be taken back to where you left off.
          </div>
        )}
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
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 14, color: '#5E6577' }}>
            Don't have an account? <Link to="/register" style={{ color: '#2A4F85', fontWeight: 600 }}>Create Account</Link>
          </p>
          <p style={{ fontSize: 14, color: '#5E6577', marginTop: 8 }}>
            <Link to="/" style={{ color: '#2A4F85' }}>← Back to Home</Link>
          </p>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: '#F5F5F1', borderRadius: 11, fontSize: 12, color: '#5E6577' }}>
          <strong style={{ color: '#1C2A40' }}>Demo Accounts:</strong><br />
          Partner: prashanth@clearcase.in<br />
          Sr. Advocate: meera@clearcase.in<br />
          Client: rahul@example.com<br />
          <em>Password for all: password123</em>
        </div>
      </div>
    </div>
  );
}
