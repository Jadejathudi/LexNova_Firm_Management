import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { C } from '../../pages/bench/benchConstants';

const NAV_LINKS = [
  { label: 'Directory',    path: '/bench/directory' },
  { label: 'How It Works', path: '/bench/how-it-works' },
  { label: 'Services',     path: '/bench/services' },
  { label: 'My Sessions',  path: '/bench/my-sessions', clientOnly: true },
];

export default function BenchNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Inject Google Fonts for bench pages
  useEffect(() => {
    const id = 'bench-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Jost:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      // Leave font loaded — safe to keep
    };
  }, []);

  const isActive = (path) => location.pathname.startsWith(path) && path !== '/bench/directory'
    ? location.pathname === path || location.pathname.startsWith(path)
    : location.pathname === path;

  return (
    <nav style={{
      background: C.charcoal, borderBottom: `1px solid ${C.border}`,
      padding: '0 48px', height: 62,
      display: 'flex', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 100,
      gap: 24, boxShadow: '0 2px 20px rgba(0,0,0,.3)',
      fontFamily: "'Jost',sans-serif",
    }}>
      {/* Logo */}
      <span onClick={() => navigate('/bench')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: C.gold, fontSize: 20 }}>⚖</span>
        <div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 17, fontWeight: 600, color: C.parchment, lineHeight: 1 }}>The Bench</div>
          <div style={{ fontSize: 9, color: C.gray, letterSpacing: '.14em', textTransform: 'uppercase' }}>by ClearCase</div>
        </div>
      </span>

      <div style={{ width: 1, height: 26, background: C.border }} />

      {NAV_LINKS.filter(({ clientOnly }) => !clientOnly || (user && user.role !== 'judge')).map(({ label, path }) => (
        <span
          key={path}
          onClick={() => navigate(path)}
          style={{
            color: isActive(path) ? C.gold : C.grayLight,
            fontSize: 14, cursor: 'pointer', fontWeight: 500,
            transition: 'color .15s',
          }}
          onMouseEnter={e => e.target.style.color = C.gold}
          onMouseLeave={e => e.target.style.color = isActive(path) ? C.gold : C.grayLight}
        >{label}</span>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => navigate('/bench/directory')}
        style={{
          background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}`,
          borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Jost',sans-serif", letterSpacing: '.02em',
        }}
      >Browse Judges <span style={{ fontSize: '0.7em', opacity: .75 }}>Retd.</span></button>

      <button
        onClick={() => navigate(user ? (user.role === 'judge' ? '/judge/dashboard' : '/dashboard') : '/')}
        style={{
          background: 'rgba(255,255,255,.07)', color: C.parchment,
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 3, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Jost',sans-serif",
        }}
      >← ClearCase</button>
    </nav>
  );
}
