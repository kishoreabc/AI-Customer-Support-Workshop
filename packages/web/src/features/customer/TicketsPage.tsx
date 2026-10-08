import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle } from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/api/v1/tickets?page=${page}&pageSize=10&search=${encodeURIComponent(search)}`);
      setTickets(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/v1/tickets', {
        subject: newSubject,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
      });
      setCreateModalOpen(false);
      setNewSubject('');
      setNewDescription('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'ticket_id',
      header: 'Ticket #',
      render: (r) => <strong style={{ color: 'var(--accent-primary)' }}>{r.ticket_id}</strong>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (r) => (
        <span style={{ fontWeight: 600 }}>{r.subject}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => <span className="badge badge-neutral">{r.category}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (r) => <StatusBadge status={r.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'created_at',
      header: 'Submitted',
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Support Tickets</h1>
          <p className="page-subtitle">Track tickets escalated from AI conversations or submitted directly.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
          <PlusCircle size={18} /> Submit New Ticket
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        onRowClick={(r) => setSelectedTicket(r)}
        emptyTitle="No support tickets"
        emptyDescription="All resolved and active support tickets will appear here."
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket: ${selectedTicket.ticket_id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusBadge status={selectedTicket.status} />
              <StatusBadge status={selectedTicket.priority} />
              <span className="badge badge-neutral">{selectedTicket.category}</span>
            </div>

            <div>
              <span className="form-label">Subject</span>
              <h4 style={{ fontSize: '1.1rem' }}>{selectedTicket.subject}</h4>
            </div>

            <div>
              <span className="form-label">Description & Inquiry</span>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                {selectedTicket.description}
              </div>
            </div>

            {selectedTicket.escalation_reason && (
              <div>
                <span className="form-label">Escalation Trigger</span>
                <p style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>{selectedTicket.escalation_reason}</p>
              </div>
            )}

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Submitted on {new Date(selectedTicket.created_at).toLocaleString()}
              {selectedTicket.resolved_at && ` • Resolved on ${new Date(selectedTicket.resolved_at).toLocaleString()}`}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Ticket Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Submit New Support Ticket"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Issue Subject *</label>
            <input
              type="text"
              className="input"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Brief summary of your request..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                <option value="GENERAL">General Inquiry</option>
                <option value="SHIPPING">Shipping & Delivery</option>
                <option value="BILLING">Billing & Refund</option>
                <option value="TECHNICAL">Technical Troubleshooting</option>
                <option value="WARRANTY">Warranty & Replacement</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description *</label>
            <textarea
              className="textarea"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe your issue with relevant details..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
