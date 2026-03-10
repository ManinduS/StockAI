/**
 * Product Model - Mongoose
 */

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'Please provide a SKU'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please provide a category']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price'],
    min: 0
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 10
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },
  leadTimeDays: {
    type: Number,
    default: 7
  },
  safetyStock: {
    type: Number,
    default: 10
  },
  warehouseLocation: {
    type: String,
    default: 'Main Warehouse'
  },
  status: {
    type: String,
    enum: ['Active', 'Discontinued', 'Backordered'],
    default: 'Active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isLowStock
ProductSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.reorderPoint;
});

module.exports = mongoose.model('Product', ProductSchema);
