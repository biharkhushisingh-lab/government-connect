const envVars = require('./env');

module.exports = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    cors: {
        origin: envVars.CORS_ORIGIN,
    },
    db: {
        host: envVars.DB_HOST,
        port: envVars.DB_PORT,
        user: envVars.DB_USER,
        password: envVars.DB_PASS,
        name: envVars.DB_NAME,
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpiration: envVars.JWT_EXPIRES_IN,
        refreshExpiration: envVars.JWT_REFRESH_EXPIRES_IN,
    },
    encryption: {
        bfrounds: envVars.BCRYPT_ROUNDS
    },
    services: {
        ai: envVars.AI_SERVICE_URL,
        blockchain: envVars.BLOCKCHAIN_RPC_URL,
    },
    blockchain: {
        privateKey: envVars.GOV_PRIVATE_KEY,
        contractAddress: envVars.CONTRACT_ADDRESS,
    }
};
