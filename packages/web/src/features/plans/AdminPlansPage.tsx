import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Wifi,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Phone,
  MessageSquare,
  Shield,
  Layers,
} from 'lucide-react';

interface TelecomPlan {
  plan_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  validity_days: number;
  data_allowance: string;
  voice_allowance: string;
  sms_allowance: string;
  network_type: string;
  is_5g: number;
  category: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  created_at: string;
}

export const AdminPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<TelecomPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 349,
    validityDays: 28,
    dataAllowance: '2 GB/day + Unlimited 5G',
    voiceAllowance: 'Unlimited Calls',
    smsAllowance: '100 SMS/day',
    networkType: '5G',
    is5G: true,
    roamingAvailable: true,
    category: 'UNLIMITED_5G',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadPlans();
  }, [categoryFilter]);

  const loadPlans = async () => {
    try {
      let url = '/api/v1/plans';
      if (categoryFilter !== 'ALL') {
        url += `?category=${categoryFilter}`;
      }
      const res = await api.get<TelecomPlan[]>(url);
      setPlans(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/api/v1/plans', formData);
      setFeedback(`Telecom plan "${formData.name}" created and cataloged successfully!`);
      setShowCreateModal(false);
      await loadPlans();
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 349,
        validityDays: 28,
        dataAllowance: '2 GB/day + Unlimited 5G',
        voiceAllowance: 'Unlimited Calls',
        smsAllowance: '100 SMS/day',
        networkType: '5G',
        is5G: true,
        roamingAvailable: true,
        category: 'UNLIMITED_5G',
        status: 'ACTIVE',
      });
    } catch (err: any) {
      setFeedback(err.message || 'Failed to create plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.data_allowance.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingState message="Loading telecom tariff catalog..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Telecom Plans Management</h1>
          <p className="page-subtitle">Configure 5G prepaid/postpaid plans, data boosters, voice quotas, and validity periods</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Telecom Plan
        </button>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            background: feedback.includes('successfully') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            borderColor: feedback.includes('successfully') ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.includes('successfully') ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={20} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem' }}>{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
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
              placeholder="Search plans by name, data allowance, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['ALL', 'UNLIMITED_5G', 'DATA_BOOSTER', 'ANNUAL_PLAN', 'ROAMING_PACK'].map((cat) => (
              <button
                key={cat}
                className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Plan Name & Type</th>
                <th>Price & Validity</th>
                <th>Data Quota</th>
                <th>Voice & SMS</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No telecom plans found matching filter.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((p) => (
                  <tr key={p.plan_id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {p.name}
                          {p.is_5g === 1 && (
                            <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              5G
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {p.description}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>₹{p.price}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.validity_days} Days validity</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={14} style={{ color: 'var(--accent-cyan)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.data_allowance}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>{p.voice_allowance}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.sms_allowance}</div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
            backdropFilter: 'var(--backdrop-blur)',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-active)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.2rem' }}>Create New Telecom Plan</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Plan Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. 5G Super Unlimited 84 Days"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Marketing Description</label>
                <textarea
                  required
                  className="input"
                  rows={2}
                  placeholder="e.g. True Unlimited 5G Data, 2GB/day 4G backup, Free National Roaming"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label">Price (INR ₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="input"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label">Data Quota</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. 2 GB/day"
                    value={formData.dataAllowance}
                    onChange={(e) => setFormData({ ...formData, dataAllowance: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Plan Category</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="UNLIMITED_5G">UNLIMITED 5G</option>
                    <option value="DATA_BOOSTER">DATA BOOSTER</option>
                    <option value="ANNUAL_PLAN">ANNUAL PLAN</option>
                    <option value="ROAMING_PACK">ROAMING PACK</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label">Voice Allowance</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.voiceAllowance}
                    onChange={(e) => setFormData({ ...formData, voiceAllowance: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">SMS Allowance</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.smsAllowance}
                    onChange={(e) => setFormData({ ...formData, smsAllowance: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is5G}
                    onChange={(e) => setFormData({ ...formData, is5G: e.target.checked })}
                  />
                  <span>5G Standalone Enabled</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.roamingAvailable}
                    onChange={(e) => setFormData({ ...formData, roamingAvailable: e.target.checked })}
                  />
                  <span>National Roaming Included</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Wifi size={16} /> {submitting ? 'Creating...' : 'Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
