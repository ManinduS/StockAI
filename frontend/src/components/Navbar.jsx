import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        📦 StockAI
      </div>

      <div className="navbar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Sales Entry
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Inventory
        </NavLink>
        <NavLink to="/forecast" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Forecast
        </NavLink>
        <NavLink to="/reorder" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Reorder Plan
        </NavLink>
        <NavLink to="/ai-insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          AI Insights
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Admin
          </NavLink>
        )}
      </div>

      <div className="navbar-user">
        <div>
          <div className="user-info">{user?.username}</div>
          <div className="user-role">{user?.role}</div>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
