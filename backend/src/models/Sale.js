/**
 * Sale Model - Mongoose
 */

const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  saleType: {
    type: String,
    enum: ['sale', 'return'],
    default: 'sale'
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Calculate totalAmount before save
SaleSchema.pre('save', function(next) {
  this.totalAmount = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model('Sale', SaleSchema);
