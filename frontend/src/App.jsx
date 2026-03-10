import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalesEntry from './pages/SalesEntry';
import Inventory from './pages/Inventory';
import Forecast from './pages/Forecast';
import ReorderPlan from './pages/ReorderPlan';
import Admin from './pages/Admin';
import AIInsights from './pages/AIInsights';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
        Loading...
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/sales" element={
          <ProtectedRoute>
            <SalesEntry />
          </ProtectedRoute>
        } />
        
        <Route path="/inventory" element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } />
        
        <Route path="/forecast" element={
          <ProtectedRoute>
            <Forecast />
          </ProtectedRoute>
        } />
        
        <Route path="/reorder" element={
          <ProtectedRoute>
            <ReorderPlan />
          </ProtectedRoute>
        } />

        <Route path="/ai-insights" element={
          <ProtectedRoute>
            <AIInsights />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
