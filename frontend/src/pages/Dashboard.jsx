import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { productsApi, salesApi, forecastApi } from '../services/api';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlStatus, setMlStatus] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [productsRes, lowStockRes, salesSummaryRes, mlHealthRes, topProductsRes, monthlyRes] = await Promise.all([
        productsApi.getAll({ limit: 1 }),
        productsApi.getLowStock(),
        salesApi.getSummary(),
        forecastApi.getHealth().catch(() => ({ data: { status: 'offline' } })),
        salesApi.getTopProducts({ limit: 5, days: 30 }).catch(() => ({ data: { topProducts: [] } })),
        salesApi.getMonthlyStats({ months: 6 }).catch(() => ({ data: { monthlyStats: [] } }))
      ]);

      setStats({
        totalProducts: productsRes.data.total || 0,
        lowStockCount: lowStockRes.data.count || 0,
        ...salesSummaryRes.data.summary
      });
      
      setLowStockProducts(lowStockRes.data.products?.slice(0, 5) || []);
      setMlStatus(mlHealthRes.data);
      setTopProducts(topProductsRes.data.topProducts || []);
      setMonthlyStats(monthlyRes.data.monthlyStats || []);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate max value for chart scaling
  const maxSales = Math.max(...monthlyStats.map(m => m.totalSales), 1);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.username}! Here's your store overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{stats?.totalProducts || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Items</div>
          <div className={`stat-value ${stats?.lowStockCount > 0 ? 'warning' : ''}`}>
            {stats?.lowStockCount || 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">{stats?.salesCount || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Revenue</div>
          <div className="stat-value success">
            Rs. {Number(stats?.netSales || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Monthly Stock Movement Chart */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 className="card-title">📊 Monthly Sales Movement</h2>
        {monthlyStats.length === 0 ? (
          <div className="alert alert-info">
            No sales data available yet. Record some sales to see the chart.
          </div>
        ) : (
          <div>
            {/* Simple Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', padding: '20px 0' }}>
              {monthlyStats.map((month, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '100%', 
                    maxWidth: '60px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max((month.totalSales / maxSales) * 150, 5)}px`,
                    transition: 'height 0.3s ease'
                  }} title={`Rs. ${Number(month.totalSales).toFixed(2)}`}></div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '8px' }}>
                    {month.month}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: '600' }}>
                    Rs. {Number(month.totalSales).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#16a34a' }}>
                  Rs. {monthlyStats.reduce((sum, m) => sum + m.totalSales, 0).toFixed(0)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total Sales</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#d97706' }}>
                  {monthlyStats.reduce((sum, m) => sum + m.salesCount, 0)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Transactions</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#2563eb' }}>
                  {monthlyStats.reduce((sum, m) => sum + m.totalQuantity, 0)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Units Sold</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Top Products */}
        <div className="card">
          <h2 className="card-title">🏆 Top Products (30 Days)</h2>
          {topProducts.length === 0 ? (
            <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
              No sales data available yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topProducts.map((product, idx) => (
                <div key={product.productId} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '10px',
                  background: idx === 0 ? '#fef3c7' : '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#b45309' : '#6b7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {product.totalQuantity} units • Rs. {Number(product.totalRevenue).toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <h2 className="card-title">⚠️ Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>
              All products are well stocked!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStockProducts.map((product) => (
                <div key={product.id} style={{ 
                  padding: '10px', 
                  background: product.currentStock === 0 ? '#fef2f2' : '#fffbeb',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${product.currentStock === 0 ? '#ef4444' : '#f59e0b'}`
                }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Stock: <strong style={{ color: product.currentStock === 0 ? '#ef4444' : '#f59e0b' }}>{product.currentStock}</strong></span>
                    <span>Reorder at: {product.reorderPoint}</span>
                  </div>
                </div>
              ))}
              <a href="/inventory?lowStock=true" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none' }}>
                View all low stock items →
              </a>
            </div>
          )}
        </div>

        {/* ML Status & Quick Actions */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <h2 className="card-title">🤖 ML Service</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? '#10b981' : '#ef4444'
                }}
              />
              <span style={{ fontSize: '0.9rem' }}>
                {mlStatus?.status === 'healthy' || mlStatus?.model?.loaded ? 'Connected & Ready' : 'Service Unavailable'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Model: {mlStatus?.model?.loaded || mlStatus?.model_loaded ? 'Loaded ✓' : 'Not Loaded'}
            </p>
          </div>

          <div className="card">
            <h2 className="card-title">Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="/sales" className="btn btn-primary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                ➕ New Sale Entry
              </a>
              <a href="/forecast" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                📊 View Forecasts
              </a>
              <a href="/reorder" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                📋 Generate Reorder Plan
              </a>
              {isAdmin && (
                <a href="/admin" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                  ⚙️ Admin Panel
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
