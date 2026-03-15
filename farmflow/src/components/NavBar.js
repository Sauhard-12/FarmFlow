import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NavBar.css';

const NAV_ITEMS = [
  { label: 'Map', path: '/dashboard', icon: '🗺️' },
  { label: 'Env Risk', path: '/env-risk', icon: '🌿' },
  { label: 'Storage', path: '/storage', icon: '📦' },
  { label: 'Scenarios', path: '/scenarios', icon: '📊' },
  { label: 'Advisor', path: '/advisor', icon: '🤖' },
  { label: 'Community', path: '/community', icon: '👥' },
];

export default function NavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="navbar-wrap">
      <nav className="navbar glass-card">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
