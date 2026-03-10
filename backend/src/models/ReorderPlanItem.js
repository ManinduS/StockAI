/**
 * ReorderPlanItem Model - Mongoose
 */

const mongoose = require('mongoose');

const ReorderPlanItemSchema = new mongoose.Schema({
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReorderPlan',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true
  },
  predictedDemand: {
    type: Number,
    required: true
  },
  safetyStock: {
    type: Number,
    required: true
  },
  leadTimeDays: {
    type: Number,
    required: true
  },
  suggestedQty: {
    type: Number,
    required: true
  },
  reason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReorderPlanItem', ReorderPlanItemSchema);
