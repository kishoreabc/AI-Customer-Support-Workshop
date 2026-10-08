import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { Modal } from '../../components/Modal.js';
import { CreditCard, Wifi, Zap, CheckCircle2, ShieldCheck, Check } from 'lucide-react';

export const RechargePage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [rechargeModalPlan, setRechargeModalPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await api.get<any[]>('/api/v1/plans');
      setPlans(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeModalPlan) return;

    setProcessing(true);
    try {
      await api.post('/api/v1/recharges', {
        planId: rechargeModalPlan.plan_id,
        paymentMethod,
      });

      setSuccessMsg(`Recharge of ₹${rechargeModalPlan.price} successful! Plan "${rechargeModalPlan.name}" is now active on your number.`);
      setRechargeModalPlan(null);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Recharge processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading telecom tariff plans..." />;
  }

  const filteredPlans = plans.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === '5G') return p.is_5g === 1 && p.category === 'UNLIMITED_5G';
    if (selectedCategory === 'MONTHLY') return p.category === 'POPULAR_MONTHLY';
    if (selectedCategory === 'ANNUAL') return p.category === 'ANNUAL';
    if (selectedCategory === 'BOOSTER') return p.category === 'DATA_ADDON';
    if (selectedCategory === 'ROAMING') return p.category === 'INTERNATIONAL_ROAMING';
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Instant Mobile Recharge & Plans</h1>
          <p className="page-subtitle">Choose from True 5G Unlimited, Popular Monthly, and Roaming Tariff Packs</p>
        </div>
      </div>

      {successMsg && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderLeft: '4px solid var(--accent-emerald)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All Plans' },
          { id: '5G', label: 'True 5G Unlimited' },
          { id: 'MONTHLY', label: 'Popular Monthly' },
          { id: 'ANNUAL', label: '365-Day Annual Packs' },
          { id: 'BOOSTER', label: 'Data Boosters' },
          { id: 'ROAMING', label: 'International Roaming' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: selectedCategory === tab.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              background: selectedCategory === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedCategory === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredPlans.map((plan) => (
          <div
            key={plan.plan_id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {plan.is_5g === 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: '#22d3ee',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                5G UNLIMITED
              </div>
            )}

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>{plan.name}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                ₹{plan.price}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Validity: <strong style={{ color: 'var(--text-primary)' }}>{plan.validity_days} Days</strong>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wifi size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>{plan.data_allowance}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
                  <span>{plan.voice_allowance}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span>{plan.sms_allowance}</span>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                {plan.description}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setRechargeModalPlan(plan)}
            >
              <Zap size={16} /> Recharge Now
            </button>
          </div>
        ))}
      </div>

      {/* Recharge Modal */}
      {rechargeModalPlan && (
        <Modal
          title={`Recharge ₹${rechargeModalPlan.price} - ${rechargeModalPlan.name}`}
          isOpen={true}
          onClose={() => setRechargeModalPlan(null)}
        >
          <form onSubmit={handleRecharge}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Plan:</span>
                <strong>{rechargeModalPlan.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Validity:</span>
                <strong>{rechargeModalPlan.validity_days} Days</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Data Allowance:</span>
                <strong>{rechargeModalPlan.data_allowance}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700 }}>Total Payable:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  ₹{rechargeModalPlan.price}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="WALLET">Telecom Wallet Balance</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
              <span>Bank-grade 256-bit encryption. Instant activation upon checkout.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={processing}
                onClick={() => setRechargeModalPlan(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={processing}>
                <CreditCard size={16} />
                <span>{processing ? 'Processing...' : `Pay ₹${rechargeModalPlan.price}`}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
