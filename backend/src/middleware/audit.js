const { AuditLog } = require('../models');
const logger = require('../utils/logger');

const audit = (action) => async (req, res, next) => {
    // Capture the original send function to intercept response
    const originalSend = res.send;

    res.send = function (body) {
        res.send = originalSend;
        res.send(body);

        // Async logging after response is sent
        const logData = {
            action,
            performedBy: req.user ? req.user.id : null,
            ipAddress: req.ip,
            entityId: req.params.id || (body && body.id ? body.id : null), // Try to capture ID
            entityType: req.baseUrl.split('/').pop(), // e.g. 'projects'
            details: {
                method: req.method,
                url: req.originalUrl,
                body: req.body,
                statusCode: res.statusCode,
            },
        };

        AuditLog.create(logData).catch((err) => {
            logger.error('Failed to create audit log:', err);
        });
    };

    next();
};

module.exports = audit;
