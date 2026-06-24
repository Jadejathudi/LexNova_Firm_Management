import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout, isInternal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifCount, setNotifCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.getUnreadNotifCount().then(d => setNotifCount(d?.count || 0)).catch(() => {});
    }
  }, [user, location]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (!user) return null;

  const isLinkActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const clientLinks = [
    { to: '/', label: 'Home', exact: true },
    { to: '/advocates', label: 'Find Advocate' },
    { to: '/bench', label: '⚖ The Bench' },
    { to: '/matters', label: 'My Matters' },
    { to: '/dashboard', label: 'Dashboard', exact: true },
  ];

  const advocateLinks = [
    { to: '/advocate-dashboard', label: 'Dashboard', exact: true },
    { to: '/crm/matters', label: 'Matters' },
    { to: '/crm/cases', label: 'Filed Cases' },
  ];

  const partnerLinks = [
    { to: '/crm', label: 'Dashboard', exact: true },
    { to: '/crm/matters', label: 'Matters' },
    { to: '/crm/clients', label: 'Clients' },
    ...(['managing_partner', 'advisor'].includes(user.role) ? [{ to: '/crm/team', label: 'Team' }] : []),
    ...(['managing_partner', 'billing'].includes(user.role) ? [{ to: '/crm/finance', label: 'Finance' }] : []),
  ];

  const links = isInternal
    ? (user.role.includes('advocate') ? advocateLinks : partnerLinks)
    : clientLinks;

  const brandTo = isInternal
    ? (user.role.includes('advocate') ? '/advocate-dashboard' : '/crm')
    : '/';

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <Link to={brandTo} className="navbar-brand" style={{ textDecoration: 'none' }}>
          <Logo size={26} />
          ClearCase
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          {links.map(({ to, label, exact }) => (
            <Link key={to} to={to} className={isLinkActive(to, exact) ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="navbar-user">
          <Link
            to={isInternal ? (user.role.includes('advocate') ? '/advocate-dashboard' : '/crm') : '/dashboard'}
            className="notif-badge"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            🔔{notifCount > 0 && <span className="count">{notifCount}</span>}
          </Link>
          <span className="user-info">{user.full_name}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>

          {/* Hamburger (mobile only) */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`navbar-mobile-drawer${menuOpen ? ' open' : ''}`}>
        {links.map(({ to, label, exact }) => (
          <Link key={to} to={to} className={isLinkActive(to, exact) ? 'active' : ''}>
            {label}
          </Link>
        ))}
        <Link to="/profile" style={{ color: 'rgba(255,255,255,.6)' }}>👤 Profile</Link>
        <a
          href="#logout"
          onClick={e => { e.preventDefault(); logout(); }}
          style={{ color: '#FCA5A5', borderBottom: 'none' }}
        >
          Sign Out
        </a>
      </div>

      {/* Compliance banner */}
      <div className="navbar-compliance">
        <p>
          ⚖ ClearCase is a legal technology platform, not a law firm. Advocates are independently enrolled with Bar Councils.{' '}
          <button onClick={() => navigate('/compliance')}>View full compliance notice</button>
        </p>
      </div>
    </>
  );
}
