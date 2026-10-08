import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  AlertTriangle,
  Plus,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react';

interface Outage {
  outage_id: string;
  region: string;
  city: string;
  affected_service: string;
  network_type: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'IN_PROGRESS' | 'RESOLVED';
  start_time: string;
  estimated_resolution: string;
  description: string;
}

export const AdminOutagesPage: React.FC = () => {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    region: 'South Region',
    city: 'Bengaluru',
    affectedService: '5G Data & VoLTE Voice',
    networkType: '5G',
    severity: 'MAJOR' as 'MINOR' | 'MAJOR' | 'CRITICAL',
    status: 'INVESTIGATING' as 'INVESTIGATING' | 'IDENTIFIED' | 'IN_PROGRESS' | 'RESOLVED',
    estimatedResolution: '2 hours',
    description: 'Tower node degradation impacting mobile internet connectivity in Whitefield & Electronic City sectors.',
  });

  useEffect(() => {
    loadOutages();
  }, []);

  const loadOutages = async () => {
    try {
      const res = await api.get<Outage[]>('/api/v1/network/outages');
      setOutages(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOutage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/api/v1/network/outages', formData);
      setFeedback(`Incident broadcasted for ${formData.city} (${formData.severity})! AI Bot will proactively notify affected subscribers.`);
      setShowCreateModal(false);
      await loadOutages();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to create outage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (outageId: string, newStatus: string) => {
    setUpdatingId(outageId);
    setFeedback(null);
    try {
      await api.put(`/api/v1/network/outages/${outageId}`, {
        status: newStatus,
        estimatedResolution: newStatus === 'RESOLVED' ? 'Resolved' : '1 hour',
      });
      setFeedback(`Outage ${outageId} status updated to ${newStatus}.`);
      await loadOutages();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to update outage status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeOutages = outages.filter((o) => o.status !== 'RESOLVED');
  const criticalCount = activeOutages.filter((o) => o.severity === 'CRITICAL').length;
  const inProgressCount = activeOutages.filter((o) => o.status === 'IN_PROGRESS').length;

  if (loading) {
    return <LoadingState message="Polling regional cellular towers and Network Operations Center (NOC)..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Network Incidents & Regional Outages</h1>
          <p className="page-subtitle">Cellular tower monitoring, proactive outage advisories, and AI resolution routing</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Broadcast Network Outage
        </button>
      </div>

      {feedback && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            background: feedback.includes('broadcasted') || feedback.includes('updated') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            borderColor: feedback.includes('broadcasted') || feedback.includes('updated') ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.includes('broadcasted') || feedback.includes('updated') ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={20} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem' }}>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card" style={{ borderColor: activeOutages.length > 0 ? 'rgba(244, 63, 94, 0.3)' : undefined }}>
          <div className="metric-header">
            <span>Active Disruptions</span>
            <AlertTriangle size={18} style={{ color: activeOutages.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value" style={{ color: activeOutages.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {activeOutages.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Affecting subscriber connectivity
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Critical Severity</span>
            <Activity size={18} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <div className="metric-value" style={{ color: criticalCount > 0 ? 'var(--accent-rose)' : 'inherit' }}>
            {criticalCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            High impact tower failure
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>In-Progress Restorations</span>
            <RefreshCw size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>{inProgressCount}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Field engineering crews dispatched
          </div>
        </div>
      </div>

      {/* Outage Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {outages.map((outage) => {
          const isCritical = outage.severity === 'CRITICAL';
          const isMajor = outage.severity === 'MAJOR';
          const isResolved = outage.status === 'RESOLVED';

          return (
            <div
              key={outage.outage_id}
              className="card"
              style={{
                borderColor: isResolved
                  ? 'var(--border-subtle)'
                  : isCritical
                  ? 'rgba(244, 63, 94, 0.5)'
                  : isMajor
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'var(--border-active)',
                background: isResolved
                  ? 'var(--bg-card)'
                  : isCritical
                  ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.1), var(--bg-card))'
                  : 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <MapPin size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{outage.city}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>({outage.region})</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ID: {outage.outage_id} • {outage.network_type}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span
                    className={`badge ${
                      isCritical ? 'badge-danger' : isMajor ? 'badge-warning' : 'badge-info'
                    }`}
                  >
                    {outage.severity}
                  </span>
                  <StatusBadge status={outage.status} />
                </div>
              </div>

              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                {outage.description}
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Service: </span>
                  <span style={{ fontWeight: 600 }}>{outage.affected_service}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>ETA: </span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>{outage.estimated_resolution}</span>
                </div>
              </div>

              {/* Status Action Buttons */}
              {!isResolved && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {outage.status !== 'IN_PROGRESS' && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      disabled={updatingId === outage.outage_id}
                      onClick={() => handleUpdateStatus(outage.outage_id, 'IN_PROGRESS')}
                    >
                      <RefreshCw size={13} /> Mark In Progress
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    disabled={updatingId === outage.outage_id}
                    onClick={() => handleUpdateStatus(outage.outage_id, 'RESOLVED')}
                  >
                    <CheckCircle2 size={13} /> Mark Resolved
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Broadcast Outage Modal */}
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
              maxWidth: '560px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-active)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--accent-rose)' }} />
                <h3 style={{ fontSize: '1.2rem' }}>Broadcast Regional Outage Incident</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOutage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label">City / Circle</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Telecom Region</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label className="label">Severity Level</label>
                  <select
                    className="input"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  >
                    <option value="CRITICAL">CRITICAL (Total blackout)</option>
                    <option value="MAJOR">MAJOR (Degraded speeds/VoLTE)</option>
                    <option value="MINOR">MINOR (Intermittent loss)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Network Technology</label>
                  <select
                    className="input"
                    value={formData.networkType}
                    onChange={(e) => setFormData({ ...formData, networkType: e.target.value })}
                  >
                    <option value="5G">5G Standalone</option>
                    <option value="4G">4G LTE Core</option>
                    <option value="FIBER">Fiber Broadband</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Affected Services</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.affectedService}
                  onChange={(e) => setFormData({ ...formData, affectedService: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Estimated Resolution Time (ETA)</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.estimatedResolution}
                  onChange={(e) => setFormData({ ...formData, estimatedResolution: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Incident Description / Dispatch Notes</label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Radio size={16} /> {submitting ? 'Broadcasting...' : 'Broadcast Outage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
