const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');

let client = null;

const initialize = () => {
    if (process.env.DISABLE_REDIS === 'true') {
        logger.info('Redis is DISABLED for experimental mode');
        return;
    }
    try {
        const redisUrl = config.redisUrl || 'redis://localhost:6379';
        client = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        client.on('connect', () => {
            logger.info('Redis Connected');
        });

        client.on('error', (err) => {
            logger.error(`Redis Error: ${err.message}`);
        });

    } catch (error) {
        logger.error(`Failed to initialize Redis: ${error.message}`);
    }
};

// Initialize on load
initialize();

const get = async (key) => {
    if (!client) return null;
    return await client.get(key);
};

const set = async (key, value, expirySeconds = 300) => {
    if (!client) return;
    if (expirySeconds) {
        await client.set(key, value, 'EX', expirySeconds);
    } else {
        await client.set(key, value);
    }
};

const del = async (key) => {
    if (!client) return;
    await client.del(key);
};

const getClient = () => client;

module.exports = {
    get,
    set,
    del,
    getClient
};
