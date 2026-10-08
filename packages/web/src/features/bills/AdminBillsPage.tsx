import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Receipt,
  Search,
  DollarSign,
  Calendar,
  FileText,
  X,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface BillItem {
  bill_id: string;
  customer_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  amount: number;
  currency: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
  breakdown: Record<string, any>;
  created_at: string;
}

export const AdminBillsPage: React.FC = () => {
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillItem | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const res = await api.get<BillItem[]>('/api/v1/bills');
      setBills(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bills.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.bill_id.toLowerCase().includes(q) ||
      (b.first_name && b.first_name.toLowerCase().includes(q)) ||
      (b.last_name && b.last_name.toLowerCase().includes(q)) ||
      (b.email && b.email.toLowerCase().includes(q))
    );
  });

  const totalInvoiced = bills.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalPaid = bills.filter((b) => b.status === 'PAID').reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalOutstanding = bills.filter((b) => b.status !== 'PAID').reduce((acc, b) => acc + (b.amount || 0), 0);

  if (loading) {
    return <LoadingState message="Loading subscriber invoicing and revenue ledger..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Postpaid Billing & Receivables</h1>
          <p className="page-subtitle">Itemized postpaid invoice statements, due collection cycles, and payment reconciliations</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Invoiced</span>
            <Receipt size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="metric-value">₹{totalInvoiced.toLocaleString()}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Across {bills.length} generated statements
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Collected Revenue</span>
            <DollarSign size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {((totalPaid / (totalInvoiced || 1)) * 100).toFixed(0)}% collection efficiency
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Outstanding Receivable</span>
            <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="metric-value" style={{ color: totalOutstanding > 0 ? 'var(--accent-amber)' : 'inherit' }}>
            ₹{totalOutstanding.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Pending subscriber settlement
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
            placeholder="Search by invoice ID, subscriber name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* Bills Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Subscriber</th>
                <th>Cycle Period</th>
                <th>Due Date</th>
                <th>Total Invoiced</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No billing records found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.bill_id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{b.bill_id}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {b.first_name ? `${b.first_name} ${b.last_name || ''}` : 'Subscriber'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {new Date(b.billing_period_start).toLocaleDateString()} -{' '}
                        {new Date(b.billing_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(b.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>₹{b.amount.toLocaleString()}</span>
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedBill(b)}
                      >
                        <FileText size={14} /> Itemized Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <h3 style={{ fontSize: '1.2rem' }}>Statement #{selectedBill.bill_id}</h3>
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
                <span style={{ color: 'var(--text-secondary)' }}>Subscriber:</span>
                <span>{selectedBill.first_name} {selectedBill.last_name} ({selectedBill.email})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Billing Cycle:</span>
                <span>
                  {new Date(selectedBill.billing_period_start).toLocaleDateString()} to{' '}
                  {new Date(selectedBill.billing_period_end).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <StatusBadge status={selectedBill.status} />
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', color: 'var(--text-primary)' }}>Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Base Plan Rental</span>
                <span>₹{(selectedBill.breakdown?.base_plan ?? selectedBill.amount * 0.8).toFixed(2)}</span>
              </div>
              {selectedBill.breakdown?.data_addon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span>5G Data Add-on</span>
                  <span>₹{selectedBill.breakdown.data_addon.toFixed(2)}</span>
                </div>
              )}
              {selectedBill.breakdown?.roaming && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <span>National Roaming</span>
                  <span>₹{selectedBill.breakdown.roaming.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Taxes & GST (18%)</span>
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
                }}
              >
                <span>Total Amount</span>
                <span>₹{selectedBill.amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedBill(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
