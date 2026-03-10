import React from 'react';

const ReorderTable = ({ items, onExport }) => {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <p>No items in this reorder plan</p>
      </div>
    );
  }

  const getUrgencyBadge = (item) => {
    if (item.currentStock === 0) {
      return <span className="badge badge-danger">Critical</span>;
    }
    if (item.currentStock < item.safetyStock) {
      return <span className="badge badge-warning">High</span>;
    }
    return <span className="badge badge-info">Medium</span>;
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Current Stock</th>
            <th>Predicted Demand</th>
            <th>Safety Stock</th>
            <th>Lead Time</th>
            <th>Suggested Order</th>
            <th>Urgency</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td><code>{item.sku}</code></td>
              <td>{item.productName}</td>
              <td className={item.currentStock === 0 ? 'low-stock' : ''}>
                {item.currentStock}
              </td>
              <td>{Math.round(item.predictedDemand)}</td>
              <td>{item.safetyStock}</td>
              <td>{item.leadTimeDays} days</td>
              <td><strong>{item.suggestedQty}</strong></td>
              <td>{getUrgencyBadge(item)}</td>
              <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {item.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReorderTable;
