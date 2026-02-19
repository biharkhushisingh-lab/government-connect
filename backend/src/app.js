const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { errorConverter, errorHandler } = require('./middleware/error');
const { ApiError } = require('./middleware/error');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

const { metricsMiddleware, metricsHandler } = require('./monitoring/metrics');
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

// Set security HTTP headers
app.use(helmet());

// Parse json request body with limit
app.use(express.json({ limit: '50mb' }));

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS — allow origins defined in CORS_ORIGIN env var (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Render health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.options('/{*path}', cors());

// Rate limiting (100 requests per 15 mins)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all requests
app.use(limiter);

console.log("Trace: Requiring middleware...");
const { tenantResolver } = require('./middleware/tenant');
app.use(tenantResolver);

console.log("Trace: Requiring routes/index...");
const routes = require('./routes');
console.log("Trace: Requiring experiment routes...");
const experimentRoute = require('./routes/experiment');

// v1 api routes
console.log("Trace: Registering routes...");
app.use('/v1', routes);
app.use('/experiment', experimentRoute);

console.log("Trace: App logic setup complete.");
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});
app.get('/', (req, res) => {
  res.json({ message: 'Government Contractor API is running securely' });
});

// Send 404 error for unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

module.exports = app;
