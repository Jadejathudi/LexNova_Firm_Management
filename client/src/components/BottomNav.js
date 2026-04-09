import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/cases', icon: '📁', label: 'Cases' },
  { path: '/chat', icon: '💬', label: 'Chat' },
  { path: '/documents', icon: '📄', label: 'Docs' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();

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
