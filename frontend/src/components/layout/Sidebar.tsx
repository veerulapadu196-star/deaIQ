import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Bot, GitCompare } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} />, exact: true },
  { to: '/deals', label: 'Deals', icon: <Briefcase size={16} /> },
  { to: '/copilot', label: 'AI Copilot', icon: <Bot size={16} /> },
  { to: '/memory-compare', label: 'Memory Compare', icon: <GitCompare size={16} /> },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon" aria-hidden="true">IQ</div>
          <div>
            <div className="logo-text">DealIQ</div>
            <div className="logo-sub">Intelligent Sales Workspace</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="nav-label">Navigation</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`nav-item ${isActive(item.to, item.exact) ? 'active' : ''}`}
            aria-current={isActive(item.to, item.exact) ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          DealIQ v1.0
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          Intelligent Sales Workspace
        </div>
      </div>
    </aside>
  );
};
