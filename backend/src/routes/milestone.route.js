const express = require('express');
const { auth, roleMiddleware } = require('../middleware/auth');
const milestoneController = require('../controllers/milestone.controller');

const router = express.Router();

router
    .route('/')
    .post(auth, roleMiddleware('GOVERNMENT'), milestoneController.createMilestone);

router
    .route('/project/:projectId')
    .get(auth, milestoneController.getMilestones);

router
    .route('/:milestoneId/verify')
    .post(auth, roleMiddleware('GOVERNMENT'), milestoneController.verifyMilestone);

module.exports = router;
