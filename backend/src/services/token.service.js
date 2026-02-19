const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');

const generateToken = (user, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: user.id,
        role: user.role,
        type,
    };
    // expires can be '30m', '1h' etc. handled by jwt.sign
    return jwt.sign(payload, secret, { expiresIn: expires });
};

const generateAuthTokens = async (user) => {
    const accessToken = generateToken(user, config.jwt.accessExpiration, 'access');

    // Decode to get the exact expiration time calculated by jsonwebtoken
    const decoded = jwt.decode(accessToken);
    const accessExpires = moment.unix(decoded.exp);

    return {
        access: {
            token: accessToken,
            expires: accessExpires.toDate(),
        },
    };
};

module.exports = {
    generateToken,
    generateAuthTokens,
};
