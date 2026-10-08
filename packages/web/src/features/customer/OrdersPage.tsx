import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { Package, Truck, Calendar } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/api/v1/orders?page=${page}&pageSize=10&search=${encodeURIComponent(search)}`);
      setOrders(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'order_id',
      header: 'Order #',
      render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.order_id}</strong>,
    },
    {
      key: 'order_date',
      header: 'Date Placed',
      render: (r) => new Date(r.order_date).toLocaleDateString(),
    },
    {
      key: 'order_status',
      header: 'Shipment Status',
      render: (r) => <StatusBadge status={r.order_status} />,
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (r) => <StatusBadge status={r.payment_status} />,
    },
    {
      key: 'total_amount',
      header: 'Total',
      render: (r) => <strong>${r.total_amount?.toFixed(2)} {r.currency}</strong>,
    },
    {
      key: 'tracking_number',
      header: 'Tracking',
      render: (r) => (
        r.tracking_number ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
            {r.tracking_number}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Pending</span>
        )
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track parcel progress, view receipts, and inspect purchased items.</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by order or tracking number..." />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={(r) => setSelectedOrder(r)}
        emptyTitle="No orders placed yet"
        emptyDescription="Any completed store checkouts will appear here."
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order Details: ${selectedOrder.order_id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span className="form-label">Status</span>
                <StatusBadge status={selectedOrder.order_status} />
              </div>
              <div>
                <span className="form-label">Payment</span>
                <StatusBadge status={selectedOrder.payment_status} />
              </div>
              <div>
                <span className="form-label">Date Placed</span>
                <span>{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="form-label">Estimated Delivery</span>
                <span>{selectedOrder.estimated_delivery_date ? new Date(selectedOrder.estimated_delivery_date).toLocaleDateString() : 'Pending dispatch'}</span>
              </div>
            </div>

            <div>
              <span className="form-label">Delivery Address</span>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedOrder.shipping_address}</p>
            </div>

            {selectedOrder.tracking_number && (
              <div>
                <span className="form-label">Carrier Tracking Number</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                  <Truck size={16} />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.tracking_number}</span>
                </div>
              </div>
            )}

            <div>
              <span className="form-label">Ordered Items</span>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {selectedOrder.items?.map((item: any) => (
                  <div
                    key={item.order_item_id || item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Qty: {item.quantity} × ${item.unit_price?.toFixed(2)}
                      </div>
                    </div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      ${(item.total_price || item.quantity * item.unit_price)?.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Grand Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ${selectedOrder.total_amount?.toFixed(2)} {selectedOrder.currency}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
