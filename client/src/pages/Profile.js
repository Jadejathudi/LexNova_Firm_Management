import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMe()
      .then((data) => {
        setProfile(data);
        setForm({ full_name: data.full_name || '', email: data.email || '', phone: data.phone || '' });
      })
      .catch((err) => {
        setError(err.message || 'Unable to load profile');
      });
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await api.updateMyProfile(form);
      setProfile((prev) => ({ ...prev, ...form }));
      setMessage(data.message || 'Profile updated successfully');
    } catch (err) {
      setError(err.message || 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPasswordSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await api.changePassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setMessage(data.message || 'Password updated successfully');
    } catch (err) {
      setError(err.message || 'Unable to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="page-with-nav" style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1C2A40', margin: 0 }}>👤 My Profile</h2>
        {user?.role === 'senior_advocate' || user?.role === 'junior_advocate' ? (
          <button onClick={() => navigate('/advocate-profile')} style={{ border: '1px solid #CBD5E1', background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, color: '#1C2A40' }}>
            Advocate Profile
          </button>
        ) : null}
      </div>

      {message && <div style={{ background: '#ECFDF5', border: '1px solid #86EFAC', color: '#166534', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Full name</label>
            <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Email</label>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Role</label>
            <input value={(profile?.role || user?.role || '').replace('_', ' ')} readOnly style={{ ...inputStyle, background: '#F8FAFC' }} />
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button onClick={saveProfile} disabled={saving} style={{ background: '#3D6FB0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 14, color: '#1C2A40' }}>Security</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Current password</label>
            <input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>New password</label>
            <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#64748B' }}>Confirm password</label>
            <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button onClick={changePassword} disabled={passwordSaving} style={{ background: '#0F766E', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: passwordSaving ? 'not-allowed' : 'pointer' }}>
            {passwordSaving ? 'Updating…' : 'Change Password'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>📧 {profile?.email || user?.email}</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>📞 {profile?.phone || 'Not set'}</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'}
        </div>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 14 }}>
          🔒 MFA: {profile?.mfa_enabled ? 'Enabled' : 'Not enabled'}
        </div>
        <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
          🕒 Last login: {profile?.last_login ? new Date(profile.last_login).toLocaleString('en-IN') : 'N/A'}
        </div>
      </div>

      <button className="btn btn-danger btn-full" onClick={logout}>
        Sign Out
      </button>
    </div>
  );
}
