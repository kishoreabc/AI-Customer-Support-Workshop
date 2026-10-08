import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Users,
  Ticket,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Cpu,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/api/v1/admin/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <LoadingState message="Loading support operations metrics..." />;
  }

  const { metrics, recentTickets, recentAudits } = data;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Operations Dashboard</h1>
          <p className="page-subtitle">Real-time health of customer inquiries, AI conversations, and human escalations.</p>
        </div>
      </div>

      {/* Metrics Row 1 */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Customers</span>
            <Users size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value">{metrics.totalCustomers}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.activeCustomers} currently active
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Open Support Tickets</span>
            <Ticket size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>
            {metrics.openTickets}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.resolvedTickets} resolved all-time
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Active Conversations</span>
            <MessageSquare size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value">{metrics.activeConversations}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.totalAIConversations} total sessions
          </div>
        </div>

        <div className="metric-card" style={{ borderColor: metrics.escalatedConversations > 0 ? 'rgba(244, 63, 94, 0.4)' : undefined }}>
          <div className="metric-header">
            <span>Escalated to Humans</span>
            <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.escalatedConversations > 0 ? 'var(--accent-rose)' : 'inherit' }}>
            {metrics.escalatedConversations}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.totalHumanEscalations} cumulative escalations
          </div>
        </div>
      </div>

      {/* 2-Column Split: Recent Tickets & Live Audit Trail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        {/* Recent Tickets Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Support Tickets</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/tickets')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentTickets.map((t: any) => (
              <div
                key={t.ticket_id}
                onClick={() => navigate('/admin/tickets')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.subject}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {t.customer_first_name} {t.customer_last_name} • {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Audit Trail */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Activity & Audits</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/audit-logs')}>
              Full Logs <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentAudits.map((a: any) => (
              <div
                key={a.log_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>[{a.action}]</span>
                    {a.entity_type} #{a.entity_id?.substring(0, 8)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Actor: <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{a.actor_type}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
