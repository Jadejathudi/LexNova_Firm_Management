import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const NAV_LINKS = [
  { label: 'Find Advocate', path: '/advocates' },
  { label: '⚖ The Bench', path: '/bench/directory' },
  { label: 'Corporate', path: '/corporate' },
  { label: 'Income Tax', path: '/income-tax' },
  { label: 'Immigration', path: '/immigration' },
];

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashPath = !user
    ? '/login'
    : user.role === 'judge'
      ? '/judge/dashboard'
      : user.role === 'client'
        ? '/dashboard'
        : '/crm';

  const isActive = (path) => location.pathname.startsWith(path);

  const linkStyle = (path) => ({
    color: isActive(path) ? '#fff' : 'rgba(255,255,255,.72)',
    fontSize: '13px', cursor: 'pointer', fontWeight: isActive(path) ? 700 : 500,
    padding: '6px 11px', borderRadius: 8, transition: 'color .15s, background .15s',
    background: isActive(path) ? 'rgba(61,111,176,.22)' : 'transparent',
    border: 'none', fontFamily: 'inherit',
  });

  return (
    <>
      <nav style={{
        background: 'rgba(18,28,44,.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 200,
        gap: '4px', borderBottom: '1px solid rgba(255,255,255,.07)',
      }}>
        {/* Brand */}
        <button onClick={() => navigate('/')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px',
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px',
          padding: 0, marginRight: 12, letterSpacing: '.01em',
        }}>
          <Logo size={28} />
          ClearCase
        </button>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, flexWrap: 'nowrap', overflow: 'hidden' }}
          className="public-nav-links">
          {NAV_LINKS.map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)} style={linkStyle(path)}>
              {label}
            </button>
          ))}
          {user && (
            <button onClick={() => navigate(dashPath)} style={linkStyle(dashPath)}>
              {user.role === 'client' ? 'My Dashboard' : user.role === 'judge' ? 'Judge Portal' : 'CRM'}
            </button>
          )}
        </div>

        {/* Right CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => navigate('/urgent')} style={{
            background: '#C2453D', color: '#fff', border: 'none', borderRadius: '9px',
            padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background .15s',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#aa3c35'}
            onMouseOut={e => e.currentTarget.style.background = '#C2453D'}
          >
            🚨 Urgent Help
          </button>
          {user ? (
            <button onClick={() => navigate(dashPath)} style={{
              background: 'linear-gradient(135deg, #3D6FB0, #2E8E86)',
              color: '#fff', border: 'none', borderRadius: '9px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 20px -8px rgba(61,111,176,.4)',
            }}>
              Dashboard →
            </button>
          ) : (
            <button onClick={() => navigate('/register')} style={{
              background: 'linear-gradient(135deg, #3D6FB0, #2E8E86)',
              color: '#fff', border: 'none', borderRadius: '9px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 20px -8px rgba(61,111,176,.4)',
            }}>
              Get Started
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'none', background: 'none', border: 'none', color: '#fff',
              fontSize: '22px', cursor: 'pointer', padding: '4px',
            }}
            className="pub-hamburger"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, background: '#121C2C', zIndex: 190,
          display: 'flex', flexDirection: 'column', padding: '8px 0',
          borderBottom: '1px solid rgba(255,255,255,.1)', boxShadow: '0 8px 24px rgba(0,0,0,.3)',
        }}>
          {NAV_LINKS.map(({ label, path }) => (
            <button key={path} onClick={() => { navigate(path); setMenuOpen(false); }} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,.75)',
              textAlign: 'left', padding: '13px 28px', fontSize: '15px', fontWeight: 500,
              cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.06)', fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
          {user && (
            <button onClick={() => { navigate(dashPath); setMenuOpen(false); }} style={{
              background: 'none', border: 'none', color: '#7FBDE8',
              textAlign: 'left', padding: '13px 28px', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              My Dashboard →
            </button>
          )}
        </div>
      )}

      {/* Compliance banner */}
      <div style={{ background: '#EAF1F8', borderBottom: '1px solid rgba(42,84,127,.14)', padding: '7px 32px' }}>
        <p style={{ fontSize: '11.5px', color: '#2A547F', maxWidth: '1160px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.4 }}>
          ⚖ ClearCase is a legal technology platform, not a law firm. Advocates are independently enrolled with Bar Councils.{' '}
          <button onClick={() => navigate('/compliance')} style={{
            background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer',
            fontWeight: 600, color: '#2A547F', fontSize: '11.5px', fontFamily: 'inherit', padding: 0,
          }}>
            View full compliance notice
          </button>
        </p>
      </div>

      {/* Responsive style for mobile */}
      <style>{`
        @media (max-width: 640px) {
          .public-nav-links { display: none !important; }
          .pub-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
