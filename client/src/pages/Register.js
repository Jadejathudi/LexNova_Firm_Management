import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const from = location.state?.from || null;
  const message = location.state?.message || null;

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!/^\d{10}$/.test(form.phone)) return setError('Phone must be 10 digits');

    setLoading(true);
    try {
      await register(form.full_name, form.email, form.phone, form.password);
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121C2C', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,.28)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Logo size={48} variant="light" style={{ display: 'inline-block' }} />
          <h1 style={{ fontSize: 24, color: '#1C2A40', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: '#5E6577', fontSize: 14, marginTop: 4 }}>Join ClearCase to manage your legal matters</p>
        </div>

        {message && (
          <div style={{ background: '#FAF0DF', border: '1px solid rgba(176,127,42,.3)', borderRadius: 11, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#7A5A1A', fontWeight: 600 }}>
            🔒 {message}
          </div>
        )}
        {from && !message && (
          <div style={{ background: '#EAF1F8', border: '1px solid rgba(42,84,127,.2)', borderRadius: 11, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2A547F' }}>
            Sign up to continue — you'll be taken back to where you left off.
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input placeholder="Your full name" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input placeholder="10-digit number" value={form.phone} maxLength={10}
              onChange={e => update('phone', e.target.value.replace(/\D/g, ''))} required />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input type="password" placeholder="Confirm your password" value={form.confirm} onChange={e => update('confirm', e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 14, color: '#5E6577' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2A4F85', fontWeight: 600 }} state={from ? { from, message } : undefined}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
