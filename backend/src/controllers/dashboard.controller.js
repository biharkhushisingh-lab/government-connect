const fileDB = require('../services/fileDB');
const logger = require('../utils/logger');

const getDashboardStats = async (req, res, next) => {
    try {
        const projects = await fileDB.readJSON('projects.json');
        const contractors = await fileDB.readJSON('contractors.json');
        const milestones = await fileDB.readJSON('milestones.json');
        const invoices = await fileDB.readJSON('invoices.json');

        const data = {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'IN_PROGRESS').length,
            totalContractors: contractors.length,
            suspendedContractors: contractors.filter(c => c.suspensionHistory > 0).length,
            fraudFlagsToday: contractors.reduce((acc, c) => acc + c.fraudFlags, 0),
            milestonesRejected: milestones.filter(m => m.status === 'REJECTED').length,
            highRiskContractors: contractors.filter(c => c.avgRiskScore > 70)
        };

        res.json(data);
    } catch (err) {
        next(err);
    }
};

const getLeaderboard = async (req, res, next) => {
    try {
        const contractors = await fileDB.readJSON('contractors.json');

        const formatted = contractors
            .sort((a, b) => b.avgRiskScore - a.avgRiskScore) // Just a mock sort
            .map((entry, index) => ({
                rank: index + 1,
                contractor: entry.name,
                score: 100 - entry.avgRiskScore, // Mock scoring
                fraudFlags: entry.fraudFlags,
                completionRate: entry.completionRate
            }));

        res.json(formatted);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardStats,
    getLeaderboard
};
