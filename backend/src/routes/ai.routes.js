/**
 * AI Routes — Node.js API Gateway for the Python ML service
 *
 * POST /api/ai/train-model
 * POST /api/ai/predict-demand
 * GET  /api/ai/inventory-insights
 * GET  /api/ai/reorder-plan
 * GET  /api/ai/alerts
 * GET  /api/ai/model-metrics
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const mlService = require('../services/mlService');
const { protect } = require('../middleware/auth');

// ─── helpers ────────────────────────────────────────────
/**
 * Build the product payload array the Python service expects.
 * Includes avg_weekly_sales derived from the sales collection.
 */
async function buildProductPayloads(products) {
  // Compute average weekly sales per product from the last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const salesAgg = await Sale.aggregate([
    { $match: { saleType: 'sale', saleDate: { $gte: since } } },
    { $group: { _id: '$product', totalQty: { $sum: '$quantity' } } }
  ]);
  const salesMap = {};
  salesAgg.forEach(s => { salesMap[String(s._id)] = s.totalQty; });

  const weeks = 90 / 7;

  return products.map(p => {
    const totalSold = salesMap[String(p._id)] || 0;
    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      current_stock: p.currentStock,
      reorder_point: p.reorderPoint,
      safety_stock: p.safetyStock,
      lead_time_days: p.leadTimeDays || 7,
      price: parseFloat(p.price) || 0,
      avg_weekly_sales: totalSold / weeks
    };
  });
}

// ─── POST /api/ai/train-model ───────────────────────────
router.post('/train-model', protect, async (req, res) => {
  try {
    const { algorithm = 'xgboost' } = req.body;
    const result = await mlService.trainModel(algorithm);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Train model error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/ai/predict-demand ────────────────────────
router.post('/predict-demand', protect, async (req, res) => {
  try {
    const { sku, weeks = 4 } = req.body;
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const prediction = await mlService.predict({
      sku: product.sku,
      category: product.category,
      currentStock: product.currentStock,
      reorderPoint: product.reorderPoint,
      reorderQuantity: product.reorderQuantity,
      price: product.price,
      warehouseLocation: product.warehouseLocation,
      status: product.status,
      leadTimeDays: product.leadTimeDays,
      safetyStock: product.safetyStock
    });

    const predictedDemand = (prediction.predictedDemand || prediction.prediction || 0) * weeks;
    const suggestedReorder = Math.max(0, Math.ceil(
      predictedDemand + product.safetyStock - product.currentStock
    ));

    res.json({
      success: true,
      product: product.name,
      sku: product.sku,
      predicted_demand: Math.round(predictedDemand),
      current_stock: product.currentStock,
      safety_stock: product.safetyStock,
      suggested_order: suggestedReorder,
      confidence: prediction.confidence || 0.85,
      explanation: `Order ${suggestedReorder} units of ${product.name} because predicted demand for the next ${weeks} week(s) is ${Math.round(predictedDemand)} units, safety stock is ${product.safetyStock} units, and current stock is ${product.currentStock} units.`
    });
  } catch (error) {
    console.error('Predict demand error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/ai/inventory-insights ─────────────────────
router.get('/inventory-insights', protect, async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' });
    const payloads = await buildProductPayloads(products);

    const mlRes = await mlService.postInsights(payloads);
    res.json({ success: true, count: mlRes.count, insights: mlRes.insights });
  } catch (error) {
    console.error('Inventory insights error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/ai/reorder-plan ───────────────────────────
router.get('/reorder-plan', protect, async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' });
    const payloads = await buildProductPayloads(products);

    const mlRes = await mlService.postReorderPlan(payloads);
    res.json({ success: true, ...mlRes });
  } catch (error) {
    console.error('Reorder plan error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/ai/alerts ─────────────────────────────────
router.get('/alerts', protect, async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' });
    const payloads = await buildProductPayloads(products);

    const mlRes = await mlService.postAlerts(payloads);
    res.json({ success: true, count: mlRes.count, alerts: mlRes.alerts });
  } catch (error) {
    console.error('Alerts error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/ai/model-metrics ──────────────────────────
router.get('/model-metrics', protect, async (req, res) => {
  try {
    const info = await mlService.getModelInfo();
    res.json({ success: true, ...info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
