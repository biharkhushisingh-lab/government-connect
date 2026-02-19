const { ApiError } = require('../middleware/error');
const logger = require('../utils/logger');

const tenantResolver = (req, res, next) => {
    // 1. Try Header
    let tenantId = req.headers['x-tenant-id'];

    // 2. Try User JWT (if authenticated)
    if (!tenantId && req.user && req.user.tenantId) {
        tenantId = req.user.tenantId;
    }

    // 3. For MVP/Testing, default to a fixed Tenant if explicitly allowed
    if (!tenantId && process.env.DEFAULT_TENANT_ID) {
        tenantId = process.env.DEFAULT_TENANT_ID;
    }

    if (!tenantId) {
        // Only block if we strictly require multitenancy for this route
        // For public routes (like login), we might loose validation
        // But generally, for API operations, we need context.
        // Assuming strict mode for now:
        // return next(new ApiError(400, 'Tenant ID is missing'));

        // Soft fallback for now:
        req.tenantId = null;
        return next();
    }

    req.tenantId = tenantId;
    next();
};

const requireTenant = (req, res, next) => {
    if (!req.tenantId) {
        return next(new ApiError(400, 'Tenant Context Required'));
    }
    next();
};

module.exports = {
    tenantResolver,
    requireTenant
};
