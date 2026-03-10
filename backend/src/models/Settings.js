/**
 * Settings Model - Mongoose
 */

const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  defaultLeadTimeDays: {
    type: Number,
    default: 7
  },
  defaultSafetyStock: {
    type: Number,
    default: 10
  },
  forecastWeeks: {
    type: Number,
    default: 4
  },
  holidays: {
    type: [String],
    default: []
  },
  promotions: {
    type: [Object],
    default: []
  }
}, {
  timestamps: true
});

// Get settings (singleton pattern)
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      holidays: [
        '2026-01-14', '2026-02-04', '2026-04-13', '2026-04-14',
        '2026-05-01', '2026-05-23', '2026-06-25', '2026-07-20',
        '2026-10-31', '2026-11-14', '2026-12-25'
      ],
      promotions: []
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);
