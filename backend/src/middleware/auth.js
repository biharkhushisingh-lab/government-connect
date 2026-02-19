const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { ApiError } = require('./error');

const auth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new ApiError(401, 'Please authenticate');
        }

        const payload = jwt.verify(token, config.jwt.secret);
        const user = await User.findByPk(payload.sub);

        if (!user) {
            throw new ApiError(401, 'User no longer exists');
        }

        // Check if user is active (if we want to enforce ban logic here too)
        if (user.isActive === false) { // Strict check if column exists
            throw new ApiError(403, 'Account is disabled');
        }

        req.user = user;
        next();
    } catch (error) {
        next(new ApiError(401, 'Please authenticate'));
    }
};

const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Please authenticate'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError(403, 'Forbidden: Insufficient rights'));
        }
        next();
    };
};

module.exports = {
    auth,
    roleMiddleware
};
