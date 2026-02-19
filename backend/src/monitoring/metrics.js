const client = require('prom-client');
const config = require('../config/config');

// Create a Registry
const register = new client.Registry();

// Add default metrics (cpu, memory, etc.)
client.collectDefaultMetrics({ register });

// --- Custom Metrics ---

const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 1.5, 2, 5]
});

const fraudCheckCounter = new client.Counter({
    name: 'fraud_check_total',
    help: 'Total number of fraud checks performed',
    labelNames: ['status'] // 'VERIFIED', 'REJECTED', 'UNDER_REVIEW'
});

const queueJobCounter = new client.Gauge({
    name: 'fraud_queue_jobs',
    help: 'Number of jobs currently in the fraud check queue'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(fraudCheckCounter);
register.registerMetric(queueJobCounter);

const metricsMiddleware = (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

        // Normalize route to avoid high cardinality (remove IDs)
        // Simple regex to replace UUIDs or numbers
        const route = req.route ? req.route.path : req.path;

        httpRequestDurationMicroseconds
            .labels(req.method, route, res.statusCode)
            .observe(durationInSeconds);
    });

    next();
};

const metricsHandler = async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
};

module.exports = {
    metricsMiddleware,
    metricsHandler,
    fraudCheckCounter,
    queueJobCounter
};
