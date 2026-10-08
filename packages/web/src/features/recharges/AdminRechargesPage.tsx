import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  CreditCard,
  Search,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Phone,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

interface RechargeRecord {
  recharge_id: string;
  customer_id: string;
  mobile_number: string;
  plan_id: string;
  plan_name?: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export const AdminRechargesPage: React.FC = () => {
  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRecharges();
  }, []);

  const loadRecharges = async () => {
    try {
      const res = await api.get<RechargeRecord[]>('/api/v1/recharges');
      setRecharges(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = recharges.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.recharge_id.toLowerCase().includes(q) ||
      r.mobile_number.toLowerCase().includes(q) ||
      (r.first_name && r.first_name.toLowerCase().includes(q)) ||
      (r.last_name && r.last_name.toLowerCase().includes(q)) ||
      (r.plan_name && r.plan_name.toLowerCase().includes(q)) ||
      r.transaction_id.toLowerCase().includes(q)
    );
  });

  const totalRevenue = recharges
    .filter((r) => r.status === 'SUCCESS')
    .reduce((acc, r) => acc + (r.amount || 0), 0);
  const successCount = recharges.filter((r) => r.status === 'SUCCESS').length;
  const avgTicket = successCount > 0 ? Math.round(totalRevenue / successCount) : 0;

  if (loading) {
    return <LoadingState message="Loading subscriber recharge ledger..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recharge Transactions & Revenue</h1>
          <p className="page-subtitle">Real-time ledger of subscriber plan renewals, payment gateways, and UPI settlements</p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Recharge Revenue</span>
            <DollarSign size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Across {successCount} successful settlements
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Total Transactions</span>
            <Receipt size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value">{recharges.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {(successCount / (recharges.length || 1) * 100).toFixed(0)}% success conversion
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Average Ticket Size</span>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value">₹{avgTicket}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            ARPU per recharge event
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by subscriber name, mobile number, Txn ID, or plan name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* Recharges Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Recharge ID & Txn</th>
                <th>Subscriber Details</th>
                <th>Plan Purchased</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No recharge records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.recharge_id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.recharge_id}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {r.transaction_id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {r.first_name ? `${r.first_name} ${r.last_name || ''}` : 'Subscriber'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{r.mobile_number}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{r.plan_name || r.plan_id}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        ₹{r.amount}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {r.payment_method}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
