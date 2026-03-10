import React, { useState, useEffect, useMemo } from 'react';
import { productsApi, salesApi } from '../services/api';

const SalesEntry = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  
  // Form state - use productId (MongoDB _id) for backend compatibility
  const [formData, setFormData] = useState({
    productId: '',
    qty: 1,
    type: 'sale',
    date: new Date().toISOString().split('T')[0]
  });

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    productId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, salesRes] = await Promise.all([
        productsApi.getAll({ limit: 500 }),
        salesApi.getAll({ limit: 50 })
      ]);
      setProducts(productsRes.data.products || []);
      setSales(salesRes.data.sales || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search term
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const term = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  }, [products, productSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // Send productId, quantity, saleType matching backend expectations
      const response = await salesApi.create({
        productId: formData.productId,
        quantity: formData.qty,
        saleType: formData.type,
        notes: `Recorded on ${formData.date}`
      });
      setMessage({
        type: 'success',
        text: `${formData.type === 'sale' ? 'Sale' : 'Return'} recorded! Updated stock: ${response.data.newStock}`
      });
      
      // Reset form
      setFormData({
        ...formData,
        qty: 1
      });

      // Reload sales
      const salesRes = await salesApi.getAll({ limit: 50 });
      setSales(salesRes.data.sales || []);

      // Reload products to get updated stock
      const productsRes = await productsApi.getAll({ limit: 500 });
      setProducts(productsRes.data.products || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to record sale'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadFilteredSales = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.productId) params.productId = filters.productId;
      
      const response = await salesApi.getAll({ ...params, limit: 100 });
      setSales(response.data.sales || []);
    } catch (error) {
      console.error('Filter error:', error);
    }
  };

  const selectedProduct = products.find(p => (p._id || p.id) === formData.productId);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">POS-Lite Sales Entry</h1>
        <p className="page-subtitle">Record sales and returns. Stock automatically updates.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Entry Form */}
        <div className="card">
          <h2 className="card-title">
            {formData.type === 'sale' ? '➕ Record Sale' : '↩️ Record Return'}
          </h2>

          {message && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="type"
                    value="sale"
                    checked={formData.type === 'sale'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  Sale
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="type"
                    value="return"
                    checked={formData.type === 'return'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  />
                  Return
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Search Product</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, SKU, or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product ({filteredProducts.length} found)</label>
              <select
                className="form-select"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
              >
                <option value="">Select a product</option>
                {filteredProducts.map((product) => (
                  <option key={product._id || product.id} value={product._id || product.id}>
                    {product.sku} - {product.name} (Stock: {product.currentStock})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                <strong>{selectedProduct.name}</strong><br />
                Price: Rs. {Number(selectedProduct.price || 0).toFixed(2)}<br />
                Current Stock: {selectedProduct.currentStock}
                {selectedProduct.currentStock <= selectedProduct.reorderPoint && (
                  <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Low Stock</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="form-input"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                min="1"
                max={formData.type === 'sale' ? selectedProduct?.currentStock : 9999}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {selectedProduct && formData.qty > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <strong>Total: Rs. {(Number(selectedProduct.price || 0) * formData.qty).toFixed(2)}</strong>
              </div>
            )}

            <button
              type="submit"
              className={`btn ${formData.type === 'sale' ? 'btn-success' : 'btn-primary'}`}
              style={{ width: '100%' }}
              disabled={submitting || !formData.productId}
            >
              {submitting ? 'Processing...' : `Record ${formData.type === 'sale' ? 'Sale' : 'Return'}`}
            </button>
          </form>
        </div>

        {/* Sales List */}
        <div className="card">
          <h2 className="card-title">Recent Transactions</h2>

          {/* Filters */}
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="date"
                className="form-input"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="date"
                className="form-input"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                className="form-select"
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              >
                <option value="">All Products</option>
                {products.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={loadFilteredSales}>
              Filter
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#6b7280' }}>
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale._id || sale.id}>
                      <td>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</td>
                      <td>{sale.product?.name || 'Unknown'}</td>
                      <td><code>{sale.product?.sku || '-'}</code></td>
                      <td>
                        <span className={`badge ${sale.saleType === 'sale' ? 'badge-success' : 'badge-warning'}`}>
                          {sale.saleType}
                        </span>
                      </td>
                      <td>{sale.quantity}</td>
                      <td>Rs. {Number(sale.totalAmount || 0).toFixed(2)}</td>
                      <td>{sale.recordedBy?.username || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesEntry;
