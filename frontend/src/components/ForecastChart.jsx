import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const ForecastLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="empty-state">No forecast data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tickFormatter={(val) => `Week ${val}`} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="demand"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6' }}
          name="Predicted Demand"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const StockComparisonChart = ({ currentStock, predictedDemand, safetyStock }) => {
  const data = [
    { name: 'Current Stock', value: currentStock, fill: '#10b981' },
    { name: 'Predicted Demand', value: predictedDemand, fill: '#3b82f6' },
    { name: 'Safety Stock', value: safetyStock, fill: '#f59e0b' }
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const SalesTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="empty-state">No sales data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="_id" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="totalQty" fill="#3b82f6" name="Units Sold" />
      </BarChart>
    </ResponsiveContainer>
  );
};
