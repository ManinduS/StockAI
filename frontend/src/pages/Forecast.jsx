import React, { useState, useEffect } from 'react';
import { productsApi, forecastApi } from '../services/api';
import { ForecastLineChart, StockComparisonChart } from '../components/ForecastChart';

const Forecast = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll({ status: 'Active', limit: 500 });
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedSku) {
      setError('Please select a product');
      return;
    }

    setPredicting(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await forecastApi.predict({ sku: selectedSku, weeks });
      setPrediction(response.data.prediction);
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Is the ML service running?');
    } finally {
      setPredicting(false);
    }
  };

  const selectedProduct = products.find(p => p.sku === selectedSku);

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
        <h1 className="page-title">Demand Forecasting</h1>
        <p className="page-subtitle">AI-powered demand predictions using Random Forest model</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Controls */}
        <div className="card">
          <h2 className="card-title">📊 Forecast Settings</h2>

          <div className="form-group">
            <label className="form-label">Select Product</label>
            <select
              className="form-select"
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setPrediction(null);
              }}
            >
              <option value="">Choose a product...</option>
              {products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <strong>{selectedProduct.name}</strong><br />
              Category: {selectedProduct.category}<br />
              Current Stock: {selectedProduct.currentStock}<br />
              Reorder Point: {selectedProduct.reorderPoint}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Forecast Period (Weeks)</label>
            <select
              className="form-select"
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value))}
            >
              <option value={2}>2 Weeks</option>
              <option value={4}>4 Weeks</option>
              <option value={6}>6 Weeks</option>
              <option value={8}>8 Weeks</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={handlePredict}
            disabled={predicting || !selectedSku}
          >
            {predicting ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                Predicting...
              </>
            ) : (
              '🔮 Generate Forecast'
            )}
          </button>

          {error && (
            <div className="alert alert-error" style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {prediction ? (
            <>
              {/* Summary Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Current Stock</div>
                  <div className={`stat-value ${prediction.currentStock <= prediction.reorderPoint ? 'warning' : ''}`}>
                    {prediction.currentStock}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Predicted Demand ({weeks}w)</div>
                  <div className="stat-value">{Math.round(prediction.predictedDemand)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Safety Stock</div>
                  <div className="stat-value">{prediction.safetyStock}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Suggested Reorder</div>
                  <div className={`stat-value ${prediction.suggestedReorder > 0 ? 'danger' : 'success'}`}>
                    {prediction.suggestedReorder}
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="card">
                <h2 className="card-title">Weekly Demand Forecast</h2>
                {prediction.isFallback && (
                  <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                    ⚠️ Using fallback estimation (ML service unavailable). Confidence: 50%
                  </div>
                )}
                <ForecastLineChart data={prediction.forecastWeeks} />
              </div>

              <div className="card">
                <h2 className="card-title">Stock vs Demand Comparison</h2>
                <StockComparisonChart
                  currentStock={prediction.currentStock}
                  predictedDemand={Math.round(prediction.predictedDemand)}
                  safetyStock={prediction.safetyStock}
                />
              </div>

              {/* Recommendation */}
              <div className="card">
                <h2 className="card-title">📋 Recommendation</h2>
                {prediction.suggestedReorder > 0 ? (
                  <div className="alert alert-warning">
                    <strong>Action Required:</strong> Order <strong>{prediction.suggestedReorder}</strong> units of {prediction.productName}.<br />
                    <small>
                      Formula: Predicted Demand ({Math.round(prediction.predictedDemand)}) + 
                      Safety Stock ({prediction.safetyStock}) - 
                      Current Stock ({prediction.currentStock}) = {prediction.suggestedReorder}
                    </small>
                  </div>
                ) : (
                  <div className="alert alert-success">
                    <strong>Stock is sufficient:</strong> No immediate reorder needed for this product.
                  </div>
                )}
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '12px' }}>
                  Confidence: {(prediction.confidence * 100).toFixed(0)}% | 
                  Lead Time: {prediction.leadTimeDays} days
                </p>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>Select a Product to Forecast</h3>
                <p style={{ color: '#6b7280' }}>
                  Choose a product from the dropdown and click "Generate Forecast" to see AI predictions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forecast;
