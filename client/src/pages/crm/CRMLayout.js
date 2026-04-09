import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/crm', label: '📊 Dashboard', roles: ['managing_partner', 'advisor'] },
  { path: '/crm/matters', label: '📁 Matters', roles: ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'] },
  { path: '/crm/clients', label: '👥 Clients', roles: ['managing_partner', 'advisor', 'senior_advocate', 'junior_advocate', 'reception'] },
  { path: '/crm/team', label: '👔 Team', roles: ['managing_partner', 'advisor'] },
  { path: '/crm/finance', label: '💰 Finance', roles: ['managing_partner', 'billing'] },
  { path: '/crm/consultations', label: '📅 Bookings', roles: ['managing_partner', 'reception', 'advisor'] },
];

export default function CRMLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));

  return (
    <div className="crm-layout">
      <div className="crm-sidebar">
        {visibleNav.map(item => (
          <Link key={item.path} to={item.path}
            className={location.pathname === item.path ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
      </div>
      <div className="crm-content">
        <Outlet />
      </div>
    </div>
  );
}
