const { User, ContractorScore, AuditLog } = require('../models');
const logger = require('../utils/logger');

const checkAndBanContractor = async (contractorId) => {
    try {
        const score = await ContractorScore.findOne({ where: { contractorId } });
        if (!score) return;

        // Ban Logic: Score < 30 or Fraud Flags >= 3
        if (score.score < 30 || score.fraudFlags >= 3) {
            const contractor = await User.findByPk(contractorId);
            if (contractor && contractor.isActive !== false) { // Assuming we add isActive or verification status
                contractor.isVerified = false; // Revoke verification
                await contractor.save();

                await AuditLog.create({
                    action: 'AUTOMATIC_BAN',
                    performedBy: null, // System action
                    entityId: contractorId,
                    entityType: 'User',
                    details: {
                        reason: 'Fraud or Low Score trigger',
                        score: score.score,
                        fraudFlags: score.fraudFlags
                    }
                });

                logger.warn(`Contractor ${contractorId} verified status revoked due to low score/fraud.`);
            }
        }
    } catch (err) {
        logger.error('Error in anti-corruption check:', err);
    }
};

module.exports = {
    checkAndBanContractor
};
