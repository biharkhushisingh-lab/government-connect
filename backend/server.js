const app = require('./src/app');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const { sequelize } = require('./src/models');

let server;

const { initCronJobs } = require('./src/jobs/cron');

// sequelize.authenticate().then(() => {
//     logger.info('Connected to PostgreSQL');

//     // Initialize Background Jobs
//     // initCronJobs();

server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
    logger.info(`Running in EXPERIMENTAL MODE (File DB)`);
});
// }).catch((err) => {
//     logger.error('Unable to connect to database:', err);
// });

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
        server.close();
    }
});
