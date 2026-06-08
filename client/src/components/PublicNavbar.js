import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1B2559', GOLD = '#C9A84C', AMBER = '#92400E', AMBER_BG = '#FFF8E8';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const dashPath = user ? (user.role === 'client' ? '/dashboard' : '/crm') : '/login';

  return (
    <>
      <nav style={{ background: NAVY, padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, gap: '24px', boxShadow: '0 2px 16px rgba(0,0,0,.18)' }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#fff', fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚖ ClearCase
        </span>
        <div style={{ flex: 1 }} />
        <span onClick={() => navigate('/advocates')} style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>Find Advocate</span>
        <span onClick={() => navigate('/bench/directory')} style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>Consult Judges</span>
        {user && (
          <span onClick={() => navigate(dashPath)} style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>My Case</span>
        )}
        <span onClick={() => navigate('/intelligence')} style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>Case Intelligence</span>
        <button
          onClick={() => navigate('/urgent')}
          style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: '9px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🚨 Urgent Help
        </button>
        <button
          onClick={() => navigate('/judge/login')}
          style={{ background: 'transparent', color: 'rgba(255,255,255,.8)', border: '1px solid rgba(255,255,255,.3)', borderRadius: '9px', padding: '9px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Judge Login
        </button>
        {user ? (
          <button onClick={() => navigate(dashPath)} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            My Dashboard
          </button>
        ) : (
          <button onClick={() => navigate('/register')} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Get Started
          </button>
        )}
      </nav>
      <div style={{ background: AMBER_BG, borderBottom: '1px solid #FDE68A', padding: '7px 40px' }}>
        <p style={{ fontSize: '12px', color: AMBER, maxWidth: '1100px', margin: '0 auto' }}>
          ⚖ ClearCase is a legal technology platform, not a law firm. Advocates are independently enrolled with Bar Councils.{' '}
          <span onClick={() => navigate('/compliance')} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>View full compliance notice</span>
        </p>
      </div>
    </>
  );
}
