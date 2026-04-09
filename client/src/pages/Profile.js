import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.getMe().then(setProfile).catch(console.error);
  }, []);

  return (
    <div className="page-with-nav" style={{ padding: 24 }}>
      <h2 style={{ color: '#0A1628', marginBottom: 24 }}>👤 Profile</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>
          {profile?.full_name || user?.full_name}
        </div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>📧 {profile?.email || user?.email}</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>📞 {profile?.phone || 'Not set'}</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>
          Role: <span className="badge badge-active">{(profile?.role || user?.role)?.replace('_', ' ')}</span>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Security</h3>
        <div style={{ fontSize: 14, color: '#64748B' }}>
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
