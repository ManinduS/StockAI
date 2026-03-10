/**
 * Forecast Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const mlService = require('../services/mlService');
const { protect } = require('../middleware/auth');

// POST /api/forecast/predict - Get prediction for a product
router.post('/predict', protect, async (req, res) => {
  try {
    const { sku, weeks = 4 } = req.body;

    // Find product
    const product = await Product.findOne({ sku });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get prediction from ML service
    const prediction = await mlService.predict({
      category: product.category,
      currentStock: product.currentStock,
      reorderPoint: product.reorderPoint,
      leadTimeDays: product.leadTimeDays,
      safetyStock: product.safetyStock,
      warehouseLocation: product.warehouseLocation,
      status: product.status,
      weeks
    });

    // Calculate suggested reorder
    const predictedDemand = prediction.prediction * weeks;
    const suggestedReorder = Math.max(0, Math.ceil(
      predictedDemand + product.safetyStock - product.currentStock
    ));

    // Generate weekly forecast
    const forecastWeeks = [];
    for (let i = 1; i <= weeks; i++) {
      forecastWeeks.push({
        week: i,
        predictedDemand: Math.round(prediction.prediction * (0.9 + Math.random() * 0.2))
      });
    }

    res.status(200).json({
      success: true,
      prediction: {
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        currentStock: product.currentStock,
        reorderPoint: product.reorderPoint,
        safetyStock: product.safetyStock,
        leadTimeDays: product.leadTimeDays,
        predictedDemand,
        suggestedReorder,
        confidence: prediction.confidence || 0.85,
        forecastWeeks,
        isFallback: prediction.isFallback || false
      }
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/forecast/batch - Batch predictions
router.post('/batch', protect, async (req, res) => {
  try {
    const { skus, weeks = 4 } = req.body;

    const products = await Product.find({ sku: { $in: skus } });

    const predictions = await Promise.all(
      products.map(async (product) => {
        try {
          const prediction = await mlService.predict({
            category: product.category,
            currentStock: product.currentStock,
            reorderPoint: product.reorderPoint,
            leadTimeDays: product.leadTimeDays,
            safetyStock: product.safetyStock,
            warehouseLocation: product.warehouseLocation,
            status: product.status,
            weeks
          });

          const predictedDemand = prediction.prediction * weeks;
          const suggestedReorder = Math.max(0, Math.ceil(
            predictedDemand + product.safetyStock - product.currentStock
          ));

          return {
            sku: product.sku,
            productName: product.name,
            currentStock: product.currentStock,
            predictedDemand,
            suggestedReorder,
            confidence: prediction.confidence || 0.85
          };
        } catch (err) {
          return {
            sku: product.sku,
            error: err.message
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      count: predictions.length,
      predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/forecast/ml-status - Get ML service status
router.get('/ml-status', protect, async (req, res) => {
  try {
    const status = await mlService.getStatus();
    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      status: 'offline',
      ml_service_error: error.message
    });
  }
});

// GET /api/forecast/health - Get ML service health (alias)
router.get('/health', protect, async (req, res) => {
  try {
    const status = await mlService.getStatus();
    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      status: 'offline',
      ml_service_error: error.message
    });
  }
});

module.exports = router;
