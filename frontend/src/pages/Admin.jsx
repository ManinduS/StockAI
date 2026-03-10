import React, { useState, useEffect } from 'react';
import { adminApi, settingsApi, forecastApi, productsApi } from '../services/api';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // New user form
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'store'
  });

  // Test prediction
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // CSV Upload
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState('products');

  // Model Training
  const [trainingAlgorithm, setTrainingAlgorithm] = useState('random_forest');
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  // Stock Adjustment
  const [selectedProduct, setSelectedProduct] = useState('');
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, settingsRes, mlRes, productsRes] = await Promise.all([
        adminApi.getUsers(),
        settingsApi.get(),
        forecastApi.getMLStatus().catch(() => ({ data: { status: 'offline' } })),
        productsApi.getAll({ limit: 500 })
      ]);
      
      setUsers(usersRes.data.users || []);
      setSettings(settingsRes.data.settings);
      setMlStatus(mlRes.data);
      setProducts(productsRes.data.products || []);
    } catch (error) {
      console.error('Load error:', error);
      if (error.response?.data?.ml_service_error) {
        setMlStatus({ status: 'offline' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await adminApi.createUser(newUser);
      setMessage({ type: 'success', text: 'User created successfully' });
      setShowUserModal(false);
      setNewUser({ username: '', password: '', role: 'store' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create user' });
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;

    try {
      await adminApi.deleteUser(userId);
      setMessage({ type: 'success', text: 'User deleted' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete user' });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await settingsApi.update(settings);
      setMessage({ type: 'success', text: 'Settings saved' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' });
    }
  };

  const addHoliday = () => {
    const date = prompt('Enter holiday date (YYYY-MM-DD):');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSettings({
        ...settings,
        holidays: [...(settings.holidays || []), date]
      });
    }
  };

  const removeHoliday = (index) => {
    setSettings({
      ...settings,
      holidays: settings.holidays.filter((_, i) => i !== index)
    });
  };

  const addPromo = () => {
    const name = prompt('Promotion name:');
    const start = prompt('Start date (YYYY-MM-DD):');
    const end = prompt('End date (YYYY-MM-DD):');
    const multiplier = prompt('Demand multiplier (e.g., 1.5):');

    if (name && start && end && multiplier) {
      setSettings({
        ...settings,
        promotions: [
          ...(settings.promotions || []),
          { 
            name, 
            startDate: start, 
            endDate: end, 
            demandMultiplier: parseFloat(multiplier) 
          }
        ]
      });
    }
  };

  const removePromo = (index) => {
    setSettings({
      ...settings,
      promotions: settings.promotions.filter((_, i) => i !== index)
    });
  };

  const testPrediction = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Use first available product SKU for testing
      const response = await forecastApi.predict({ sku: 'GRN-001', weeks: 4 });
      setTestResult({ success: true, data: response.data });
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.response?.data?.error || error.message 
      });
    } finally {
      setTesting(false);
    }
  };

  // Parse CSV to JSON array
  const parseCSV = (csvText, type) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;
      
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      
      if (type === 'products') {
        data.push({
          sku: row.sku || row.product_id,
          name: row.name || row.product_name,
          category: row.category,
          price: parseFloat(row.price) || 0,
          cost: parseFloat(row.cost) || 0,
          quantity: parseInt(row.quantity || row.stock) || 0,
          minStock: parseInt(row.minstock || row.min_stock || row.reorder_point) || 10,
          maxStock: parseInt(row.maxstock || row.max_stock) || 100,
          unit: row.unit || 'pcs',
          supplier: row.supplier || '',
          leadTime: parseInt(row.leadtime || row.lead_time) || 3
        });
      } else {
        data.push({
          sku: row.sku || row.product_id,
          quantity: parseInt(row.quantity || row.qty) || 1,
          price: parseFloat(row.price || row.unit_price) || 0,
          date: row.date || row.sale_date || new Date().toISOString().split('T')[0]
        });
      }
    }
    return data;
  };

  const handleCSVImport = async () => {
    if (!csvData.trim()) {
      setMessage({ type: 'error', text: 'Please paste CSV data' });
      return;
    }
    
    setImporting(true);
    setMessage(null);
    
    try {
      const data = parseCSV(csvData, importType);
      if (data.length === 0) {
        setMessage({ type: 'error', text: 'No valid data found in CSV' });
        return;
      }
      
      let response;
      if (importType === 'products') {
        response = await adminApi.uploadProducts(data);
      } else {
        response = await adminApi.uploadSales(data);
      }
      
      setMessage({ 
        type: 'success', 
        text: `Imported ${response.data.count || data.length} ${importType} successfully` 
      });
      setCsvData('');
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    setTrainingResult(null);
    setMessage(null);
    
    try {
      const response = await adminApi.trainModel(trainingAlgorithm);
      setTrainingResult(response.data);
      setMessage({ type: 'success', text: 'Model training completed!' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Training failed' });
    } finally {
      setTraining(false);
    }
  };

  const handleStockAdjust = async () => {
    if (!selectedProduct || stockAdjustment === 0) {
      setMessage({ type: 'error', text: 'Select a product and enter adjustment quantity' });
      return;
    }
    
    try {
      await adminApi.stockAdjust(selectedProduct, stockAdjustment, adjustReason);
      setMessage({ type: 'success', text: 'Stock adjusted successfully' });
      setSelectedProduct('');
      setStockAdjustment(0);
      setAdjustReason('');
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Stock adjustment failed' });
    }
  };

  const handleFactoryReset = async () => {
    const confirm1 = window.prompt('Type RESET_ALL_DATA to confirm factory reset:');
    if (confirm1 !== 'RESET_ALL_DATA') {
      setMessage({ type: 'error', text: 'Factory reset cancelled' });
      return;
    }
    
    try {
      await adminApi.factoryReset('RESET_ALL_DATA');
      setMessage({ type: 'success', text: 'Factory reset complete. All data has been cleared.' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Factory reset failed' });
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          Loading admin panel...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System management and configuration</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['users', 'settings', 'ml-service', 'data-import', 'training', 'system'].map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'users' && '👥 Users'}
            {tab === 'settings' && '⚙️ Settings'}
            {tab === 'ml-service' && '🤖 ML Service'}
            {tab === 'data-import' && '📥 Data Import'}
            {tab === 'training' && '🎯 Train Model'}
            {tab === 'system' && '🔧 System'}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="card-title">User Management</h2>
            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
              ➕ Add User
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${user.role === 'admin' ? 'warning' : 'info'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={user.username === 'admin'}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Holidays */}
          <div className="card">
            <h2 className="card-title">📅 Holiday Calendar</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.85rem' }}>
              Holidays affect demand predictions (typically higher demand before holidays)
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {settings.holidays?.map((date, index) => (
                <span key={index} className="badge badge-info" style={{ padding: '6px 12px' }}>
                  {date}
                  <button
                    style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    onClick={() => removeHoliday(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={addHoliday}>
              ➕ Add Holiday
            </button>
          </div>

          {/* Promotions */}
          <div className="card">
            <h2 className="card-title">🎉 Promotions</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.85rem' }}>
              Active promotions increase demand multiplier
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {settings.promotions?.map((promo, index) => (
                <div key={index} style={{ padding: '12px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{promo.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {promo.startDate} to {promo.endDate} | ×{promo.demandMultiplier}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    onClick={() => removePromo(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={addPromo}>
              ➕ Add Promotion
            </button>
          </div>

          {/* Forecast Defaults */}
          <div className="card">
            <h2 className="card-title">📊 Forecast Defaults</h2>

            <div className="form-group">
              <label className="form-label">Default Lead Time (Days)</label>
              <input
                type="number"
                className="form-input"
                value={settings.defaultLeadTimeDays || 7}
                onChange={(e) => setSettings({ ...settings, defaultLeadTimeDays: parseInt(e.target.value) })}
                min="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Safety Stock</label>
              <input
                type="number"
                className="form-input"
                value={settings.defaultSafetyStock || 10}
                onChange={(e) => setSettings({ ...settings, defaultSafetyStock: parseInt(e.target.value) })}
                min="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Forecast Weeks (Default)</label>
              <input
                type="number"
                className="form-input"
                value={settings.forecastWeeks || 4}
                onChange={(e) => setSettings({ ...settings, forecastWeeks: parseInt(e.target.value) })}
                min="1"
                max="12"
              />
            </div>
          </div>

          {/* Save Settings */}
          <div className="card">
            <h2 className="card-title">💾 Save Changes</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Remember to save your settings after making changes.
            </p>
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              Save All Settings
            </button>
          </div>
        </div>
      )}

      {/* ML Service Tab */}
      {activeTab === 'ml-service' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Status */}
          <div className="card">
            <h2 className="card-title">🤖 ML Service Status</h2>

            <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? '#22c55e' : '#ef4444'
                }}></div>
                <strong>
                  {mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? 'Online' : 'Offline'}
                </strong>
              </div>

              {mlStatus?.model && (
                <>
                  <p><strong>Model:</strong> {mlStatus.model.algorithm || 'Random Forest'}</p>
                  <p><strong>Features:</strong> {mlStatus.model.features?.length || 'N/A'}</p>
                  <p><strong>Categories:</strong> {mlStatus.model.categories?.length || 'N/A'}</p>
                </>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              <p><strong>Endpoint:</strong> http://localhost:8000</p>
              <p><strong>Model File:</strong> inventory_ai_model.pkl</p>
            </div>
          </div>

          {/* Test Prediction */}
          <div className="card">
            <h2 className="card-title">🧪 Test Prediction</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Send a test prediction request to verify ML service connectivity.
            </p>

            <button
              className="btn btn-primary"
              onClick={testPrediction}
              disabled={testing}
              style={{ marginBottom: '16px' }}
            >
              {testing ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Testing...
                </>
              ) : (
                '🔮 Run Test Prediction'
              )}
            </button>

            {testResult && (
              <div className={`alert alert-${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? (
                  <>
                    <strong>Success!</strong><br />
                    ML service is working correctly.
                    {testResult.data?.prediction?.isFallback && (
                      <> (Using fallback - ML service may be offline)</>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Failed:</strong> {testResult.error}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="card-title">📖 ML Service Instructions</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ marginBottom: '8px' }}>Starting the ML Service</h3>
                <pre style={{ background: '#1f2937', color: '#f3f4f6', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
{`cd stockai-mvp/ml-service
pip install -r requirements.txt
uvicorn app:app --reload --port 8000`}
                </pre>
              </div>

              <div>
                <h3 style={{ marginBottom: '8px' }}>Expected Endpoints</h3>
                <ul style={{ paddingLeft: '20px', color: '#6b7280' }}>
                  <li><code>GET /health</code> - Health check</li>
                  <li><code>GET /model-info</code> - Model metadata</li>
                  <li><code>POST /predict</code> - Single prediction</li>
                  <li><code>POST /batch-predict</code> - Batch predictions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Import Tab */}
      {activeTab === 'data-import' && (
        <div className="card">
          <h2 className="card-title">📥 CSV Data Import</h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Import products or sales data from CSV format. Paste your CSV data below.
          </p>

          <div className="form-group">
            <label className="form-label">Import Type</label>
            <select 
              className="form-select"
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
            >
              <option value="products">Products</option>
              <option value="sales">Sales</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">CSV Data</label>
            <textarea
              className="form-input"
              rows="10"
              placeholder={importType === 'products' ? 
                "sku,name,category,price,cost,quantity,minStock,maxStock,unit,supplier,leadTime\nSKU001,Product Name,Category,9.99,5.00,100,10,200,pcs,Supplier Inc,3" :
                "sku,quantity,price,date\nSKU001,5,9.99,2025-01-15"
              }
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary"
              onClick={handleCSVImport}
              disabled={importing || !csvData.trim()}
            >
              {importing ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Importing...
                </>
              ) : (
                `📥 Import ${importType === 'products' ? 'Products' : 'Sales'}`
              )}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setCsvData('')}
            >
              Clear
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>CSV Format Help</h3>
            {importType === 'products' ? (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <p><strong>Required columns:</strong> sku, name, category, price</p>
                <p><strong>Optional columns:</strong> cost, quantity, minStock, maxStock, unit, supplier, leadTime</p>
                <p style={{ marginTop: '8px' }}><strong>Example:</strong></p>
                <pre style={{ background: '#1f2937', color: '#f3f4f6', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`sku,name,category,price,cost,quantity
BEV-001,Cola 500ml,Beverages,2.50,1.25,100
SNK-001,Chips Original,Snacks,3.00,1.50,75`}
                </pre>
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <p><strong>Required columns:</strong> sku, quantity</p>
                <p><strong>Optional columns:</strong> price, date</p>
                <p style={{ marginTop: '8px' }}><strong>Example:</strong></p>
                <pre style={{ background: '#1f2937', color: '#f3f4f6', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`sku,quantity,price,date
BEV-001,3,2.50,2025-01-15
SNK-001,2,3.00,2025-01-15`}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h2 className="card-title">🎯 Train ML Model</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Train a new prediction model using current sales data. This will replace the existing model.
            </p>

            <div className="form-group">
              <label className="form-label">Algorithm</label>
              <select 
                className="form-select"
                value={trainingAlgorithm}
                onChange={(e) => setTrainingAlgorithm(e.target.value)}
              >
                <option value="random_forest">Random Forest (Recommended)</option>
                <option value="xgboost">XGBoost (High Accuracy)</option>
              </select>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleTrainModel}
              disabled={training}
              style={{ width: '100%' }}
            >
              {training ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Training... (This may take a few minutes)
                </>
              ) : (
                '🚀 Start Training'
              )}
            </button>

            {trainingResult && (
              <div className="alert alert-success" style={{ marginTop: '16px' }}>
                <strong>Training Complete!</strong>
                <div style={{ marginTop: '8px' }}>
                  <p>Algorithm: {trainingResult.algorithm || trainingAlgorithm}</p>
                  {trainingResult.metrics && (
                    <>
                      <p>RMSE: {trainingResult.metrics.rmse != null ? trainingResult.metrics.rmse.toFixed(4) : 'N/A'}</p>
                      <p>R² Score: {trainingResult.metrics.r2_score != null ? trainingResult.metrics.r2_score.toFixed(4) : 'N/A'}</p>
                      <p>Data Source: {trainingResult.metrics.data_source || 'N/A'}</p>
                    </>
                  )}
                  <p>Training Samples: {trainingResult.metrics?.training_samples || trainingResult.samples || 'N/A'}</p>
                  <p>Test Samples: {trainingResult.metrics?.test_samples || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">📊 Current Model Info</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ 
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? '#22c55e' : '#ef4444'
                }}></span>
                <strong>
                  {mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? 'Model Loaded' : 'No Model'}
                </strong>
              </div>

              {mlStatus?.model && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <p><strong>Algorithm:</strong> {mlStatus.model.algorithm || 'Random Forest'}</p>
                  <p><strong>Features:</strong> {mlStatus.model.features?.length || 'N/A'}</p>
                  <p><strong>Categories:</strong> {mlStatus.model.categories?.length || 'N/A'}</p>
                  {mlStatus.model.lastTrained && (
                    <p><strong>Last Trained:</strong> {new Date(mlStatus.model.lastTrained).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem' }}>
              <h4 style={{ marginBottom: '8px' }}>Algorithm Comparison</h4>
              <ul style={{ paddingLeft: '20px', color: '#6b7280' }}>
                <li><strong>Random Forest:</strong> Best for most cases, handles non-linear patterns well</li>
                <li><strong>Linear Regression:</strong> Simple, fast, good for stable trends</li>
                <li><strong>XGBoost:</strong> High accuracy, requires more data</li>
                <li><strong>Gradient Boosting:</strong> Good balance of speed and accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h2 className="card-title">📦 Stock Adjustment</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Manually adjust stock levels for inventory corrections.
            </p>

            <div className="form-group">
              <label className="form-label">Product</label>
              <select 
                className="form-select"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.sku}>
                    {p.sku} - {p.name} (Current: {p.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment (+/-)</label>
              <input
                type="number"
                className="form-input"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(parseInt(e.target.value) || 0)}
                placeholder="Enter positive or negative number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Inventory count, Damaged goods, etc."
              />
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleStockAdjust}
              disabled={!selectedProduct || stockAdjustment === 0}
            >
              ✅ Apply Adjustment
            </button>
          </div>

          <div className="card" style={{ borderColor: '#ef4444' }}>
            <h2 className="card-title" style={{ color: '#ef4444' }}>⚠️ Factory Reset</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              <strong>WARNING:</strong> This will permanently delete ALL data including:
            </p>
            <ul style={{ paddingLeft: '20px', color: '#6b7280', marginBottom: '16px' }}>
              <li>All products and inventory</li>
              <li>All sales records</li>
              <li>All reorder plans</li>
              <li>All settings and configurations</li>
            </ul>
            <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '16px' }}>
              This action cannot be undone!
            </p>
            <button 
              className="btn"
              onClick={handleFactoryReset}
              style={{ 
                background: '#ef4444', 
                color: 'white',
                width: '100%'
              }}
            >
              🗑️ Factory Reset
            </button>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="card-title">📈 System Statistics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{products.length}</div>
                <div style={{ color: '#6b7280' }}>Products</div>
              </div>
              <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{users.length}</div>
                <div style={{ color: '#6b7280' }}>Users</div>
              </div>
              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                  {products.filter(p => p.quantity <= p.minStock).length}
                </div>
                <div style={{ color: '#6b7280' }}>Low Stock Items</div>
              </div>
              <div style={{ padding: '16px', background: '#f3e8ff', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9333ea' }}>
                  {mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? '✓' : '✗'}
                </div>
                <div style={{ color: '#6b7280' }}>ML Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create User</h2>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  minLength="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="store">Store Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create User
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
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

export default Admin;
