import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Users,
  Box,
  ShoppingCart,
  MessageSquareText,
  Ticket,
  BookOpen,
  HelpCircle,
  UserCheck,
  Cpu,
  History,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="app-layout">
      {/* Admin Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-badge" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-title">Control Center</div>
            <div className="brand-sub">Admin & Operations</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/customers"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Customers</span>
          </NavLink>

          <NavLink
            to="/admin/products"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Box size={18} />
            <span>Products</span>
          </NavLink>

          <NavLink
            to="/admin/orders"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ShoppingCart size={18} />
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/admin/conversations"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <MessageSquareText size={18} />
            <span>Conversations</span>
          </NavLink>

          <NavLink
            to="/admin/tickets"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Ticket size={18} />
            <span>Support Tickets</span>
          </NavLink>

          <NavLink
            to="/admin/knowledge"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Knowledge Base</span>
          </NavLink>

          <NavLink
            to="/admin/faqs"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <HelpCircle size={18} />
            <span>FAQs</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin/agents"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <UserCheck size={18} />
              <span>Support Agents</span>
            </NavLink>
          )}

          <NavLink
            to="/admin/ai-config"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Cpu size={18} />
            <span>AI Configuration</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin/audit-logs"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <History size={18} />
              <span>Audit Logs</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="avatar-circle" style={{ borderColor: '#a855f7', background: 'rgba(168, 85, 247, 0.25)' }}>
              {user?.role === 'ADMIN' ? 'A' : 'S'}
            </div>
            <div className="user-mini-meta">
              <div className="user-mini-name">{user?.name || user?.email}</div>
              <div className="user-mini-role">
                <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  {user?.role}
                </span>
              </div>
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
