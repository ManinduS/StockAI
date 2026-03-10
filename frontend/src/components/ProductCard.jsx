import React, { useState } from 'react';

const ProductCard = ({ product, onEdit, onDelete, onStockUpdate }) => {
  const isLowStock = product.currentStock <= product.reorderPoint;
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockValue, setStockValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleQuickStock = async (mode) => {
    const val = parseInt(stockValue);
    if (!val || val <= 0) return;
    setUpdating(true);
    try {
      const adjustment = mode === 'add' ? val : -val;
      await onStockUpdate(product.id || product._id, adjustment, mode === 'add' ? 'Stock added' : 'Stock removed');
      setStockValue('');
      setShowStockUpdate(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Stock update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>
            {product.name}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>
            SKU: {product.sku}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '8px' }}>
            Lead Time: {product.leadTimeDays || 7} days | Safety: {product.safetyStock || 10}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-info">{product.category}</span>
            <span className={`badge ${product.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
              {product.status}
            </span>
            {isLowStock && <span className="badge badge-danger">Low Stock</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            Rs. {Number(product.price || 0).toFixed(2)}
          </div>
          <div style={{ marginTop: '8px' }}>
            <span className={isLowStock ? 'low-stock' : 'in-stock'} style={{ fontSize: '0.9rem' }}>
              Stock: {product.currentStock} / Reorder at: {product.reorderPoint}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stock Update */}
      {onStockUpdate && (
        <div style={{ marginTop: '12px' }}>
          {!showStockUpdate ? (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowStockUpdate(true)}
              style={{ fontSize: '0.8rem' }}
            >
              📦 Quick Stock Update
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                className="form-input"
                placeholder="Qty"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                min="1"
                style={{ width: '80px', padding: '6px 8px', fontSize: '0.85rem' }}
                disabled={updating}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleQuickStock('add')}
                disabled={updating || !stockValue}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                + Add
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleQuickStock('remove')}
                disabled={updating || !stockValue}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                − Remove
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setShowStockUpdate(false); setStockValue(''); }}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      
      {(onEdit || onDelete) && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {onEdit && (
            <button className="btn btn-sm btn-secondary" onClick={() => onEdit(product)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button className="btn btn-sm btn-danger" onClick={() => onDelete(product)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
