/**
 * Reorder Plan Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const ReorderPlan = require('../models/ReorderPlan');
const ReorderPlanItem = require('../models/ReorderPlanItem');
const Product = require('../models/Product');
const User = require('../models/User');
const mlService = require('../services/mlService');
const { protect, authorize } = require('../middleware/auth');

// GET /api/reorder - Get all reorder plans
router.get('/', protect, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const plans = await ReorderPlan.find(query)
      .populate('generatedBy', 'username')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ generatedAt: -1 });

    // Add item count
    const plansWithCount = await Promise.all(
      plans.map(async (plan) => {
        const itemCount = await ReorderPlanItem.countDocuments({ plan: plan._id });
        return {
          ...plan.toObject(),
          id: plan._id,
          itemCount,
          generator: plan.generatedBy
        };
      })
    );

    res.status(200).json({
      success: true,
      count: plans.length,
      plans: plansWithCount
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/reorder/generate - Generate new reorder plan
router.post('/generate', protect, async (req, res) => {
  try {
    const { includeAllLowStock = true, customSafetyStock, forceAll = false } = req.body;

    // Get products that need reordering
    const products = await Product.find({ status: 'Active' });

    // Determine which products to include
    let targetProducts;
    if (forceAll) {
      targetProducts = products;
    } else if (includeAllLowStock) {
      targetProducts = products.filter(p => p.currentStock <= p.reorderPoint);
    } else {
      targetProducts = products.filter(p => p.currentStock === 0);
    }

    if (targetProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No products need reordering. Use "Include All Products" option to generate a forecast for all items.',
        plan: null
      });
    }

    // Create plan
    const plan = await ReorderPlan.create({
      generatedBy: req.user._id,
      status: 'pending',
      generatedAt: new Date()
    });

    // Generate items with predictions
    const items = await Promise.all(
      targetProducts.map(async (product) => {
        let predictedDemand = product.reorderQuantity;
        let confidence = 0.5;

        try {
          const prediction = await mlService.predict({
            category: product.category,
            currentStock: product.currentStock,
            reorderPoint: product.reorderPoint,
            leadTimeDays: product.leadTimeDays,
            safetyStock: product.safetyStock,
            warehouseLocation: product.warehouseLocation,
            status: product.status,
            weeks: Math.ceil(product.leadTimeDays / 7) || 1
          });
          predictedDemand = Math.round(prediction.prediction * (product.leadTimeDays / 7));
          confidence = prediction.confidence || 0.85;
        } catch (err) {
          console.log(`ML prediction failed for ${product.sku}, using fallback`);
        }

        const safetyStock = customSafetyStock || product.safetyStock;
        const suggestedQty = Math.max(0, Math.ceil(
          predictedDemand + safetyStock - product.currentStock
        ));

        let reason = 'Low stock';
        if (product.currentStock === 0) {
          reason = 'Out of stock';
        } else if (product.currentStock < product.safetyStock) {
          reason = 'Below safety stock';
        } else if (product.currentStock <= product.reorderPoint) {
          reason = 'At/Below reorder point';
        } else {
          reason = 'Forecast planning';
        }

        return ReorderPlanItem.create({
          plan: plan._id,
          product: product._id,
          sku: product.sku,
          productName: product.name,
          currentStock: product.currentStock,
          predictedDemand: Math.round(predictedDemand),
          safetyStock,
          leadTimeDays: product.leadTimeDays,
          suggestedQty,
          reason
        });
      })
    );

    // Fetch complete plan
    const completePlan = await ReorderPlan.findById(plan._id).populate('generatedBy', 'username');
    const planItems = await ReorderPlanItem.find({ plan: plan._id });

    res.status(201).json({
      success: true,
      plan: {
        ...completePlan.toObject(),
        id: completePlan._id,
        generator: completePlan.generatedBy,
        items: planItems
      }
    });
  } catch (error) {
    console.error('Generate plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reorder/:id - Get single plan
router.get('/:id', protect, async (req, res) => {
  try {
    const plan = await ReorderPlan.findById(req.params.id).populate('generatedBy', 'username');

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    const items = await ReorderPlanItem.find({ plan: plan._id });

    res.status(200).json({
      success: true,
      plan: {
        ...plan.toObject(),
        id: plan._id,
        generator: plan.generatedBy,
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reorder/:id/export - Export plan as CSV
router.get('/:id/export', protect, async (req, res) => {
  try {
    const plan = await ReorderPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Update status
    plan.status = 'exported';
    await plan.save();

    const items = await ReorderPlanItem.find({ plan: plan._id });

    // Generate CSV
    const headers = ['SKU', 'Product Name', 'Current Stock', 'Predicted Demand', 'Safety Stock', 'Lead Time (Days)', 'Suggested Order Qty', 'Reason'];
    const rows = items.map(item => [
      item.sku,
      `"${item.productName}"`,
      item.currentStock,
      item.predictedDemand,
      item.safetyStock,
      item.leadTimeDays,
      item.suggestedQty,
      `"${item.reason}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reorder_plan_${plan._id}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/reorder/:id/status - Update plan status
router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const plan = await ReorderPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    plan.status = status;
    await plan.save();

    res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/reorder/:id - Delete plan
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const plan = await ReorderPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Delete items first
    await ReorderPlanItem.deleteMany({ plan: plan._id });
    await ReorderPlan.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Plan deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
