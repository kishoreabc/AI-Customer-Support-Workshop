import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { LoadingState } from '../../components/LoadingState.js';
import { Wifi, Zap, Calendar, Phone, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

export const MyPlanPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const res = await api.get<any[]>('/api/v1/subscriptions/me');
      setSubscriptions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Retrieving your active subscription..." />;
  }

  const activeSub = subscriptions.find((s) => s.status === 'ACTIVE');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Mobile Plan</h1>
          <p className="page-subtitle">Manage your active tariff subscription, validity, and plan perks</p>
        </div>
        <div>
          <Link to="/recharge" className="btn btn-primary">
            <Zap size={16} /> Upgrade / Change Plan
          </Link>
        </div>
      </div>

      {activeSub ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Active Plan Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 27, 44, 0.9), rgba(13, 18, 30, 0.95))',
              borderColor: 'rgba(99, 102, 241, 0.3)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '8px', display: 'inline-block' }}>
                  ACTIVE TARIFF
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{activeSub.plan_name}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Mobile Number: <strong style={{ color: 'var(--text-primary)' }}>{activeSub.mobile_number}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  ₹{activeSub.price}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeSub.validity_days} Days Pack</div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <Wifi size={14} style={{ color: 'var(--accent-primary)' }} /> High-Speed Data
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{activeSub.data_allowance}</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <Phone size={14} style={{ color: 'var(--accent-emerald)' }} /> Voice Calls
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{activeSub.voice_allowance}</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <MessageSquare size={14} style={{ color: 'var(--accent-purple)' }} /> SMS Quota
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{activeSub.sms_allowance}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Calendar size={16} style={{ color: 'var(--accent-amber)' }} />
                <span>
                  Expires on:{' '}
                  <strong>{new Date(activeSub.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Auto-Renew: <strong style={{ color: '#34d399' }}>{activeSub.auto_renew ? 'Enabled' : 'Disabled'}</strong>
              </div>
            </div>
          </div>

          {/* Quick Perks Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Included Benefits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>Unlimited True 5G data at zero extra cost</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>Free National Roaming across all circles</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>Complimentary OTT Entertainment subscriptions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>24/7 AI-Powered Priority Technical Support</span>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link to="/usage" className="btn btn-secondary" style={{ width: '100%' }}>
                <span>View Real-Time Usage</span> <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Wifi size={36} style={{ color: 'var(--accent-amber)', marginBottom: '12px' }} />
          <h2>No Active Plan</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            You do not currently have an active mobile pack. Recharge to restore high-speed 5G connectivity.
          </p>
          <Link to="/recharge" className="btn btn-primary">
            Choose a Plan
          </Link>
        </div>
      )}

      {/* Plan History */}
      {subscriptions.length > 1 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Subscription History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {subscriptions.map((sub) => (
              <div
                key={sub.subscription_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{sub.plan_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Activated: {new Date(sub.activation_date).toLocaleDateString()} &bull; Expired: {new Date(sub.expiry_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 700 }}>₹{sub.price}</span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
