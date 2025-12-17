require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { connectDB } = require('./config/database');
const swaggerSpecs = require('./config/swagger');
const sessionMiddleware = require('./middleware/session');

// [NEW] Import Security Middleware
const { apiLimiter, enforceHTTPS } = require('./middleware/security');

const app = express();

// Ngrok and proxy handling middleware
app.use((req, res, next) => {
  app.set('trust proxy', true); // Essential for rate-limit and https-check to work behind proxies
  if (req.headers['x-forwarded-proto']) {
    req.protocol = req.headers['x-forwarded-proto'];
  }
  if (req.headers['x-forwarded-host']) {
    req.headers.host = req.headers['x-forwarded-host'];
  }
  next();
});

// [NEW] 1. Apply Conditional HTTPS (Must be before other middleware)
app.use(enforceHTTPS);

// Connect to database
connectDB();

// [NEW] 2. Apply Rate Limiting (Global limiter for all API routes)
// You can also apply this specifically to /api/auth if you prefer
app.use('/api', apiLimiter);

// [MODIFIED] 3. Secure Headers (Helmet)
// specific HSTS config for production security
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Only enable HSTS (Strict-Transport-Security) in production
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);

// More robust CORS configuration
const allowedOrigins = [
  'https://uitm-devops-challenge-old-jeans-fkk4-p64nrcf53.vercel.app',
  'https://curious-lively-monster.ngrok-free.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://rentverse.terablock.space',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Forwarded-Proto',
    'X-Forwarded-Host',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for OAuth)
app.use(sessionMiddleware);

// Static files
app.use(express.static('public'));

// Serve uploaded PDFs from uploads directory with proper security
const path = require('path');
app.use(
  '/api/files/pdfs',
  express.static(path.join(__dirname, '../uploads/pdfs'), {
    // Only allow PDF files
    setHeaders: (res, path, stat) => {
      if (path.endsWith('.pdf')) {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline'); // Display in browser instead of download
        res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      } else {
        res.status(404).end(); // Block non-PDF files
      }
    },
  })
);

// Swagger UI setup
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2 }
      .server-info { 
        background: #e3f2fd; 
        padding: 10px; 
        border-radius: 5px; 
        margin: 10px 0;
        border-left: 4px solid #1976d2;
      }
    `,
    customSiteTitle: 'Rentverse API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      servers: [
        {
          url:
            process.env.NGROK_URL ||
            `http://localhost:${process.env.PORT || 3000}`,
          description: process.env.NGROK_URL
            ? `🌐 Ngrok Tunnel: ${process.env.NGROK_URL}`
            : `🏠 Local Server: http://localhost:${process.env.PORT || 3000}`,
        },
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: '🏠 Local Development Server',
        },
      ],
    },
  })
);

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./modules/users/users.routes');
const propertyRoutes = require('./modules/properties/properties.routes');
const bookingRoutes = require('./modules/bookings/bookings.routes');
const propertyTypeRoutes = require('./modules/propertyTypes/propertyTypes.routes');
const amenityRoutes = require('./modules/amenities/amenities.routes');
const predictionRoutes = require('./modules/predictions/predictions.routes');
const securityRoutes = require('./routes/security');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/property-types', propertyTypeRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/security', securityRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns a welcome message for the API
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to Rentverse Backend API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 docs:
 *                   type: string
 *                   example: Visit /docs for API documentation
 *                 database:
 *                   type: string
 *                   example: Connected to PostgreSQL via Prisma
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Rentverse Backend API',
    version: '1.0.0',
    docs: 'Visit /docs for API documentation',
    database: 'Connected to PostgreSQL via Prisma',
    environment: process.env.NODE_ENV || 'development',
    cors: 'CORS configured for development',
    ngrok: process.env.NGROK_URL || 'No ngrok URL configured',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  });
});

/**
 * @swagger
 * /cors-test:
 *   get:
 *     summary: CORS test endpoint
 *     description: Test endpoint for CORS functionality
 *     tags: [General]
 *     responses:
 *       200:
 *         description: CORS test successful
 */
app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    host: req.headers.host,
    forwardedHost: req.headers['x-forwarded-host'],
    forwardedProto: req.headers['x-forwarded-proto'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /cors-test:
 *   post:
 *     summary: CORS POST test endpoint
 *     description: Test POST endpoint for CORS functionality
 *     tags: [General]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CORS POST test successful
 */
app.post('/cors-test', (req, res) => {
  res.json({
    message: 'CORS POST test successful!',
    body: req.body,
    origin: req.headers.origin,
    host: req.headers.host,
    forwardedHost: req.headers['x-forwarded-host'],
    forwardedProto: req.headers['x-forwarded-proto'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and database
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   example: Connected
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 *       503:
 *         description: Service unavailable
 */
app.get('/health', async (req, res) => {
  try {
    const { prisma } = require('./config/database');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message,
      uptime: process.uptime(),
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Global error handler:', err.stack);

  // Handle Prisma errors
  if (err.code?.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: 'Database error',
      message: 'A database error occurred',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: 'Invalid token',
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong!'
        : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
