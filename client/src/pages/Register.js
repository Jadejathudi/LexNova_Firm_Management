import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #0A1628 0%, #1A2A44 100%)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>⚖️</div>
          <h1 style={{ fontSize: 24, color: '#0A1628', marginTop: 8 }}>Create Account</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Join Clear Case to track your cases</p>
        </div>

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
          <button className="btn btn-navy btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
