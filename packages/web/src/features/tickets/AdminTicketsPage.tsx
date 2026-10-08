import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { Edit, UserPlus, CheckCircle } from 'lucide-react';

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [agents, setAgents] = useState<any[]>([]);

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editAgent, setEditAgent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTickets();
    loadAgents();
  }, [page, search, statusFilter, priorityFilter]);

  const loadAgents = async () => {
    try {
      const data = await api.get<any[]>('/api/v1/agents');
      setAgents(data || []);
    } catch (e) {}
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/tickets?page=${page}&pageSize=15&search=${encodeURIComponent(search)}&status=${statusFilter}&priority=${priorityFilter}`
      );
      setTickets(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(t);
    setEditStatus(t.status);
    setEditPriority(t.priority);
    setEditAgent(t.assigned_agent_id || '');
    setEditNotes(t.internal_notes || '');
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/tickets/${selectedTicket.ticket_id}`, {
        status: editStatus,
        priority: editPriority,
        assignedAgentId: editAgent || null,
        internalNotes: editNotes,
      });
      setSelectedTicket(null);
      loadTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'ticket_id', header: 'Ticket #', render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.ticket_id}</strong> },
    {
      key: 'subject',
      header: 'Subject & Customer',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.subject}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {r.customer_first_name} {r.customer_last_name} ({r.customer_email})
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="badge badge-neutral">{r.category}</span> },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'assigned_agent',
      header: 'Assigned Specialist',
      render: (r) => r.assigned_agent_name ? (
        <span style={{ fontSize: '0.85rem' }}>{r.assigned_agent_name}</span>
      ) : (
        <span style={{ color: 'var(--accent-amber)', fontSize: '0.8rem' }}>Unassigned</span>
      ),
    },
    { key: 'created_at', header: 'Created', render: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Action',
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
          <h1 className="page-title">Support Ticket Management</h1>
          <p className="page-subtitle">Prioritize, assign, and resolve escalated customer cases.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tickets or customers..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          className="select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <DataTable columns={columns} data={tickets} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Ticket Edit Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Manage Ticket: ${selectedTicket.ticket_id}`}
        >
          <form onSubmit={handleSaveTicket}>
            <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customer Inquiry:</div>
              <h4 style={{ fontSize: '1rem', marginTop: '2px' }}>{selectedTicket.subject}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                {selectedTicket.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Ticket Status</label>
                <select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="select" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Support Specialist</label>
              <select className="select" value={editAgent} onChange={(e) => setEditAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Internal Agent Notes</label>
              <textarea
                className="textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Private operational notes (never shown to customer)..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Update Ticket'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
