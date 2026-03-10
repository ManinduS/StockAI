import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { productsApi } from '../services/api';
import ProductCard from '../components/ProductCard';

const Inventory = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    lowStock: false,
    search: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Grains & Pulses',
    price: 0,
    currentStock: 0,
    reorderPoint: 10,
    reorderQuantity: 50,
    leadTimeDays: 7,
    safetyStock: 10,
    warehouseLocation: 'Main Warehouse',
    status: 'Active'
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll(filters),
        productsApi.getCategories()
      ]);
      setProducts(productsRes.data.products || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
      currentStock: product.currentStock,
      reorderPoint: product.reorderPoint,
      reorderQuantity: product.reorderQuantity,
      leadTimeDays: product.leadTimeDays,
      safetyStock: product.safetyStock,
      warehouseLocation: product.warehouseLocation,
      status: product.status
    });
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      return;
    }

    try {
      await productsApi.delete(product.id || product._id);
      setMessage({ type: 'success', text: 'Product deleted successfully' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete product' });
    }
  };

  const handleStockUpdate = async (productId, adjustment, reason) => {
    await productsApi.updateStock(productId, adjustment, reason);
    setMessage({ type: 'success', text: `Stock ${adjustment > 0 ? 'added' : 'removed'} successfully` });
    loadData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        setMessage({ type: 'success', text: 'Product updated successfully' });
      } else {
        await productsApi.create(formData);
        setMessage({ type: 'success', text: 'Product created successfully' });
      }
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Operation failed' });
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: 'Grains & Pulses',
      price: 0,
      currentStock: 0,
      reorderPoint: 10,
      reorderQuantity: 50,
      leadTimeDays: 7,
      safetyStock: 10,
      warehouseLocation: 'Main Warehouse',
      status: 'Active'
    });
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          Loading inventory...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">Manage your product catalog and stock levels</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Actions Bar */}
      <div className="actions-bar">
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Add Product
          </button>
        )}
        
        <input
          type="text"
          className="form-input"
          placeholder="Search products..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ width: '250px' }}
        />
        
        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          style={{ width: '180px' }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ width: '150px' }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Discontinued">Discontinued</option>
          <option value="Backordered">Backordered</option>
        </select>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => setFilters({ ...filters, lowStock: e.target.checked })}
          />
          Low Stock Only
        </label>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value warning">
            {products.filter(p => p.currentStock <= p.reorderPoint).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value danger">
            {products.filter(p => p.currentStock === 0).length}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
        {products.map((product) => (
          <ProductCard
            key={product.id || product._id}
            product={product}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            onStockUpdate={handleStockUpdate}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No products found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Grains & Pulses">Grains & Pulses</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Oils & Fats">Oils & Fats</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (Rs.)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Point</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lead Time (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 7 })}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Safety Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.safetyStock}
                    onChange={(e) => setFormData({ ...formData, safetyStock: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Backordered">Backordered</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
