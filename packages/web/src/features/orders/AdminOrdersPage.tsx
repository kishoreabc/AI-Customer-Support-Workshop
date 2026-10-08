import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { Edit, Truck } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const [editStatus, setEditStatus] = useState('CONFIRMED');
  const [editPaymentStatus, setEditPaymentStatus] = useState('PAID');
  const [editTracking, setEditTracking] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, search, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/orders?page=${page}&pageSize=15&search=${encodeURIComponent(search)}&status=${statusFilter}`
      );
      setOrders(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setEditStatus(order.order_status);
    setEditPaymentStatus(order.payment_status);
    setEditTracking(order.tracking_number || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/orders/${selectedOrder.order_id}/status`, {
        orderStatus: editStatus,
        paymentStatus: editPaymentStatus,
        trackingNumber: editTracking,
      });
      setSelectedOrder(null);
      loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'order_id', header: 'Order #', render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.order_id}</strong> },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <div>{r.customer_first_name} {r.customer_last_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.customer_email}</div>
        </div>
      ),
    },
    { key: 'order_status', header: 'Order Status', render: (r) => <StatusBadge status={r.order_status} /> },
    { key: 'payment_status', header: 'Payment', render: (r) => <StatusBadge status={r.payment_status} /> },
    { key: 'total_amount', header: 'Total', render: (r) => <strong>${r.total_amount?.toFixed(2)}</strong> },
    {
      key: 'tracking_number',
      header: 'Tracking',
      render: (r) => r.tracking_number ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{r.tracking_number}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    { key: 'order_date', header: 'Date', render: (r) => new Date(r.order_date).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEdit(r, e)}>
          <Edit size={14} /> Update
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">Track fulfillment progress, attach tracking numbers, and update shipment statuses.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order ID, customer, or tracking..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Order Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      <DataTable columns={columns} data={orders} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Edit Order Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Update Order: ${selectedOrder.order_id}`}
        >
          <form onSubmit={handleUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Order Fulfillment Status</label>
                <select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="select" value={editPaymentStatus} onChange={(e) => setEditPaymentStatus(e.target.value)}>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Carrier Tracking Number</label>
              <div style={{ position: 'relative' }}>
                <Truck size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)' }}
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value)}
                  placeholder="e.g. TRK-FEDEX-123456"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
