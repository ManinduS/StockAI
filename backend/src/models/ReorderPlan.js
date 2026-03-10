/**
 * ReorderPlan Model - Mongoose
 */

const mongoose = require('mongoose');

const ReorderPlanSchema = new mongoose.Schema({
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'exported', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReorderPlan', ReorderPlanSchema);
