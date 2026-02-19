const express = require('express');
const { auth, roleMiddleware } = require('../middleware/auth');
const bidController = require('../controllers/bid.controller');

const router = express.Router();

router
    .route('/')
    .post(auth, roleMiddleware('CONTRACTOR'), bidController.placeBid)
    .get(auth, roleMiddleware('CONTRACTOR'), bidController.getMyBids);

router
    .route('/project/:projectId')
    .get(auth, roleMiddleware('GOVERNMENT', 'CONTRACTOR'), bidController.getBidsForProject);

router
    .route('/:bidId/accept')
    .post(auth, roleMiddleware('GOVERNMENT'), bidController.acceptBid);

module.exports = router;
