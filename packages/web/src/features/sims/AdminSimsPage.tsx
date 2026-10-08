import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Smartphone,
  Search,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
} from 'lucide-react';

interface SimEntry {
  sim_id: string;
  customer_id: string;
  phone_number: string;
  iccid: string;
  imsi: string;
  sim_type: 'PHYSICAL_SIM' | 'ESIM';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  activated_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export const AdminSimsPage: React.FC = () => {
  const [sims, setSims] = useState<SimEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    loadSims();
  }, []);

  const loadSims = async () => {
    try {
      const res = await api.get<SimEntry[]>('/api/v1/sims');
      setSims(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sims.filter((s) => {
    if (typeFilter !== 'ALL' && s.sim_type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.phone_number.toLowerCase().includes(q) ||
      s.iccid.toLowerCase().includes(q) ||
      s.imsi.toLowerCase().includes(q) ||
      (s.first_name && s.first_name.toLowerCase().includes(q)) ||
      (s.last_name && s.last_name.toLowerCase().includes(q))
    );
  });

  const totalSims = sims.length;
  const esimCount = sims.filter((s) => s.sim_type === 'ESIM').length;
  const physicalCount = sims.filter((s) => s.sim_type === 'PHYSICAL_SIM').length;
  const blockedCount = sims.filter((s) => s.status === 'BLOCKED').length;

  if (loading) {
    return <LoadingState message="Connecting to cellular HLR / SIM provisioning database..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SIM & eSIM Inventory Registry</h1>
          <p className="page-subtitle">Cellular identity allocations, IMSI/ICCID records, OTA provisioning, and fraud block management</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Provisioned Profiles</span>
            <Smartphone size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value">{totalSims}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Across cellular core nodes
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Active eSIMs</span>
            <QrCode size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>{esimCount}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {((esimCount / (totalSims || 1)) * 100).toFixed(0)}% digital adoption
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Physical Nano-SIMs</span>
            <Radio size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value">{physicalCount}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Traditional chip cards
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Emergency Blocked</span>
            <Lock size={18} style={{ color: blockedCount > 0 ? 'var(--accent-rose)' : 'inherit' }} />
          </div>
          <div className="metric-value" style={{ color: blockedCount > 0 ? 'var(--accent-rose)' : 'inherit' }}>
            {blockedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Lost / Stolen phone lock
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
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
              placeholder="Search by subscriber, phone number, ICCID, or IMSI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'PHYSICAL_SIM', 'ESIM'].map((t) => (
              <button
                key={t}
                className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={() => setTypeFilter(t)}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SIMs Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Mobile Number & Subscriber</th>
                <th>SIM Architecture</th>
                <th>ICCID Serial</th>
                <th>IMSI Code</th>
                <th>Status</th>
                <th>Activation Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No SIM entries found matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.sim_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{s.phone_number}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {s.first_name ? `${s.first_name} ${s.last_name || ''}` : 'Subscriber'} ({s.email})
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.sim_type === 'ESIM' ? 'badge-primary' : 'badge-info'}`}>
                        {s.sim_type === 'ESIM' ? 'Digital eSIM' : 'Physical Nano-SIM'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {s.iccid}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {s.imsi}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(s.activated_at).toLocaleDateString()}
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
