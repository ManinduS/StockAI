/**
 * Settings Routes - Mongoose
 */

const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, authorize } = require('../middleware/auth');

// GET /api/settings - Get settings
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      defaultLeadTimeDays,
      defaultSafetyStock,
      forecastWeeks,
      holidays,
      promotions
    } = req.body;

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({
        defaultLeadTimeDays: defaultLeadTimeDays || 7,
        defaultSafetyStock: defaultSafetyStock || 10,
        forecastWeeks: forecastWeeks || 4,
        holidays: holidays || [],
        promotions: promotions || []
      });
    } else {
      if (defaultLeadTimeDays !== undefined) settings.defaultLeadTimeDays = defaultLeadTimeDays;
      if (defaultSafetyStock !== undefined) settings.defaultSafetyStock = defaultSafetyStock;
      if (forecastWeeks !== undefined) settings.forecastWeeks = forecastWeeks;
      if (holidays !== undefined) settings.holidays = holidays;
      if (promotions !== undefined) settings.promotions = promotions;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/settings/holidays - Add holiday
router.post('/holidays', protect, authorize('admin'), async (req, res) => {
  try {
    const { date } = req.body;
    const settings = await Settings.getSettings();

    if (!settings.holidays.includes(date)) {
      settings.holidays.push(date);
      settings.holidays.sort();
      await settings.save();
    }

    res.status(200).json({
      success: true,
      holidays: settings.holidays
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/settings/holidays/:date - Remove holiday
router.delete('/holidays/:date', protect, authorize('admin'), async (req, res) => {
  try {
    const { date } = req.params;
    const settings = await Settings.getSettings();

    settings.holidays = settings.holidays.filter(h => h !== date);
    await settings.save();

    res.status(200).json({
      success: true,
      holidays: settings.holidays
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/settings/promotions - Add promotion
router.post('/promotions', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, startDate, endDate, demandMultiplier } = req.body;
    const settings = await Settings.getSettings();

    settings.promotions.push({
      name,
      startDate,
      endDate,
      demandMultiplier: demandMultiplier || 1.0
    });
    await settings.save();

    res.status(200).json({
      success: true,
      promotions: settings.promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/settings/promotions/:index - Remove promotion
router.delete('/promotions/:index', protect, authorize('admin'), async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const settings = await Settings.getSettings();

    settings.promotions = settings.promotions.filter((_, i) => i !== index);
    await settings.save();

    res.status(200).json({
      success: true,
      promotions: settings.promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
