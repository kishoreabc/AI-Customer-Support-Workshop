import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Bot,
  Wifi,
  BarChart3,
  CreditCard,
  Receipt,
  Smartphone,
  LifeBuoy,
  MessageSquare,
  User,
  LogOut,
  Radio,
} from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Customer Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-badge" style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}>
            <Radio size={20} />
          </div>
          <div>
            <div className="brand-title">TelecomOne</div>
            <div className="brand-sub">Subscriber Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/chat"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Bot size={18} />
            <span>AI Telecom Support</span>
          </NavLink>

          <NavLink
            to="/plan"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Wifi size={18} />
            <span>My Plan</span>
          </NavLink>

          <NavLink
            to="/usage"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>My Usage</span>
          </NavLink>

          <NavLink
            to="/recharge"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <CreditCard size={18} />
            <span>Recharge</span>
          </NavLink>

          <NavLink
            to="/bills"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Receipt size={18} />
            <span>Bills & Payments</span>
          </NavLink>

          <NavLink
            to="/sim"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Smartphone size={18} />
            <span>My SIM / eSIM</span>
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LifeBuoy size={18} />
            <span>Support Tickets</span>
          </NavLink>

          <NavLink
            to="/conversations"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>Conversations</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="avatar-circle" style={{ background: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4' }}>
              {user?.firstName ? user.firstName[0] : 'S'}
            </div>
            <div className="user-mini-meta">
              <div className="user-mini-name">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </div>
              <div className="user-mini-role" style={{ color: '#22d3ee' }}>5G Active Subscriber</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Outlet */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
