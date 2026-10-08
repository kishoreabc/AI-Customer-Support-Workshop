import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/DataTable.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { SearchBar } from '../../components/SearchBar.js';
import { Pagination } from '../../components/Pagination.js';
import { Modal } from '../../components/Modal.js';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Laptops',
    price: 999,
    stockQuantity: 20,
    availabilityStatus: 'IN_STOCK',
    description: '',
    warrantyInformation: '',
    returnPolicy: '30-Day Standard Returns',
  });

  useEffect(() => {
    loadProducts();
  }, [page, search, categoryFilter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(
        `/api/v1/products?page=${page}&pageSize=12&search=${encodeURIComponent(search)}&category=${categoryFilter}`
      );
      setProducts(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: 'Laptops',
      price: 999,
      stockQuantity: 20,
      availabilityStatus: 'IN_STOCK',
      description: '',
      warrantyInformation: '1-Year Limited Warranty',
      returnPolicy: '30-Day Returns in original packaging',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      stockQuantity: p.stock_quantity,
      availabilityStatus: p.availability_status,
      description: p.description,
      warrantyInformation: p.warranty_information,
      returnPolicy: p.return_policy,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/api/v1/products/${editingProduct.product_id}`, formData);
      } else {
        await api.post('/api/v1/products', formData);
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscontinue = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Discontinue product ${p.name}?`)) return;
    try {
      await api.delete(`/api/v1/products/${p.product_id}`);
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>{r.name}</strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.sku}</div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="badge badge-neutral">{r.category}</span> },
    { key: 'price', header: 'Price', render: (r) => <strong>${r.price?.toFixed(2)}</strong> },
    { key: 'stock_quantity', header: 'In Stock', render: (r) => <span>{r.stock_quantity} units</span> },
    { key: 'availability_status', header: 'Availability', render: (r) => <StatusBadge status={r.availability_status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={(e) => handleOpenEdit(r, e)}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={(e) => handleDiscontinue(r, e)} title="Discontinue product">
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
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">Manage store inventory, warranty policies, and product specifications for the AI assistant.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <PlusCircle size={18} /> Add New Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search products or SKU..." />
        <select
          className="select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Laptops">Laptops</option>
          <option value="Audio">Audio</option>
          <option value="Furniture">Furniture</option>
          <option value="Monitors">Monitors</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      <DataTable columns={columns} data={products} loading={loading} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Product Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input
                type="text"
                className="input"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Laptops">Laptops</option>
                <option value="Audio">Audio</option>
                <option value="Furniture">Furniture</option>
                <option value="Monitors">Monitors</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Quantity</label>
              <input
                type="number"
                className="input"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Warranty Information *</label>
            <textarea
              className="textarea"
              value={formData.warrantyInformation}
              onChange={(e) => setFormData({ ...formData, warrantyInformation: e.target.value })}
              style={{ minHeight: '70px' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Return Policy *</label>
            <input
              type="text"
              className="input"
              value={formData.returnPolicy}
              onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
