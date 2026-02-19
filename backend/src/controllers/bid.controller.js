const { Bid, Project, User } = require('../models');
const { ApiError } = require('../middleware/error');
const blockchainService = require('../services/blockchain.service');
const { logAction } = require('../services/audit.service');
const logger = require('../utils/logger');

const placeBid = async (req, res, next) => {
    try {
        // Check if project exists and is open
        const project = await Project.findByPk(req.body.projectId);
        if (!project) {
            throw new ApiError(404, 'Project not found');
        }
        if (project.status !== 'OPEN') {
            throw new ApiError(400, 'Project is not open for bidding');
        }

        const bid = await Bid.create({
            ...req.body,
            contractorId: req.user.id,
            status: 'PENDING'
        });
        logger.info(`Bid placed: ${bid.id} by User ${req.user.id} on Project ${project.id}`);

        await logAction(req.user.id, 'PLACE_BID', 'Bid', bid.id, {
            projectId: project.id,
            amount: bid.amount
        });

        res.status(201).send(bid);
    } catch (err) {
        next(err);
    }
};

const getBidsForProject = async (req, res, next) => {
    try {
        const bids = await Bid.findAll({
            where: { projectId: req.params.projectId },
            include: [
                { model: User, as: 'contractor', attributes: ['name', 'email', 'credibilityScore'] }
            ]
        });
        res.send(bids);
    } catch (err) {
        next(err);
    }
};

const getMyBids = async (req, res, next) => {
    try {
        const bids = await Bid.findAll({
            where: { contractorId: req.user.id },
            include: [{ model: Project, attributes: ['title', 'status'] }]
        });
        res.send(bids);
    } catch (err) {
        next(err);
    }
}

const acceptBid = async (req, res, next) => {
    try {
        const { bidId } = req.params;
        const bid = await Bid.findByPk(bidId, {
            include: [{ model: Project }]
        });

        if (!bid) {
            throw new ApiError(404, 'Bid not found');
        }

        if (bid.Project.status !== 'OPEN') {
            throw new ApiError(400, 'Project is not open');
        }

        // 1. Update Bid Status
        bid.status = 'ACCEPTED';
        await bid.save();

        // 2. Update Project Status & Assign Contractor
        const project = bid.Project;
        project.status = 'IN_PROGRESS';
        // Assuming Project model has contractorId field, if not we might need to add it or rely on Bid.
        // For MVP, lets assume we update status. 
        await project.save();

        // 3. Create Project on Blockchain (Fund Escrow)
        // We need a wallet address for the contractor. 
        // For MVP, we'll use a mocked address or fetch from User profile if added.
        // Let's assume a default or mocked address for the contractor if not in DB.
        const contractorAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Hardhat Account #2

        try {
            const txHash = await blockchainService.createProjectOnChain(
                project.id,
                contractorAddress,
                bid.amount // Use bid amount as the agreed budget
            );
            logger.info(`Project ${project.id} escrow funded on-chain. Tx: ${txHash}`);
        } catch (bcError) {
            logger.error(`Blockchain Escrow creation failed: ${bcError.message}`);
            // In prod, revert DB changes or flag for manual retry
        }

        res.send({ bid, project });

        await logAction(req.user.id, 'ACCEPT_BID', 'Bid', bid.id, {
            projectId: project.id,
            amount: bid.amount,
            contractorId: bid.contractorId
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    placeBid,
    getBidsForProject,
    getMyBids,
    acceptBid
};
