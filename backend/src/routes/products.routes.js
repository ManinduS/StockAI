/**
 * Product Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// GET /api/products - Get all products with filtering
router.get('/', protect, async (req, res) => {
  try {
    const { category, status, lowStock, search, limit = 100, offset = 0 } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    let products = await Product.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ name: 1 });

    // Filter low stock in JS (virtual field)
    if (lowStock === 'true') {
      products = products.filter(p => p.currentStock <= p.reorderPoint);
    }

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/products/categories - Get unique categories
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    categories.sort();

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/products/low-stock - Get low stock products
router.get('/low-stock', protect, async (req, res) => {
  try {
    const products = await Product.find({ status: 'Active' }).sort({ currentStock: 1 });
    const lowStockProducts = products.filter(p => p.currentStock <= p.reorderPoint);

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      products: lowStockProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/products/sku/:sku - Get product by SKU
router.get('/sku/:sku', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/products - Create product (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH /api/products/:id/stock - Update stock level
router.patch('/:id/stock', protect, async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const newStock = product.currentStock + adjustment;
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative'
      });
    }

    product.currentStock = newStock;
    await product.save();

    res.status(200).json({
      success: true,
      product,
      adjustment,
      reason
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
