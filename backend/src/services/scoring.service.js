const { ContractorScore, User } = require('../models');
const { logAction } = require('./audit.service');
const logger = require('../utils/logger');

/**
 * Calculate and update a contractor's score
 * @param {string} contractorId 
 * @param {object} metrics - { completionRate, delayPenalty, fraudFlags, financialCompliance }
 * @returns {Promise<ContractorScore>}
 */
const calculateScore = async (contractorId, metrics = {}) => {
    try {
        let scoreRecord = await ContractorScore.findOne({ where: { contractorId } });

        if (!scoreRecord) {
            scoreRecord = await ContractorScore.create({ contractorId });
        }

        // update metrics if provided, else keep existing
        if (metrics.completionRate !== undefined) scoreRecord.completionRate = metrics.completionRate;
        if (metrics.delayPenalty !== undefined) scoreRecord.delayPenalty = metrics.delayPenalty;
        if (metrics.fraudFlags !== undefined) scoreRecord.fraudFlags = metrics.fraudFlags;
        if (metrics.financialCompliance !== undefined) scoreRecord.financialCompliance = metrics.financialCompliance;

        // Formula: 
        // (completionRate * 0.4) + (financialCompliance * 0.3) - (delayPenalty * 0.2) - (fraudFlags * 0.1)
        // Wait, fraudFlags * 0.1 is very small for a flag. Usually flags are heavy penalties. 
        // But adhering strictly to prompt: "fraudFlags * 0.1" (Could mean 10% per flag? or just 0.1?)
        // Prompt says "fraudFlags * 0.1". If fraudFlags is an integer count (e.g. 1, 2), 0.1 deduction is negligible. 
        // However, if "fraudFlags" is a Score component (0-100), then 0.1 weighing makes sense.
        // Prompt says: "fraudFlags (integer)".
        // Interpretation: Maybe the user meant `fraudFlags * 10`? 
        // user prompt: "(fraudFlags * 0.1)". I will follow the prompt exactly for the coefficient, 
        // but often 'flags' implies a count. 
        // Actuallly, looking at the other terms: completionRate (0-100) * 0.4 = ~40.
        // If fraudFlags is '1', 1 * 0.1 = 0.1. That's tiny. 
        // I will implement strictly as requested but add a comment. 

        let rawScore =
            (scoreRecord.completionRate * 0.4) +
            (scoreRecord.financialCompliance * 0.3) -
            (scoreRecord.delayPenalty * 0.2) -
            (scoreRecord.fraudFlags * 5.0); // ADJUSTMENT: 0.1 is likely a typo for a penalty per flag. 
        // BUT strict adherence: "fraudFlags * 0.1". I will stick to prompt but maybe scale the integer?
        // Re-reading prompt: "fraudFlags * 0.1". 
        // If I have 5 flags, penalty is 0.5. 
        // Let's assume the user meant what they wrote. I will use 0.1. 
        // actually, let's assume fraudFlags is a 'score' itself? No, "integer".
        // I'll stick to the math: (fraudFlags * 0.1)

        // Wait, standard weighting: 0.4 + 0.3 = 0.7 positives.
        // 0.2 + 0.1 = 0.3 negatives.
        // So 100 completion + 100 compliance = 40 + 30 = 70.
        // Perfect score is 70? That seems low. 
        // Usually weights sum to 1.0 for positive components? 
        // Or maybe (Completion * 0.4 + Compliance * 0.3 + SomethingElse * 0.3).
        // The prompt formula has Negatives: - Delay - Fraud.
        // If Delay is 0 and Fraud is 0. Max pos score is 70. 
        // Provide the calculation exactly as requested.

        // Let's re-read: "totalScore = (completionRate * 0.4) + ... "
        // It might be that the user wants these weights.

        // Correction: I will normalize it to 100? No, "Ensure score is between 0 and 100".
        // I will implement the formula exactly. 

        rawScore =
            (scoreRecord.completionRate * 0.4) +
            (scoreRecord.financialCompliance * 0.3) -
            (scoreRecord.delayPenalty * 0.2) -
            (scoreRecord.fraudFlags * 0.1);

        // Clamp
        scoreRecord.totalScore = Math.max(0, Math.min(100, rawScore));

        await scoreRecord.save();

        // Sync with User model for easy access
        const user = await User.findByPk(contractorId);
        if (user) {
            user.credibilityScore = Math.round(scoreRecord.totalScore);

            // Automatic Suspension for low scores
            if (user.isActive && scoreRecord.totalScore < 40) {
                user.isActive = false;

                await logAction(contractorId, 'CONTRACTOR_SUSPENDED', 'User', contractorId, {
                    reason: 'Low Credibility Score',
                    score: scoreRecord.totalScore
                });
                logger.warn(`Contractor ${contractorId} suspended due to low score: ${scoreRecord.totalScore}`);
            }

            await user.save();
        }

        // --- Predictive Risk Modeling Integration ---
        try {
            // Prepare features for AI model
            const features = {
                completionRate: scoreRecord.completionRate,
                avgDelayDays: scoreRecord.delayPenalty, // Assuming penalty ~ days for now
                fraudFlags: scoreRecord.fraudFlags,
                duplicateImageCount: 0, // Need to fetch from AuditLog or agregated stats. 0 for MVP.
                anomalyCount: 0,        // Need to fetch from AuditLog. 0 for MVP.
                totalProjects: await user.countProjects(), // Helper method or use raw count
                avgRiskScore: scoreRecord.totalScore, // Using current score as proxy for history
                suspensionHistory: user.isActive ? 0 : 1
            };

            const aiResponse = await require('./ai.service').predictContractorRisk(features);

            if (aiResponse && aiResponse.riskLevel) {
                scoreRecord.predictedRisk = aiResponse.riskLevel;
                scoreRecord.predictedProbability = aiResponse.riskProbability;
                await scoreRecord.save();

                // Governance Rule: High Risk = Flag
                if (aiResponse.riskLevel === 'HIGH') {
                    logger.warn(`Behavioral Model flagged Contractor ${contractorId} as HIGH RISK (${aiResponse.riskProbability})`);
                    await logAction(contractorId, 'PREDICTIVE_RISK_FLAG', 'ContractorScore', scoreRecord.id, {
                        probability: aiResponse.riskProbability,
                        factors: aiResponse.topFactors
                    });
                }
            }

        } catch (aiError) {
            logger.error(`Predictive Risk Model Failed: ${aiError.message}`);
            // Do not fail the scoring process if AI fails
        }

        return scoreRecord;
    } catch (error) {
        logger.error(`Scoring Failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
    calculateScore
};
