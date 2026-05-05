import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Navbar() {
  const { user, logout, isInternal } = useAuth();
  const location = useLocation();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.getUnreadNotifCount().then(d => setNotifCount(d.count)).catch(() => {});
    }
  }, [user, location]);

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to={isInternal ? (user.role.includes('advocate') ? '/advocate-dashboard' : '/crm') : '/'} className="navbar-brand" style={{ textDecoration: 'none' }}>
        ⚖️ CLEAR <span>CASE</span>
      </Link>

      {isInternal ? (
        user.role.includes('advocate') ? (
          <div className="navbar-links">
            <Link to="/advocate-dashboard" className={location.pathname === '/advocate-dashboard' ? 'active' : ''}>Dashboard</Link>
            <Link to="/crm/matters" className={location.pathname.includes('/crm/matters') ? 'active' : ''}>My Cases</Link>
          </div>
        ) : (
          <div className="navbar-links">
            <Link to="/crm" className={location.pathname === '/crm' ? 'active' : ''}>Dashboard</Link>
            <Link to="/crm/matters" className={location.pathname.includes('/crm/matters') ? 'active' : ''}>Matters</Link>
            <Link to="/crm/clients" className={location.pathname.includes('/crm/clients') ? 'active' : ''}>Clients</Link>
            {['managing_partner', 'advisor'].includes(user.role) && (
              <Link to="/crm/team" className={location.pathname.includes('/crm/team') ? 'active' : ''}>Team</Link>
            )}
            {['managing_partner', 'billing'].includes(user.role) && (
              <Link to="/crm/finance" className={location.pathname.includes('/crm/finance') ? 'active' : ''}>Finance</Link>
            )}
          </div>
        )
      ) : (
        // Client navigation — Home (landing), Find Advocate, Dashboard
        <div className="navbar-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/advocates" className={location.pathname.startsWith('/advocates') ? 'active' : ''}>Find Advocate</Link>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        </div>
      )}

      <div className="navbar-user">
        <Link to={isInternal ? (user.role.includes('advocate') ? '/advocate-dashboard' : '/crm') : '/dashboard'} className="notif-badge" style={{ color: 'white', textDecoration: 'none' }}>
          🔔{notifCount > 0 && <span className="count">{notifCount}</span>}
        </Link>
        <span className="user-info">{user.full_name}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
