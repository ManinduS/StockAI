import React, { useState, useEffect, useCallback } from 'react';
import { aiApi } from '../services/api';

const RISK_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#ca8a04',
  Overstock: '#7c3aed',
  Low: '#16a34a',
};
const RISK_BG = {
  Critical: '#fef2f2',
  High: '#fff7ed',
  Medium: '#fefce8',
  Overstock: '#f5f3ff',
  Low: '#f0fdf4',
};

const AIInsights = () => {
  const [tab, setTab] = useState('insights');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Data
  const [insights, setInsights] = useState([]);
  const [plan, setPlan] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [training, setTraining] = useState(false);
  const [algorithm, setAlgorithm] = useState('xgboost');

  const loadMetrics = useCallback(async () => {
    try {
      const res = await aiApi.getModelMetrics();
      setMetrics(res.data);
    } catch {
      /* model may not exist yet */
    }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // --- Actions ---
  const handleTrain = async () => {
    setTraining(true);
    setMessage(null);
    setError(null);
    try {
      const res = await aiApi.trainModel(algorithm);
      setMessage(res.data.message || 'Model trained successfully');
      await loadMetrics();
    } catch (e) {
      setError(e.response?.data?.error || 'Training failed');
    } finally {
      setTraining(false);
    }
  };

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getInventoryInsights();
      setInsights(res.data.insights || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getReorderPlan();
      setPlan(res.data.plan || null);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load reorder plan');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getAlerts();
      setAlerts(res.data.alerts || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'insights') loadInsights();
    else if (tab === 'reorder') loadPlan();
    else if (tab === 'alerts') loadAlerts();
  }, [tab]); // eslint-disable-line

  // --- Renderers ---
  const RiskBadge = ({ level }) => (
    <span style={{
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      color: RISK_COLORS[level] || '#555',
      background: RISK_BG[level] || '#f3f4f6',
      border: `1px solid ${RISK_COLORS[level] || '#ccc'}40`,
    }}>
      {level}
    </span>
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🤖 AI Insights &amp; Smart Reorder</h1>
        <p className="page-subtitle">
          XGBoost / Random Forest demand forecasting, risk detection, and auto-generated reorder plans.
        </p>
      </div>

      {/* ── Model Training Card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Model Training &amp; Performance</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 180 }} value={algorithm}
            onChange={e => setAlgorithm(e.target.value)}>
            <option value="xgboost">XGBoost</option>
            <option value="random_forest">Random Forest</option>
          </select>
          <button className="btn btn-primary" onClick={handleTrain} disabled={training}>
            {training ? 'Training…' : 'Train Model'}
          </button>
          {message && <span style={{ color: '#16a34a', fontWeight: 500 }}>{message}</span>}
          {error && tab === 'train' && <span style={{ color: '#dc2626' }}>{error}</span>}
        </div>

        {metrics?.metrics && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Algorithm', value: metrics.metrics.algorithm },
              { label: 'R² Score', value: metrics.metrics.r2_score },
              { label: 'RMSE', value: metrics.metrics.rmse },
              { label: 'Training Size', value: metrics.metrics.training_samples },
              { label: 'Data Source', value: metrics.metrics.data_source },
              { label: 'Last Trained', value: metrics.metrics.trained_at ? new Date(metrics.metrics.trained_at).toLocaleString() : '-' },
            ].map(m => (
              <div key={m.label} style={{
                background: '#f8fafc', borderRadius: 10, padding: '10px 18px',
                minWidth: 120, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{m.value ?? '-'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'insights', label: '📊 Inventory Insights' },
          { key: 'reorder', label: '📋 Smart Reorder Plan' },
          { key: 'alerts', label: '🔔 AI Alerts' },
        ].map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div className="loading"><div className="spinner"></div> Analyzing inventory…</div>
      ) : (
        <>
          {/* ── Insights Tab ── */}
          {tab === 'insights' && (
            <div className="card">
              <h2 className="card-title">Inventory Insights ({insights.length} products)</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Predicted Demand</th>
                      <th>Safety Stock</th>
                      <th>Suggested Order</th>
                      <th>Risk</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b7280' }}>
                        No insights yet. Make sure the model is trained.
                      </td></tr>
                    ) : insights.map((item, i) => (
                      <tr key={i} style={{ background: RISK_BG[item.risk_level] || 'transparent' }}>
                        <td><strong>{item.product}</strong></td>
                        <td><code>{item.sku}</code></td>
                        <td>{item.current_stock}</td>
                        <td>{Math.round(item.predicted_demand)}</td>
                        <td>{item.safety_stock}</td>
                        <td style={{ fontWeight: 700 }}>{item.suggested_order}</td>
                        <td><RiskBadge level={item.risk_level} /></td>
                        <td>{(item.confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {insights.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>Explainable AI Reasoning</h3>
                  {insights.filter(i => i.suggested_order > 0).slice(0, 5).map((item, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                      background: '#f8fafc', fontSize: 13, color: '#334155',
                    }}>
                      💡 {item.explanation}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Reorder Plan Tab ── */}
          {tab === 'reorder' && (
            <div className="card">
              <h2 className="card-title">Smart Reorder Plan</h2>
              {plan ? (
                <>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ background: '#f0fdf4', padding: '10px 18px', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Items to Order</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{plan.total_items}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '10px 18px', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Estimated Cost</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Rs. {plan.total_estimated_cost?.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fefce8', padding: '10px 18px', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Generated</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {plan.generated_at ? new Date(plan.generated_at).toLocaleString() : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Current Stock</th>
                          <th>Predicted Demand</th>
                          <th>Safety Stock</th>
                          <th>Order Qty</th>
                          <th>Est. Cost</th>
                          <th>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.items?.map((item, i) => (
                          <tr key={i} style={{ background: RISK_BG[item.risk_level] || 'transparent' }}>
                            <td><strong>{item.product}</strong></td>
                            <td><code>{item.sku}</code></td>
                            <td>{item.current_stock}</td>
                            <td>{Math.round(item.predicted_demand)}</td>
                            <td>{item.safety_stock}</td>
                            <td style={{ fontWeight: 700 }}>{item.suggested_order}</td>
                            <td>Rs. {item.estimated_cost?.toLocaleString()}</td>
                            <td><RiskBadge level={item.risk_level} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p style={{ color: '#6b7280' }}>No reorder plan generated. Train the model first.</p>
              )}
            </div>
          )}

          {/* ── Alerts Tab ── */}
          {tab === 'alerts' && (
            <div className="card">
              <h2 className="card-title">AI Alerts ({alerts.length})</h2>
              {alerts.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No alerts right now. All stock levels are healthy or model is not trained.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', borderRadius: 10,
                      background: RISK_BG[a.risk_level] || '#f9fafb',
                      border: `1px solid ${RISK_COLORS[a.risk_level] || '#e5e7eb'}30`,
                    }}>
                      <span style={{ fontSize: 22 }}>
                        {a.risk_level === 'Critical' ? '🚨' : a.risk_level === 'High' ? '⚠️' : a.risk_level === 'Overstock' ? '📦' : 'ℹ️'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong>{a.product}</strong>
                          <code style={{ fontSize: 11 }}>{a.sku}</code>
                          <RiskBadge level={a.risk_level} />
                        </div>
                        <div style={{ fontSize: 14, color: '#334155' }}>{a.alert}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          Stock: {a.current_stock} | Predicted Demand: {Math.round(a.predicted_demand)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIInsights;
