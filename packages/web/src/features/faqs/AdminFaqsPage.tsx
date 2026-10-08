import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

export const AdminFaqsPage: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Returns & Refunds',
    status: 'PUBLISHED',
  });

  useEffect(() => {
    loadFaqs();
  }, [page, search, categoryFilter]);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/faqs?page=${page}&pageSize=12&search=${encodeURIComponent(search)}&category=${categoryFilter}`
      );
      setFaqs(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingFaq(null);
    setFormData({ question: '', answer: '', category: 'Returns & Refunds', status: 'PUBLISHED' });
    setModalOpen(true);
  };

  const handleOpenEdit = (f: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFaq(f);
    setFormData({
      question: f.question,
      answer: f.answer,
      category: f.category,
      status: f.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        await api.put(`/api/v1/faqs/${editingFaq.faq_id}`, formData);
      } else {
        await api.post('/api/v1/faqs', formData);
      }
      setModalOpen(false);
      loadFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (f: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete FAQ "${f.question}"?`)) return;
    try {
      await api.delete(`/api/v1/faqs/${f.faq_id}`);
      loadFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'question',
      header: 'Question & Answer',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{r.question}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.answer}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="badge badge-neutral">{r.category}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'updated_at', header: 'Updated', render: (r) => new Date(r.updated_at).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEdit(r, e)}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(r, e)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">FAQ Management</h1>
          <p className="page-subtitle">Configure frequently asked questions consulted by the AI agent prior to response generation.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <PlusCircle size={18} /> Add New FAQ
        </button>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search FAQs..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Returns & Refunds">Returns & Refunds</option>
          <option value="Shipping">Shipping</option>
          <option value="Warranty">Warranty</option>
          <option value="Support">Support</option>
          <option value="Orders">Orders</option>
        </select>
      </div>

      <DataTable columns={columns} data={faqs} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* FAQ Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input
              type="text"
              className="input"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Returns & Refunds">Returns & Refunds</option>
                <option value="Shipping">Shipping</option>
                <option value="Warranty">Warranty</option>
                <option value="Support">Support</option>
                <option value="Orders">Orders</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Official Answer *</label>
            <textarea
              className="textarea"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              style={{ minHeight: '120px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingFaq ? 'Save Changes' : 'Create FAQ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
