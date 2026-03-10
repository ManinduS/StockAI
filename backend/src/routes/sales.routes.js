/**
 * Sales Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// GET /api/sales - Get all sales with filtering
router.get('/', protect, async (req, res) => {
  try {
    const { productId, saleType, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (saleType) {
      query.saleType = saleType;
    }

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.saleDate.$lte = new Date(endDate);
      }
    }

    const sales = await Sale.find(query)
      .populate('product', 'sku name category')
      .populate('recordedBy', 'username')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ saleDate: -1 });

    res.status(200).json({
      success: true,
      count: sales.length,
      sales
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sales/summary - Get sales summary
router.get('/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.saleDate.$lte = new Date(endDate);
      }
    }

    const sales = await Sale.find(query);

    const summary = {
      totalSales: sales.filter(s => s.saleType === 'sale').reduce((sum, s) => sum + s.totalAmount, 0),
      totalReturns: sales.filter(s => s.saleType === 'return').reduce((sum, s) => sum + s.totalAmount, 0),
      salesCount: sales.filter(s => s.saleType === 'sale').length,
      returnsCount: sales.filter(s => s.saleType === 'return').length,
      netSales: 0
    };
    summary.netSales = summary.totalSales - summary.totalReturns;

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/sales - Record a sale/return
router.post('/', protect, async (req, res) => {
  try {
    const { productId, quantity, saleType = 'sale', notes } = req.body;

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Validate stock for sales
    if (saleType === 'sale' && product.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock'
      });
    }

    // Create sale record
    const sale = await Sale.create({
      product: productId,
      quantity,
      unitPrice: product.price,
      totalAmount: quantity * product.price,
      saleType,
      recordedBy: req.user._id,
      notes,
      saleDate: new Date()
    });

    // Update product stock
    const stockChange = saleType === 'sale' ? -quantity : quantity;
    product.currentStock += stockChange;
    await product.save();

    // Fetch sale with product info
    const saleWithProduct = await Sale.findById(sale._id).populate('product', 'sku name category');

    res.status(201).json({
      success: true,
      sale: saleWithProduct,
      newStock: product.currentStock
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sales/:id - Get single sale
router.get('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('product', 'sku name category');

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sales/stats/monthly - Get monthly sales statistics
router.get('/stats/monthly', protect, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    const sales = await Sale.find({ saleDate: { $gte: startDate } })
      .populate('product', 'sku name category')
      .sort({ saleDate: 1 });

    // Group by month
    const monthlyData = {};
    sales.forEach(sale => {
      const date = new Date(sale.saleDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalSales: 0,
          totalReturns: 0,
          salesCount: 0,
          returnsCount: 0,
          totalQuantity: 0
        };
      }
      
      const amount = sale.totalAmount || 0;
      if (sale.saleType === 'sale') {
        monthlyData[monthKey].totalSales += amount;
        monthlyData[monthKey].salesCount += 1;
        monthlyData[monthKey].totalQuantity += sale.quantity;
      } else {
        monthlyData[monthKey].totalReturns += amount;
        monthlyData[monthKey].returnsCount += 1;
        monthlyData[monthKey].totalQuantity -= sale.quantity;
      }
    });

    const monthlyStats = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json({
      success: true,
      monthlyStats
    });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/sales/stats/top-products - Get top selling products
router.get('/stats/top-products', protect, async (req, res) => {
  try {
    const { limit = 5, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const sales = await Sale.find({
      saleDate: { $gte: startDate },
      saleType: 'sale'
    }).populate('product', 'sku name category price');

    // Group by product
    const productStats = {};
    sales.forEach(sale => {
      const productId = sale.product?._id?.toString();
      if (!productId) return;
      
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          sku: sale.product?.sku,
          name: sale.product?.name,
          category: sale.product?.category,
          totalQuantity: 0,
          totalRevenue: 0,
          salesCount: 0
        };
      }
      productStats[productId].totalQuantity += sale.quantity;
      productStats[productId].totalRevenue += sale.totalAmount || 0;
      productStats[productId].salesCount += 1;
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      topProducts
    });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
