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
  Wifi,
  CreditCard,
  DollarSign,
  Radio,
  Activity,
  Receipt,
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
    return <LoadingState message="Loading Telecom Operations Center telemetry..." />;
  }

  const { metrics, recentTickets, recentRecharges, activeOutagesList, recentAudits } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Telecom Operations & AI Mission Control</h1>
          <p className="page-subtitle">Real-time health of cellular subscribers, autonomous AI resolution, recharge revenue, and network towers.</p>
        </div>
      </div>

      {/* Outage Alert Banner if any active outages */}
      {metrics.activeOutages > 0 && activeOutagesList && activeOutagesList.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(20, 27, 44, 0.95))',
            borderColor: 'var(--accent-rose)',
            boxShadow: '0 0 20px rgba(244, 63, 94, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} style={{ color: 'var(--accent-rose)' }} />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-rose)', margin: 0 }}>
                {metrics.activeOutages} Active Cellular Disruption{metrics.activeOutages > 1 ? 's' : ''} Broadcasted
              </h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/outages')}
              style={{ fontSize: '0.78rem' }}
            >
              Manage Outages <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {activeOutagesList.map((outage: any) => (
              <div
                key={outage.outage_id}
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{outage.city} ({outage.region})</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ETA: {outage.estimated_resolution} • {outage.affected_service}
                  </div>
                </div>
                <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                  {outage.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row 1: High Level KPIs */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Active Subscribers</span>
            <Users size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value">{metrics.totalSubscribers || metrics.totalCustomers}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.activeSubscribers || metrics.activeCustomers} 5G active subscribers
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Recharge Revenue</span>
            <DollarSign size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
            ₹{Number(metrics.rechargeRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.todayRecharges} recharges processed
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>AI Autonomous Resolution</span>
            <Cpu size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
            {metrics.aiResolutionRate}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.totalAIConversations} total AI chats ({metrics.escalatedConversations} escalations)
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Open Support Tickets</span>
            <Ticket size={18} style={{ color: metrics.openTickets > 0 ? 'var(--accent-amber)' : 'inherit' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.openTickets > 0 ? 'var(--accent-amber)' : 'inherit' }}>
            {metrics.openTickets}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.networkIssues || 0} network investigations
          </div>
        </div>
      </div>

      {/* 2-Column Split: Recent Support Tickets & Recent Recharges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Recent Tickets Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ticket size={18} style={{ color: 'var(--accent-amber)' }} /> Recent Subscriber Tickets
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/tickets')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentTickets && recentTickets.length > 0 ? (
              recentTickets.map((t: any) => (
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
                      {t.customer_first_name} {t.customer_last_name} • {t.phone_number || 'Mobile'} • {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                No open tickets
              </div>
            )}
          </div>
        </div>

        {/* Live Recharges Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} style={{ color: 'var(--accent-emerald)' }} /> Recent Recharges Ledger
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/recharges')}>
              Ledger <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentRecharges && recentRecharges.length > 0 ? (
              recentRecharges.map((r: any) => (
                <div
                  key={r.recharge_id}
                  onClick={() => navigate('/admin/recharges')}
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
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {r.first_name} {r.last_name || ''} — ₹{r.amount}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {r.plan_name || '5G Plan'} • {r.payment_method} ({r.transaction_id})
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    SUCCESS
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                No recharges recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Audit Trail */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Telecom Operations Audit Trail</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/audit-logs')}>
            Full Audit Logs <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recentAudits && recentAudits.map((a: any) => (
            <div
              key={a.log_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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
  );
};
