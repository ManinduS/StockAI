/**
 * ML Service Client
 * Wrapper for calling the Python ML service
 */

const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Create axios instance with defaults
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Check ML service health
 */
exports.checkHealth = async () => {
  try {
    const response = await mlClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('ML Service health check failed:', error.message);
    return { status: 'unhealthy', error: error.message };
  }
};

/**
 * Get prediction for a single product
 * @param {Object} product - Product data with features
 * @returns {Object} Prediction result
 */
exports.predict = async (product) => {
  try {
    const payload = {
      sku: product.sku || 'UNKNOWN',
      category: product.category,
      stock_quantity: product.currentStock || 0,
      reorder_level: product.reorderPoint || 10,
      reorder_quantity: product.reorderQuantity || 50,
      unit_price: parseFloat(product.price) || 0,
      warehouse_location: product.warehouseLocation || 'Main Warehouse',
      status: product.status || 'Active',
      received_month: new Date().getMonth() + 1,
      received_day: new Date().getDate(),
      order_lead_time: product.leadTimeDays || 7,
      days_to_expiry: calculateDaysToExpiry(product.expirationDate),
      inventory_turnover_rate: product.inventoryTurnoverRate || 1.0
    };

    const response = await mlClient.post('/predict', payload);
    return {
      success: true,
      sku: product.sku,
      prediction: response.data.predicted_demand,
      predictedDemand: response.data.predicted_demand,
      modelVersion: response.data.model_version,
      confidence: 0.85,
      isFallback: false
    };
  } catch (error) {
    console.error('ML prediction error:', error.message);
    
    // Return fallback prediction based on historical average
    const fallbackDemand = estimateFallbackDemand(product);
    return {
      success: false,
      sku: product.sku,
      prediction: fallbackDemand,
      predictedDemand: fallbackDemand,
      error: error.message,
      confidence: 0.5,
      isFallback: true
    };
  }
};

/**
 * Get predictions for multiple products
 * @param {Array} products - Array of product data
 * @returns {Array} Array of prediction results
 */
exports.batchPredict = async (products) => {
  try {
    const items = products.map(p => ({
      sku: p.sku,
      category: p.category,
      stock_quantity: p.currentStock || 0,
      reorder_level: p.reorderPoint || 10,
      reorder_quantity: p.reorderQuantity || 50,
      unit_price: p.price || 0,
      warehouse_location: p.warehouseLocation || 'Main Warehouse',
      status: p.status || 'Active',
      received_month: new Date().getMonth() + 1,
      received_day: new Date().getDate(),
      order_lead_time: p.leadTimeDays || 7,
      days_to_expiry: calculateDaysToExpiry(p.expirationDate),
      inventory_turnover_rate: p.inventoryTurnoverRate || 1.0
    }));

    const response = await mlClient.post('/batch-predict', { items });
    
    return response.data.predictions.map((pred, index) => ({
      success: pred.success,
      sku: pred.sku,
      predictedDemand: pred.predicted_demand,
      product: products[index]
    }));
  } catch (error) {
    console.error('ML batch prediction error:', error.message);
    
    // Return fallback predictions
    return products.map(p => ({
      success: false,
      sku: p.sku,
      predictedDemand: estimateFallbackDemand(p),
      error: error.message,
      isFallback: true
    }));
  }
};

/**
 * Get model info
 */
exports.getModelInfo = async () => {
  try {
    const response = await mlClient.get('/model-info');
    return response.data;
  } catch (error) {
    console.error('ML model info error:', error.message);
    return { loaded: false, error: error.message };
  }
};

/**
 * Get ML service status (for admin panel)
 */
exports.getStatus = async () => {
  try {
    const healthResponse = await mlClient.get('/health');
    const modelResponse = await mlClient.get('/model-info');
    
    return {
      status: healthResponse.data.status,
      model: {
        loaded: modelResponse.data.loaded,
        algorithm: modelResponse.data.model_type,
        features: modelResponse.data.features,
        categories: modelResponse.data.categories,
        warehouses: modelResponse.data.warehouses,
        statuses: modelResponse.data.statuses
      }
    };
  } catch (error) {
    console.error('ML status error:', error.message);
    return { status: 'offline', error: error.message };
  }
};

/**
 * Train a new ML model with specified algorithm
 * @param {string} algorithm - 'random_forest' or 'xgboost'
 */
exports.trainModel = async (algorithm) => {
  try {
    const response = await mlClient.post('/train', {
      algorithm: algorithm || 'xgboost',
      test_size: 0.2
    }, { timeout: 300000 }); // 5 minute timeout for training
    
    return response.data;
  } catch (error) {
    console.error('ML training error:', error.message);
    throw new Error(`Model training failed: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * POST /inventory-insights to Python ML service
 * @param {Array} products - Product payloads
 */
exports.postInsights = async (products) => {
  try {
    const response = await mlClient.post('/inventory-insights', { products }, { timeout: 60000 });
    return response.data;
  } catch (error) {
    console.error('ML insights error:', error.message);
    throw new Error(`Insights failed: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * POST /reorder-plan to Python ML service
 * @param {Array} products - Product payloads
 */
exports.postReorderPlan = async (products) => {
  try {
    const response = await mlClient.post('/reorder-plan', { products }, { timeout: 60000 });
    return response.data;
  } catch (error) {
    console.error('ML reorder plan error:', error.message);
    throw new Error(`Reorder plan failed: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * POST /alerts to Python ML service
 * @param {Array} products - Product payloads
 */
exports.postAlerts = async (products) => {
  try {
    const response = await mlClient.post('/alerts', { products }, { timeout: 60000 });
    return response.data;
  } catch (error) {
    console.error('ML alerts error:', error.message);
    throw new Error(`Alerts failed: ${error.response?.data?.detail || error.message}`);
  }
};

// Helper: Calculate days to expiry
function calculateDaysToExpiry(expirationDate) {
  if (!expirationDate) return 30; // Default 30 days
  const now = new Date();
  const expiry = new Date(expirationDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Helper: Fallback demand estimation
function estimateFallbackDemand(product) {
  // Simple estimation based on turnover rate and stock
  const turnover = product.inventoryTurnoverRate || 1;
  const stock = product.currentStock || 0;
  const avgDailyDemand = (stock * turnover) / 30;
  return Math.round(avgDailyDemand * 7); // Weekly demand estimate
}
