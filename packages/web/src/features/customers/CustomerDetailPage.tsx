import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { DataTable, Column } from '../../components/DataTable.js';
import {
  ArrowLeft,
  ShoppingBag,
  MessageSquare,
  LifeBuoy,
  Tag,
  Save,
  Check,
} from 'lucide-react';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'conversations' | 'tickets'>('orders');
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomerData(id);
    }
  }, [id]);

  const loadCustomerData = async (customerId: string) => {
    setLoading(true);
    try {
      const [cust, ords, convs, tix] = await Promise.all([
        api.get<any>(`/api/v1/customers/${customerId}`),
        api.get<any>(`/api/v1/customers/${customerId}/orders`),
        api.get<any>(`/api/v1/customers/${customerId}/conversations`),
        api.get<any>(`/api/v1/customers/${customerId}/tickets`),
      ]);

      setCustomer(cust);
      setInternalNotes(cust.notes || '');
      setOrders(ords || []);
      setConversations(convs || []);
      setTickets(tix || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await api.put(`/api/v1/customers/${id}`, { notes: internalNotes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading || !customer) {
    return <LoadingState message="Loading customer dossier..." />;
  }

  const orderColumns: Column<any>[] = [
    { key: 'order_id', header: 'Order ID', render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.order_id}</strong> },
    { key: 'order_date', header: 'Date', render: (r) => new Date(r.order_date).toLocaleDateString() },
    { key: 'order_status', header: 'Shipment Status', render: (r) => <StatusBadge status={r.order_status} /> },
    { key: 'payment_status', header: 'Payment', render: (r) => <StatusBadge status={r.payment_status} /> },
    { key: 'total_amount', header: 'Total', render: (r) => `$${r.total_amount?.toFixed(2)}` },
  ];

  const convColumns: Column<any>[] = [
    { key: 'conversation_id', header: 'Session ID', render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>#{r.conversation_id.substring(0, 8)}</strong> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'last_message', header: 'Last Message', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.last_message || '—'}</span> },
    { key: 'updated_at', header: 'Updated', render: (r) => new Date(r.updated_at).toLocaleString() },
  ];

  const ticketColumns: Column<any>[] = [
    { key: 'ticket_id', header: 'Ticket ID', render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.ticket_id}</strong> },
    { key: 'subject', header: 'Subject', render: (r) => <strong>{r.subject}</strong> },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', header: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="page-container">
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/customers')} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={14} /> Back to Customers
      </button>

      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <div className="avatar-circle" style={{ width: '64px', height: '64px', fontSize: '1.6rem' }}>
              {customer.first_name?.[0] || 'C'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                {customer.first_name} {customer.last_name}
              </h1>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{customer.email}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{customer.phone || 'No phone'}</span>
                <StatusBadge status={customer.customer_status} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer ID</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{customer.customer_id}</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <Tag size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tags:</span>
          {customer.tags?.map((tag: string, idx: number) => (
            <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 2-Column Grid: Customer Dossier & Activity Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Dossier Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>Address & Location</h3>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <div>{customer.address || 'No street address on file'}</div>
              <div>{[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')}</div>
              <div>{customer.country || 'USA'}</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem' }}>Internal Support Notes</h3>
              {notesSaved && <span style={{ color: '#34d399', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Saved</span>}
            </div>
            <textarea
              className="textarea"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private notes for agents..."
              style={{ minHeight: '120px', fontSize: '0.85rem' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop: '10px', width: '100%' }}>
              <Save size={14} /> {savingNotes ? 'Saving...' : 'Update Notes'}
            </button>
          </div>
        </div>

        {/* Right Activity Tabs */}
        <div>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'orders' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'orders' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShoppingBag size={16} /> Orders ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('conversations')}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'conversations' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'conversations' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={16} /> Conversations ({conversations.length})
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'tickets' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'tickets' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <LifeBuoy size={16} /> Support Tickets ({tickets.length})
            </button>
          </div>

          {activeTab === 'orders' && (
            <DataTable
              columns={orderColumns}
              data={orders}
              emptyTitle="No Orders"
              emptyDescription="This customer has not placed any orders yet."
            />
          )}

          {activeTab === 'conversations' && (
            <DataTable
              columns={convColumns}
              data={conversations}
              onRowClick={(r) => navigate(`/admin/conversations?id=${r.conversation_id}`)}
              emptyTitle="No Conversations"
              emptyDescription="No support chats found for this customer."
            />
          )}

          {activeTab === 'tickets' && (
            <DataTable
              columns={ticketColumns}
              data={tickets}
              emptyTitle="No Support Tickets"
              emptyDescription="This customer currently has no logged support tickets."
            />
          )}
        </div>
      </div>
    </div>
  );
};
