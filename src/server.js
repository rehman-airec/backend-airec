const express = require('express');
const http = require('http');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import configuration
const config = require('./config');
const { connectDB, logger } = require('./config/database');


// Import routes from modules
const authRoutes = require('./modules/auth/auth.route');
const jobRoutes = require('./modules/jobs/job.route');
const applicationRoutes = require('./modules/application/application.route');
const guestApplicationRoutes = require('./modules/guestApplications/guestApplication.route');
const candidateRoutes = require('./modules/candidates/candidate.route');
const fileRoutes = require('./modules/files/file.route');
const profileRoutes = require('./modules/profile/profile.route');
const cvParsingRoutes = require('./modules/cvParsing/cvParsing.route');
const screeningTemplateRoutes = require('./modules/screeningTemplates/screeningTemplate.route');
const emailTemplateRoutes = require('./modules/events/emailTemplate.route');
const tenantRoutes = require('./modules/tenant/tenant.route');
const notificationRoutes = require('./modules/notifications/notification.route');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const tenantFromSubdomain = require('./middleware/tenantFromSubdomain');
const {
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  helmetConfig,
  corsConfig,
  mongoSanitize,
  xssProtection,
  requestLogger,
  securityHeaders,
  fileUploadSecurity
} = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const { initRealtime } = require('./services/realtime');

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Multi-tenant middleware - detects tenant from subdomain or header
// Must be early in the middleware stack to attach tenant context to all requests
// Non-breaking: continues normally if no tenant found
app.use(tenantFromSubdomain);

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);
app.use(corsConfig);

// Compression middleware
app.use(compression());

// Request logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Security middleware
app.use(mongoSanitize());
app.use(xssProtection);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/v1/auth', authRateLimit, authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/evaluation-templates', require('./modules/jobs/evaluationTemplate.route'));
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/guest', guestApplicationRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/files', uploadRateLimit, fileUploadSecurity, fileRoutes);
app.use('/api/v1/profile', generalRateLimit, profileRoutes);
app.use('/api/v1/cv', uploadRateLimit, fileUploadSecurity, cvParsingRoutes);
app.use('/api/v1/screening-templates', screeningTemplateRoutes);
app.use('/api/v1/email-templates', emailTemplateRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', tenantRoutes); // Multi-tenant routes

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api/v1/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    endpoints: {
      auth: {
        'POST /api/v1/auth/admin/signup': 'Admin signup',
        'POST /api/v1/auth/admin/login': 'Admin login',
        'POST /api/v1/auth/candidate/signup': 'Candidate signup',
        'POST /api/v1/auth/candidate/login': 'Candidate login',
        'POST /api/v1/auth/refresh': 'Refresh token',
        'GET /api/v1/auth/me': 'Get current user',
        'POST /api/v1/auth/logout': 'Logout',
        'PUT /api/v1/auth/change-password': 'Change password',
        'POST /api/v1/auth/forgot-password': 'Request password reset',
        'POST /api/v1/auth/reset-password': 'Reset password with token'
      },
      jobs: {
        'GET /api/v1/jobs': 'Get all jobs (public)',
        'GET /api/v1/jobs/search': 'Search jobs (public)',
        'GET /api/v1/jobs/:id': 'Get job by ID (public)',
        'POST /api/v1/jobs': 'Create job (admin)',
        'PUT /api/v1/jobs/:id': 'Update job (admin)',
        'PUT /api/v1/jobs/:id/step/:step': 'Update job step (admin)',
        'POST /api/v1/jobs/:id/publish': 'Publish job (admin)',
        'POST /api/v1/jobs/:id/close': 'Close job (admin)',
        'POST /api/v1/jobs/:id/archive': 'Archive job (admin)',
        'GET /api/v1/jobs/admin/jobs': 'Get admin jobs (admin)',
        'GET /api/v1/jobs/admin/stats': 'Get job stats (admin)',
        'GET /api/v1/jobs/:id/applications': 'Get job applications (admin)'
      },
      applications: {
        'POST /api/v1/applications/jobs/:jobId/apply': 'Apply for job (candidate)',
        'GET /api/v1/applications/candidate/applications': 'Get candidate applications (candidate)',
        'GET /api/v1/applications/:id': 'Get application by ID (admin)',
        'PUT /api/v1/applications/:id/status': 'Update application status (admin)',
        'POST /api/v1/applications/:id/note': 'Add note to application (admin)',
        'PUT /api/v1/applications/bulk/status': 'Bulk update application status (admin)',
        'GET /api/v1/applications/admin/stats': 'Get application stats (admin)',
        'GET /api/v1/applications/admin/analytics': 'Get application analytics (admin)'
      },
      guestApplications: {
        'POST /api/v1/guest/jobs/:jobId/apply/guest': 'Apply for job as guest (no auth)',
        'GET /api/v1/guest/track/:trackingToken': 'Track guest application by token (no auth)',
        'GET /api/v1/guest/applications/:email': 'Get guest applications by email (no auth)',
        'POST /api/v1/guest/convert-to-user': 'Convert guest application to user account (no auth)'
      },
      files: {
        'POST /api/v1/files/resume': 'Upload resume (authenticated)',
        'GET /api/v1/files/resume/:filename': 'Serve PDF file (authenticated)',
        'GET /api/v1/files/resume/:filename/info': 'Get file info (authenticated)',
        'GET /api/v1/files/list': 'List files (admin)',
        'DELETE /api/v1/files/resume/:filename': 'Delete file (admin)'
      },
      cvParsing: {
        'POST /api/v1/cv/parse': 'Parse uploaded CV and extract data (no auth)',
        'POST /api/v1/cv/validate': 'Validate CV file format and size (no auth)',
        'GET /api/v1/cv/stats': 'Get CV parsing service statistics (no auth)'
      },
      notifications: {
        'GET /api/v1/notifications': 'Get all notifications for current user (authenticated)',
        'GET /api/v1/notifications/unread-count': 'Get unread notification count (authenticated)',
        'PUT /api/v1/notifications/:id/read': 'Mark notification as read (authenticated)',
        'PUT /api/v1/notifications/read-all': 'Mark all notifications as read (authenticated)',
        'DELETE /api/v1/notifications/:id': 'Delete notification (authenticated)'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = config.port;
    // init realtime
    initRealtime(server, config.security.corsOrigin);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${PORT}/api/v1/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/v1/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();

module.exports = app;
