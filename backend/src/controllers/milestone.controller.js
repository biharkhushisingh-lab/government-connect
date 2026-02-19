const { Milestone, Project, Bid, User, ContractorScore } = require('../models');
const { ApiError } = require('../middleware/error');
const blockchainService = require('../services/blockchain.service');
const { logAction } = require('../services/audit.service');
const aiService = require('../services/ai.service');
const scoringService = require('../services/scoring.service');
const logger = require('../utils/logger');

const createMilestone = async (req, res, next) => {
    try {
        const milestone = await Milestone.create(req.body);
        // Note: In a real app, we might create milestone structure on-chain too 
        // or just lock funds. For this MVP, we lock funds when project starts.

        await logAction(req.user.id, 'CREATE_MILESTONE', 'Milestone', milestone.id, {
            projectId: milestone.projectId,
            amount: milestone.amount,
            title: milestone.title
        });

        res.status(201).send(milestone);
    } catch (err) {
        next(err);
    }
};

const { fraudQueue } = require('../queues/fraud.queue');

const verifyMilestone = async (req, res, next) => {
    try {
        const { milestoneId } = req.params;
        const milestone = await Milestone.findByPk(milestoneId);

        if (!milestone) {
            throw new ApiError(404, 'Milestone not found');
        }

        if (milestone.status === 'VERIFIED') {
            throw new ApiError(400, 'Milestone already verified');
        }

        if (milestone.status === 'PENDING_VERIFICATION') {
            return res.status(200).send({ message: 'Milestone is already being verified' });
        }

        // 1. Fetch Project & Contractor details
        const project = await Project.findByPk(milestone.projectId);
        const acceptedBid = await Bid.findOne({
            where: { projectId: milestone.projectId, status: 'ACCEPTED' },
            include: [{ model: User, as: 'contractor' }]
        });

        if (!acceptedBid || !acceptedBid.contractor) {
            throw new ApiError(400, 'No accepted contractor found for this project');
        }

        const contractor = acceptedBid.contractor;

        // 2. Prepare AI Fraud Analysis Data
        const aiData = {
            invoiceNumber: milestone.id,
            amount: parseFloat(milestone.amount),
            projectBudget: parseFloat(project.budget),
            supplier: contractor.name,
            supplierRedlisted: req.body.supplierRedlisted || false,
            duplicateInvoice: req.body.duplicateInvoice || false,
            imageHasGPS: req.body.imageHasGPS !== undefined ? req.body.imageHasGPS : true,
            imageDateValid: req.body.imageDateValid !== undefined ? req.body.imageDateValid : true
        };

        // 3. Add to Background Queue
        await fraudQueue.add('analyze', {
            milestoneId: milestone.id,
            contractorId: contractor.id,
            aiData,
            user: { id: req.user.id } // Pass minimal user info for logging
        });

        // 4. Update Status to show it's processing
        milestone.status = 'PENDING_VERIFICATION';
        await milestone.save();

        res.status(200).send({
            message: 'Milestone submitted for background verification. Status will update shortly.',
            milestoneId: milestone.id
        });

    } catch (err) {
        next(err);
    }
};

const getMilestones = async (req, res, next) => {
    try {
        const milestones = await Milestone.findAll({
            where: { projectId: req.params.projectId }
        });
        res.send(milestones);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createMilestone,
    verifyMilestone,
    getMilestones
};
