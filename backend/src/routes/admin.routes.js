/**
 * Admin Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const ReorderPlan = require('../models/ReorderPlan');
const ReorderPlanItem = require('../models/ReorderPlanItem');
const Settings = require('../models/Settings');
const mlService = require('../services/mlService');
const { protect, authorize } = require('../middleware/auth');

// GET /api/admin/users - Get all users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('username role lastLogin createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(u => ({ ...u.toObject(), id: u._id }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/users - Create user
router.post('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    const user = await User.create({
      username,
      password,
      role: role || 'store'
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalUsers,
      totalSales
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'Active' }),
      User.countDocuments(),
      Sale.countDocuments()
    ]);

    // Get low stock count
    const products = await Product.find({ status: 'Active' });
    const lowStockCount = products.filter(p => p.currentStock <= p.reorderPoint).length;

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await Sale.find({
      saleDate: { $gte: today },
      saleType: 'sale'
    });
    const todayRevenue = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        lowStockCount,
        outOfStockCount: products.filter(p => p.currentStock === 0).length,
        totalUsers,
        totalSales,
        todayRevenue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/admin/dashboard - Get dashboard data
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get products
    const products = await Product.find({ status: 'Active' });

    // Low stock products
    const lowStockProducts = products
      .filter(p => p.currentStock <= p.reorderPoint)
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 10)
      .map(p => ({ ...p.toObject(), id: p._id }));

    // Recent sales
    const recentSales = await Sale.find()
      .populate('product', 'sku name')
      .sort({ saleDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      dashboard: {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: products.filter(p => p.currentStock === 0).length,
        lowStockProducts,
        recentSales: recentSales.map(s => ({ ...s.toObject(), id: s._id }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/upload/products - Bulk upload products from CSV data
router.post('/upload/products', protect, authorize('admin'), async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products data provided'
      });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const row of products) {
      try {
        let product = await Product.findOne({ sku: row.sku });

        if (!product) {
          // Create new product
          product = await Product.create({
            sku: row.sku,
            name: row.name || row.product_name,
            category: row.category,
            price: parseFloat(row.price || row.unit_price) || 0,
            currentStock: parseInt(row.currentStock || row.current_stock || row.stock_quantity || row.quantity) || 0,
            reorderPoint: parseInt(row.reorderPoint || row.reorder_point || row.reorder_level || row.minStock) || 10,
            reorderQuantity: parseInt(row.reorderQuantity || row.reorder_quantity || row.maxStock) || 50,
            leadTimeDays: parseInt(row.leadTimeDays || row.leadTime || row.lead_time_days || row.lead_time) || 7,
            safetyStock: parseInt(row.safetyStock || row.safety_stock) || 10,
            warehouseLocation: row.warehouseLocation || row.warehouse_location || 'Main Warehouse',
            status: row.status || 'Active'
          });
          results.created++;
        } else {
          // Update existing product
          product.name = row.name || row.product_name || product.name;
          product.category = row.category || product.category;
          product.price = parseFloat(row.price || row.unit_price) || product.price;
          product.currentStock = parseInt(row.currentStock || row.current_stock || row.stock_quantity || row.quantity) ?? product.currentStock;
          product.reorderPoint = parseInt(row.reorderPoint || row.reorder_point || row.reorder_level || row.minStock) ?? product.reorderPoint;
          product.reorderQuantity = parseInt(row.reorderQuantity || row.reorder_quantity || row.maxStock) ?? product.reorderQuantity;
          product.leadTimeDays = parseInt(row.leadTimeDays || row.leadTime || row.lead_time_days || row.lead_time) ?? product.leadTimeDays;
          product.safetyStock = parseInt(row.safetyStock || row.safety_stock) ?? product.safetyStock;
          product.warehouseLocation = row.warehouseLocation || row.warehouse_location || product.warehouseLocation;
          product.status = row.status || product.status;
          await product.save();
          results.updated++;
        }
      } catch (err) {
        results.errors.push({ sku: row.sku, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${results.created} new products, updated ${results.updated} existing products`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/upload/sales - Bulk upload sales data from CSV
router.post('/upload/sales', protect, authorize('admin'), async (req, res) => {
  try {
    const { sales } = req.body;
    
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No sales data provided'
      });
    }

    const results = { created: 0, errors: [] };

    for (const row of sales) {
      try {
        // Find product by SKU
        const product = await Product.findOne({ sku: row.sku });
        if (!product) {
          results.errors.push({ sku: row.sku, error: 'Product not found' });
          continue;
        }

        await Sale.create({
          product: product._id,
          quantity: parseInt(row.quantity) || 1,
          unitPrice: parseFloat(row.unit_price || row.price) || product.price,
          totalAmount: parseFloat(row.total_amount) || (parseInt(row.quantity) * parseFloat(row.unit_price || row.price || product.price)),
          saleType: row.sale_type || row.saleType || 'sale',
          recordedBy: req.user._id,
          saleDate: row.date || row.sale_date ? new Date(row.date || row.sale_date) : new Date(),
          notes: row.notes || 'Imported from CSV'
        });
        results.created++;
      } catch (err) {
        results.errors.push({ sku: row.sku, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${results.created} sales records`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/stock-adjust - Adjust stock quantity
router.post('/stock-adjust', protect, authorize('admin'), async (req, res) => {
  try {
    const { productId, adjustment, reason } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const previousStock = product.currentStock;
    product.currentStock = Math.max(0, product.currentStock + adjustment);
    await product.save();

    // Record the adjustment as a sale/return entry
    if (adjustment !== 0) {
      await Sale.create({
        product: product._id,
        quantity: Math.abs(adjustment),
        unitPrice: 0,
        totalAmount: 0,
        saleType: adjustment > 0 ? 'return' : 'sale',
        recordedBy: req.user._id,
        saleDate: new Date(),
        notes: `Stock adjustment: ${reason || 'Manual adjustment'}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Stock adjusted for ${product.sku}`,
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        previousStock,
        newStock: product.currentStock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/train-model - Train ML model with specified algorithm
router.post('/train-model', protect, authorize('admin'), async (req, res) => {
  try {
    const { algorithm = 'random_forest' } = req.body;

    // Call ML service to train model (it fetches data from MongoDB itself)
    const result = await mlService.trainModel(algorithm);

    res.status(200).json({
      success: true,
      message: result.message || 'Model trained successfully',
      algorithm: result.metrics?.algorithm || algorithm,
      metrics: result.metrics || {},
      samples: result.metrics?.total_samples || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/factory-reset - Reset all data to initial state
router.post('/factory-reset', protect, authorize('admin'), async (req, res) => {
  try {
    const { confirmReset } = req.body;

    if (confirmReset !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Please confirm reset by sending confirmReset: "RESET_ALL_DATA"'
      });
    }

    // Delete all data in order
    await ReorderPlanItem.deleteMany({});
    await ReorderPlan.deleteMany({});
    await Sale.deleteMany({});
    await Product.deleteMany({});
    
    // Reset settings to defaults
    await Settings.updateOne({}, {
      defaultLeadTimeDays: 7,
      defaultSafetyStock: 10,
      forecastWeeks: 4,
      holidays: [],
      promotions: []
    });

    // Keep users but reset their login times
    await User.updateMany({}, { lastLogin: null });

    res.status(200).json({
      success: true,
      message: 'Factory reset completed. All products, sales, and reorder plans have been deleted.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/admin/ml-status - Get ML service status
router.get('/ml-status', protect, authorize('admin'), async (req, res) => {
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
      error: error.message
    });
  }
});

module.exports = router;
