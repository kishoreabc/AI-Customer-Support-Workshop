import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle, Edit, Trash2, Cpu, Check } from 'lucide-react';

export const AdminKnowledgePage: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Policies',
    content: '',
    status: 'PUBLISHED',
  });

  useEffect(() => {
    loadDocs();
  }, [page, search, categoryFilter]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/knowledge?page=${page}&pageSize=10&search=${encodeURIComponent(search)}&category=${categoryFilter}`
      );
      setDocs(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({ title: '', category: 'Policies', content: '', status: 'PUBLISHED' });
    setModalOpen(true);
  };

  const handleOpenEdit = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      content: doc.content,
      status: doc.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        await api.put(`/api/v1/knowledge/${editingDoc.document_id}`, formData);
      } else {
        await api.post('/api/v1/knowledge', formData);
      }
      setModalOpen(false);
      loadDocs();
      showToast('Document saved & vector embeddings indexed');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete document "${doc.title}"?`)) return;
    try {
      await api.delete(`/api/v1/knowledge/${doc.document_id}`);
      loadDocs();
      showToast('Document deleted and vector embeddings purged');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReindex = async (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setReindexingId(doc.document_id);
    try {
      await api.post(`/api/v1/knowledge/${doc.document_id}/reindex`, {});
      showToast(`Vector embeddings recalculated for "${doc.title}"`);
    } catch (err) {
      console.error(err);
    } finally {
      setReindexingId(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Title & Summary',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{r.title}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.content}
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="badge badge-neutral">{r.category}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_by', header: 'Author', render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.created_by}</span> },
    { key: 'updated_at', header: 'Updated', render: (r) => new Date(r.updated_at).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => handleReindex(r, e)}
            disabled={reindexingId === r.document_id}
            title="Re-compute vector embeddings for RAG"
          >
            <Cpu size={14} /> {reindexingId === r.document_id ? 'Embedding...' : 'Re-index'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEdit(r, e)}>
            <Edit size={14} />
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
          <h1 className="page-title">Knowledge Base & RAG Index</h1>
          <p className="page-subtitle">Manage company policy documentation, technical troubleshooting guides, and vector search embeddings.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <PlusCircle size={18} /> Add Knowledge Document
        </button>
      </div>

      {toastMsg && (
        <div style={{ background: '#064e3b', border: '1px solid #10b981', color: '#a7f3d0', padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search knowledge docs..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Policies">Policies</option>
          <option value="Warranty">Warranty</option>
          <option value="Shipping">Shipping</option>
          <option value="Troubleshooting">Troubleshooting</option>
        </select>
      </div>

      <DataTable columns={columns} data={docs} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Doc Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDoc ? 'Edit Document' : 'Add Knowledge Document'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Document Title *</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Policies">Policies</option>
                <option value="Warranty">Warranty</option>
                <option value="Shipping">Shipping</option>
                <option value="Troubleshooting">Troubleshooting</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Publication Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="PUBLISHED">Published (Active in RAG)</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Document Content (Markdown supported) *</label>
            <textarea
              className="textarea"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              style={{ minHeight: '180px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              placeholder="Paste or write comprehensive policy or troubleshooting guidelines..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingDoc ? 'Update & Re-index' : 'Save & Index Vector Embedding'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
