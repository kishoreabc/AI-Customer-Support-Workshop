import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle, Edit, UserCheck, UserX } from 'lucide-react';

export const AdminAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'General Support',
    role: 'SUPPORT_AGENT',
    password: 'agent123',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/api/v1/agents');
      setAgents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      email: '',
      department: 'Tier 2 Technical Support',
      role: 'SUPPORT_AGENT',
      password: 'agent123',
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (a: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAgent(a);
    setFormData({
      name: a.name,
      email: a.email,
      department: a.department,
      role: a.role,
      password: '',
      status: a.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAgent) {
        await api.put(`/api/v1/agents/${editingAgent.agent_id}`, {
          name: formData.name,
          department: formData.department,
          status: formData.status,
        });
      } else {
        await api.post('/api/v1/agents', formData);
      }
      setModalOpen(false);
      loadAgents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (a: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = a.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/api/v1/agents/${a.agent_id}`, { status: newStatus });
      loadAgents();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Specialist',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{r.name}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.email}</div>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (r) => <span className="badge badge-neutral">{r.department}</span> },
    { key: 'role', header: 'Role', render: (r) => <StatusBadge status={r.role} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'workload',
      header: 'Current Workload',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-warning" title="Open Tickets assigned">
            {r.active_tickets || 0} Tickets
          </span>
          <span className="badge badge-info" title="Active live handoffs">
            {r.active_handoffs || 0} Handoffs
          </span>
        </div>
      ),
    },
    { key: 'last_active_at', header: 'Last Active', render: (r) => r.last_active_at ? new Date(r.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never' },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEdit(r, e)}>
            <Edit size={14} /> Edit
          </button>
          <button
            className={`btn btn-sm ${r.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={(e) => handleToggleStatus(r, e)}
            title={r.status === 'ACTIVE' ? 'Deactivate Agent' : 'Reactivate Agent'}
          >
            {r.status === 'ACTIVE' ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Specialist Staff</h1>
          <p className="page-subtitle">Manage human support personnel, departments, and active ticket distribution.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <PlusCircle size={18} /> Add Support Agent
        </button>
      </div>

      <DataTable columns={columns} data={agents} loading={loading} />

      {/* Agent Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAgent ? 'Edit Support Agent' : 'Add Support Specialist'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Company Email *</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={Boolean(editingAgent)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="input"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {!editingAgent && (
            <div className="form-group">
              <label className="form-label">Temporary Password *</label>
              <input
                type="password"
                className="input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingAgent ? 'Save Changes' : 'Create Agent Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
