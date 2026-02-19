const dotenv = require('dotenv');
const joi = require('joi');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define validation schema
const envVarsSchema = joi.object().keys({
    NODE_ENV: joi.string().valid('production', 'development', 'test').required(),
    PORT: joi.number().default(5000),
    DB_HOST: joi.string().required().description('Database host'),
    DB_PORT: joi.number().default(5432).description('Database port'),
    DB_USER: joi.string().required().description('Database user'),
    DB_PASS: joi.string().required().description('Database password'),
    DB_NAME: joi.string().required().description('Database name'),
    JWT_SECRET: joi.string().required().description('JWT secret key'),
    JWT_EXPIRES_IN: joi.string().default('30m').description('access token expiration'),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d').description('refresh token expiration'),
    BCRYPT_ROUNDS: joi.number().default(10).description('bcrypt salt rounds'),
    AI_SERVICE_URL: joi.string().required().description('AI Service URL'),
    BLOCKCHAIN_RPC_URL: joi.string().required().description('Blockchain RPC URL'),
    GOV_PRIVATE_KEY: joi.string().description('Government Wallet Private Key'),
    CONTRACT_ADDRESS: joi.string().description('Smart Contract Address'),
    CORS_ORIGIN: joi.string().default('http://localhost:3000').description('CORS allowed origin'),
}).unknown();

// Validate
const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
    console.error(`Config validation error details: ${error.message}`);
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = envVars;
