const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { auth, roleMiddleware } = require('../middleware/auth');

// Admin Stats - Only Goverment accessible
router.get('/stats', auth, roleMiddleware('GOV'), dashboardController.getDashboardStats);

// Leaderboard - Publicly accessible
router.get('/leaderboard', dashboardController.getLeaderboard);

module.exports = router;
