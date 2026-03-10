import React, { useState, useEffect } from 'react';
import { reorderApi } from '../services/api';
import ReorderTable from '../components/ReorderTable';

const ReorderPlan = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  // Generation settings
  const [settings, setSettings] = useState({
    includeAllLowStock: true,
    customSafetyStock: null,
    forceAll: false
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await reorderApi.getPlans({ limit: 10 });
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const response = await reorderApi.generate(settings);
      
      if (response.data.plan) {
        setCurrentPlan(response.data.plan);
        setMessage({ type: 'success', text: 'Reorder plan generated successfully!' });
        loadPlans();
      } else {
        setMessage({ type: 'info', text: response.data.message || 'No products need reordering.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to generate plan' });
    } finally {
      setGenerating(false);
    }
  };

  const viewPlan = async (planId) => {
    try {
      const response = await reorderApi.getPlan(planId);
      setCurrentPlan(response.data.plan);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load plan' });
    }
  };

  const exportPlan = (planId) => {
    const token = localStorage.getItem('token');
    const url = `${reorderApi.export(planId)}?token=${token}`;
    window.open(url, '_blank');
  };

  const downloadCSV = () => {
    if (!currentPlan || !currentPlan.items) return;

    const headers = ['SKU', 'Product Name', 'Current Stock', 'Predicted Demand', 'Safety Stock', 'Lead Time (Days)', 'Suggested Order Qty', 'Reason'];
    
    const rows = currentPlan.items.map(item => [
      item.sku,
      `"${item.productName}"`,
      item.currentStock,
      item.predictedDemand,
      item.safetyStock,
      item.leadTimeDays,
      item.suggestedQty,
      `"${item.reason}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder_plan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
        <h1 className="page-title">Reorder Plan Generator</h1>
        <p className="page-subtitle">Generate AI-powered reorder recommendations based on demand forecasts</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px' }}>
        {/* Left Panel */}
        <div>
          {/* Generate Section */}
          <div className="card">
            <h2 className="card-title">📋 Generate New Plan</h2>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.includeAllLowStock}
                  onChange={(e) => setSettings({ ...settings, includeAllLowStock: e.target.checked })}
                />
                Include all low stock items
              </label>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.forceAll}
                  onChange={(e) => setSettings({ ...settings, forceAll: e.target.checked })}
                />
                Include ALL products (forecast all items)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Custom Safety Stock (optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Use product default"
                value={settings.customSafetyStock || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  customSafetyStock: e.target.value ? parseInt(e.target.value) : null 
                })}
                min="0"
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={generatePlan}
              disabled={generating}
            >
              {generating ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Generating...
                </>
              ) : (
                '🔄 Generate Reorder Plan'
              )}
            </button>

            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '12px' }}>
              Formula: Lead Time Demand + Safety Stock - Current Stock
            </p>
          </div>

          {/* Recent Plans */}
          <div className="card">
            <h2 className="card-title">📁 Recent Plans</h2>
            
            {plans.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No plans generated yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      padding: '12px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => viewPlan(plan.id)}
                  >
                    <div style={{ fontWeight: '500' }}>
                      {new Date(plan.generatedAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {plan.itemCount} items • 
                      <span className={`badge badge-${plan.status === 'exported' ? 'success' : 'info'}`} style={{ marginLeft: '8px' }}>
                        {plan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Current Plan */}
        <div className="card">
          {currentPlan ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="card-title" style={{ marginBottom: '4px' }}>
                    Reorder Plan
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    Generated: {new Date(currentPlan.generatedAt).toLocaleString()} | 
                    By: {currentPlan.generatedBy?.username || 'N/A'} | 
                    Status: <span className={`badge badge-${currentPlan.status === 'exported' ? 'success' : 'info'}`}>
                      {currentPlan.status}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-success" onClick={downloadCSV}>
                    ⬇️ Export CSV
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                  <div className="stat-label">Total Items</div>
                  <div className="stat-value">{currentPlan.items?.length || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Units to Order</div>
                  <div className="stat-value">
                    {currentPlan.items?.reduce((sum, item) => sum + item.suggestedQty, 0) || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Critical Items</div>
                  <div className="stat-value danger">
                    {currentPlan.items?.filter(item => item.currentStock === 0).length || 0}
                  </div>
                </div>
              </div>

              <ReorderTable items={currentPlan.items} />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No Plan Selected</h3>
              <p style={{ color: '#6b7280' }}>
                Generate a new reorder plan or select a recent one from the list.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReorderPlan;
