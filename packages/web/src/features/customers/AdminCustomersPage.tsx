import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle, ExternalLink, UserX, UserCheck } from 'lucide-react';

export const AdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    notes: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, [page, search, statusFilter]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/customers?page=${page}&pageSize=15&search=${encodeURIComponent(search)}&status=${statusFilter}`
      );
      setCustomers(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/v1/customers', formData);
      setAddModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', city: '', state: '', notes: '' });
      loadCustomers();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (customer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = customer.customer_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/api/v1/customers/${customer.customer_id}`, {
        customerStatus: newStatus,
      });
      loadCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{r.first_name} {r.last_name}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'customer_status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.customer_status} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (r) => r.phone || '—',
    },
    {
      key: 'location',
      header: 'Location',
      render: (r) => [r.city, r.state].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'account_created_at',
      header: 'Joined',
      render: (r) => new Date(r.account_created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/customers/${r.customer_id}`);
            }}
          >
            <ExternalLink size={14} /> Profile
          </button>
          <button
            className={`btn btn-sm ${r.customer_status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={(e) => handleToggleStatus(r, e)}
            title={r.customer_status === 'ACTIVE' ? 'Deactivate Customer' : 'Reactivate Customer'}
          >
            {r.customer_status === 'ACTIVE' ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">Inspect customer records, account statuses, orders, and support engagements.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
          <PlusCircle size={18} /> Add New Customer
        </button>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, or phone..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        onRowClick={(r) => navigate(`/admin/customers/${r.customer_id}`)}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add Customer Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Customer Record">
        <form onSubmit={handleCreateCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="input"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="input"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Internal Support Notes</label>
            <textarea
              className="textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Private agent notes..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
