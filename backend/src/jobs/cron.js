const cron = require('node-cron');
const redisService = require('../services/redis.service');
const { Project, User, ContractorScore, Milestone, AuditLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const aggregateDashboardStats = async () => {
    logger.info('Running Dashboard Stats Aggregation Job...');
    try {
        const totalProjects = await Project.count();
        const activeProjects = await Project.count({ where: { status: 'IN_PROGRESS' } });
        const totalContractors = await User.count({ where: { role: 'CONTRACTOR' } });
        const suspendedContractors = await User.count({ where: { role: 'CONTRACTOR', isActive: false } });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const fraudFlagsToday = await AuditLog.count({
            where: {
                action: { [Op.or]: ['FRAUD_DETECTED', 'FRAUD_FLAG_ADDED'] },
                createdAt: { [Op.gte]: startOfDay }
            }
        });

        const milestonesRejected = await Milestone.count({ where: { status: 'REJECTED' } });

        const highRiskContractors = await ContractorScore.findAll({
            where: { totalScore: { [Op.lt]: 50 } },
            include: [{ model: User, attributes: ['id', 'name', 'email'] }]
        });

        const data = {
            totalProjects,
            activeProjects,
            totalContractors,
            suspendedContractors,
            fraudFlagsToday,
            milestonesRejected,
            highRiskContractors
        };

        // Populate Redis Cache
        await redisService.set('dashboard:stats', JSON.stringify(data), 3600); // 1 hour expiry (refreshed every 5 mins)
        logger.info('Dashboard Stats Aggregated and Cached.');

    } catch (error) {
        logger.error(`Dashboard Aggregation Failed: ${error.message}`);
    }
};

const initCronJobs = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', aggregateDashboardStats);
    logger.info('Cron Jobs Initialized');
};

module.exports = {
    initCronJobs
};
