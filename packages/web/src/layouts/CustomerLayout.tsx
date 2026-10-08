import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Bot,
  MessageSquare,
  Package,
  LifeBuoy,
  User,
  LogOut,
  Sparkles,
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
          <div className="brand-badge">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="brand-title">HelpCenter AI</div>
            <div className="brand-sub">Customer Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/chat"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Bot size={18} />
            <span>AI Support Chat</span>
          </NavLink>

          <NavLink
            to="/conversations"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <MessageSquare size={18} />
            <span>My Conversations</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Package size={18} />
            <span>My Orders</span>
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LifeBuoy size={18} />
            <span>My Tickets</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <User size={18} />
            <span>My Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="avatar-circle">
              {user?.firstName ? user.firstName[0] : 'C'}
            </div>
            <div className="user-mini-meta">
              <div className="user-mini-name">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
              </div>
              <div className="user-mini-role">Customer Account</div>
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
