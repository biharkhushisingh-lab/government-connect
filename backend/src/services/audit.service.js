const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Log an action to the audit table
 * @param {string} userId - UUID of the user performing the action
 * @param {string} action - Action name (e.g. 'CREATE_PROJECT')
 * @param {string} entityType - Type of entity affected (e.g. 'Project')
 * @param {string} entityId - UUID of the entity
 * @param {object} metadata - Additional details
 */
const logAction = async (userId, action, entityType, entityId, metadata = {}) => {
    try {
        await AuditLog.create({
            performedBy: userId,
            action,
            entityType,
            entityId,
            metadata
        });
    } catch (error) {
        // We do not want to fail the main transaction just because logging failed, 
        // but we should log the specific error to the console/file.
        logger.error(`Audit Log Failed: ${error.message}`);
    }
};

module.exports = {
    logAction
};
