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
      <Link to={isInternal ? '/crm' : '/dashboard'} className="navbar-brand" style={{ textDecoration: 'none' }}>
        ⚖️ LEX <span>NOVA</span>
      </Link>

      {isInternal ? (
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
      ) : (
        <div className="navbar-links">
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Home</Link>
          <Link to="/ai-guide" className={location.pathname === '/ai-guide' ? 'active' : ''}>AI Guide</Link>
        </div>
      )}

      <div className="navbar-user">
        <Link to={isInternal ? '/crm' : '/dashboard'} className="notif-badge" style={{ color: 'white', textDecoration: 'none' }}>
          🔔{notifCount > 0 && <span className="count">{notifCount}</span>}
        </Link>
        <span className="user-info">{user.full_name}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
