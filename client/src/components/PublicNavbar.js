import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1B2559', GOLD = '#C9A84C', AMBER = '#92400E', AMBER_BG = '#FFF8E8';

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
    color: isActive(path) ? GOLD : 'rgba(255,255,255,.72)',
    fontSize: '13px', cursor: 'pointer', fontWeight: isActive(path) ? 700 : 500,
    padding: '6px 10px', borderRadius: 6, transition: 'color .15s',
    background: isActive(path) ? 'rgba(201,168,76,.1)' : 'transparent',
    border: 'none', fontFamily: 'inherit',
  });

  return (
    <>
      <nav style={{
        background: NAVY, padding: '0 32px', height: '62px',
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 200,
        gap: '4px', boxShadow: '0 2px 16px rgba(0,0,0,.22)',
      }}>
        {/* Brand */}
        <button onClick={() => navigate('/')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', fontFamily: 'Georgia, serif', fontSize: '20px',
          fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', padding: 0, marginRight: 12,
        }}>
          ⚖ ClearCase
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
            background: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            🚨 Urgent
          </button>
          {user ? (
            <button onClick={() => navigate(dashPath)} style={{
              background: GOLD, color: NAVY, border: 'none', borderRadius: '8px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Dashboard →
            </button>
          ) : (
            <button onClick={() => navigate('/register')} style={{
              background: GOLD, color: NAVY, border: 'none', borderRadius: '8px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
          position: 'fixed', top: 62, left: 0, right: 0, background: '#0A1628', zIndex: 190,
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
              background: 'none', border: 'none', color: GOLD,
              textAlign: 'left', padding: '13px 28px', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              My Dashboard →
            </button>
          )}
        </div>
      )}

      {/* Compliance banner */}
      <div style={{ background: AMBER_BG, borderBottom: '1px solid #FDE68A', padding: '6px 32px' }}>
        <p style={{ fontSize: '12px', color: AMBER, maxWidth: '1100px', margin: '0 auto' }}>
          ⚖ ClearCase is a legal technology platform, not a law firm. Advocates are independently enrolled with Bar Councils.{' '}
          <button onClick={() => navigate('/compliance')} style={{
            background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer',
            fontWeight: 600, color: AMBER, fontSize: '12px', fontFamily: 'inherit', padding: 0,
          }}>
            View full compliance notice
          </button>
        </p>
      </div>

      {/* Responsive style for mobile hamburger visibility */}
      <style>{`
        @media (max-width: 640px) {
          .public-nav-links { display: none !important; }
          .pub-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
