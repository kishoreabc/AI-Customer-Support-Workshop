import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

interface BillBreakdown {
  base_plan?: number;
  data_addon?: number;
  roaming?: number;
  taxes?: number;
  discount?: number;
  [key: string]: any;
}

interface Bill {
  bill_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
  breakdown: BillBreakdown;
  created_at: string;
}

export const BillsPage: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const res = await api.get<Bill[]>('/api/v1/bills/me');
      setBills(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async (billId: string) => {
    setPayingId(billId);
    setFeedback(null);
    try {
      await api.post(`/api/v1/bills/${billId}/pay`, {});
      setFeedback(`Payment of bill ${billId} confirmed successfully via UPI Instant Settlement!`);
      await loadBills();
      if (selectedBill && selectedBill.bill_id === billId) {
        setSelectedBill({ ...selectedBill, status: 'PAID' });
      }
    } catch (err: any) {
      setFeedback(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching your telecom statements and bills..." />;
  }

  const unpaidBills = bills.filter((b) => b.status !== 'PAID');
  const totalDue = unpaidBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  const lastPaidBill = bills.find((b) => b.status === 'PAID');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills & Invoices</h1>
          <p className="page-subtitle">Itemized postpaid statements, monthly tariff charges, and instant digital payments</p>
        </div>
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

      {/* Summary KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Outstanding Amount</span>
            <DollarSign size={18} style={{ color: totalDue > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value" style={{ color: totalDue > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
            ₹{totalDue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {unpaidBills.length === 0 ? 'All current invoices cleared' : `${unpaidBills.length} invoice pending`}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Last Payment</span>
            <CheckCircle2 size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="metric-value" style={{ fontSize: '1.4rem' }}>
            {lastPaidBill ? `₹${lastPaidBill.amount.toLocaleString()}` : 'None'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {lastPaidBill ? `Paid on ${new Date(lastPaidBill.created_at).toLocaleDateString()}` : 'No payment records'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Billing Cycle</span>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value" style={{ fontSize: '1.4rem' }}>
            Monthly 1st
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Auto-generated invoice on cycle close
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={18} style={{ color: 'var(--accent-primary)' }} /> Statement History
        </h2>

        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No billing statements generated yet. Statements will appear after your first billing cycle.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Billing Cycle</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.bill_id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {bill.bill_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {new Date(bill.billing_period_start).toLocaleDateString()} -{' '}
                        {new Date(bill.billing_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(bill.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        ₹{bill.amount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={bill.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedBill(bill)}
                        >
                          <FileText size={14} /> Itemized Breakdown
                        </button>
                        {bill.status !== 'PAID' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            disabled={payingId === bill.bill_id}
                            onClick={() => handlePayBill(bill.bill_id)}
                          >
                            <CreditCard size={14} />
                            {payingId === bill.bill_id ? 'Settling...' : 'Pay Now'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Itemized Modal */}
      {selectedBill && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
            backdropFilter: 'var(--backdrop-blur)',
          }}
          onClick={() => setSelectedBill(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-active)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.2rem' }}>Invoice #{selectedBill.bill_id}</h3>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Period:</span>
                <span>
                  {new Date(selectedBill.billing_period_start).toLocaleDateString()} to{' '}
                  {new Date(selectedBill.billing_period_end).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Due Date:</span>
                <span>{new Date(selectedBill.due_date).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Status:</span>
                <StatusBadge status={selectedBill.status} />
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Itemized Charges</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Base Plan Rental (Unlimited 5G)</span>
                <span>₹{(selectedBill.breakdown?.base_plan ?? selectedBill.amount * 0.8).toFixed(2)}</span>
              </div>
              {selectedBill.breakdown?.data_addon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span>5G Speed Boost Add-on</span>
                  <span>₹{selectedBill.breakdown.data_addon.toFixed(2)}</span>
                </div>
              )}
              {selectedBill.breakdown?.roaming && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span>National Roaming Usage</span>
                  <span>₹{selectedBill.breakdown.roaming.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Taxes & Regulatory Fees (18% GST)</span>
                <span>₹{(selectedBill.breakdown?.taxes ?? selectedBill.amount * 0.18).toFixed(2)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '10px',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)',
                }}
              >
                <span>Total Payable</span>
                <span>₹{selectedBill.amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedBill(null)}>
                Close
              </button>
              {selectedBill.status !== 'PAID' && (
                <button
                  className="btn btn-primary"
                  disabled={payingId === selectedBill.bill_id}
                  onClick={() => handlePayBill(selectedBill.bill_id)}
                >
                  <CreditCard size={16} /> Pay ₹{selectedBill.amount.toLocaleString()} Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
