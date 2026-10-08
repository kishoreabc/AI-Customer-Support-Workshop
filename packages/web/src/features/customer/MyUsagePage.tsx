import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { BarChart3, Wifi, Phone, MessageSquare, AlertTriangle, Zap, Clock } from 'lucide-react';

export const MyUsagePage: React.FC = () => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const res = await api.get<any>('/api/v1/usage/me');
      setUsage(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Measuring live network telemetry..." />;
  }

  const totalData = (usage?.data_used_gb || 0) + (usage?.data_remaining_gb || 0);
  const dataPercent = totalData > 0 ? Math.min(100, Math.round(((usage?.data_used_gb || 0) / totalData) * 100)) : 0;
  const isExhausted = (usage?.data_remaining_gb || 0) <= 0.15;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Real-Time Usage & Data Meters</h1>
          <p className="page-subtitle">Track your high-speed daily data quota, voice minutes, and SMS balance</p>
        </div>
        <div>
          <Link to="/recharge" className="btn btn-primary">
            <Zap size={16} /> Get Data Booster
          </Link>
        </div>
      </div>

      {isExhausted && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid var(--accent-rose)',
            background: 'rgba(244, 63, 94, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <AlertTriangle size={24} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#fda4af' }}>High-Speed Daily Data Exhausted</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Your speed is currently throttled to 64 Kbps until the midnight reset. Recharge with a Data Booster 49
              (6GB) for instant high-speed connectivity.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Data Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Wifi size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>High-Speed Data</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily / Cycle</span>
          </div>

          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {usage?.data_remaining_gb || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>GB Left</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            {usage?.data_used_gb || 0} GB consumed of {totalData.toFixed(1)} GB
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                width: `${dataPercent}%`,
                height: '100%',
                background: isExhausted ? 'var(--accent-rose)' : 'linear-gradient(90deg, #6366f1, #06b6d4)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Clock size={12} />
            <span>Daily limit resets at 12:00 AM IST</span>
          </div>
        </div>

        {/* Voice Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-emerald)',
                }}
              >
                <Phone size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Voice Calls</span>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              UNLIMITED
            </span>
          </div>

          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
            Unlimited
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            {usage?.voice_used_mins || 0} minutes talktime used this cycle
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '4px',
              marginBottom: '14px',
            }}
          />

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Zero roaming charges across India
          </div>
        </div>

        {/* SMS Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-purple)',
                }}
              >
                <MessageSquare size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>SMS Quota</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily</span>
          </div>

          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {usage?.sms_remaining || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Left</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            {usage?.sms_used || 0} of 100 daily SMS sent
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, usage?.sms_used || 0)}%`,
                height: '100%',
                background: 'var(--accent-purple)',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Refreshes daily at 12:00 AM IST
          </div>
        </div>
      </div>
    </div>
  );
};
