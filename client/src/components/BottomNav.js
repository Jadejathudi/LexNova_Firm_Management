import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user, isInternal } = useAuth();

  if (!user) return null;

  let NAV_ITEMS = [];

  if (isInternal && user.role.includes('advocate')) {
    NAV_ITEMS = [
      { path: '/advocate-dashboard', icon: '🏠', label: 'Home' },
      { path: '/crm/consultations', icon: '📅', label: 'Consult' },
      { path: '/crm/matters', icon: '📁', label: 'Cases' },
      { path: '/chat', icon: '💬', label: 'Chat' },
      { path: '/profile', icon: '👤', label: 'Profile' },
    ];
  } else if (isInternal) {
    NAV_ITEMS = [
      { path: '/crm', icon: '🏠', label: 'Home' },
      { path: '/crm/matters', icon: '📁', label: 'Matters' },
      { path: '/crm/clients', icon: '👥', label: 'Clients' },
      { path: '/chat', icon: '💬', label: 'Chat' },
      { path: '/profile', icon: '👤', label: 'Profile' },
    ];
  } else {
    NAV_ITEMS = [
      { path: '/dashboard', icon: '🏠', label: 'Home' },
      { path: '/cases', icon: '📁', label: 'Cases' },
      { path: '/chat', icon: '💬', label: 'Chat' },
      { path: '/documents', icon: '📄', label: 'Docs' },
      { path: '/profile', icon: '👤', label: 'Profile' },
    ];
  }

  return (
    <div className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <Link key={item.path} to={item.path}
          className={location.pathname.startsWith(item.path) ? 'active' : ''}
          style={{ textDecoration: 'none' }}>
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
