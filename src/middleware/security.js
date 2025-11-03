const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const config = require('../config');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limit
const generalRateLimit = createRateLimit(
  config.security.rateLimitWindowMs,
  config.security.rateLimitMaxRequests,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limit for auth routes
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // Increased for testing (was inconsistent comment vs value)
  'Too many authentication attempts, please try again later.'
);

// File upload rate limit
const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  500, // Increased for testing (comment was inconsistent)
  'Too many file uploads, please try again later.'
);

// Helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
});

// CORS configuration
const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      config.security.corsOrigin,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // In development, allow any *.localhost subdomain (for multi-tenant testing)
    // This includes: vision.localhost:3000, company1.localhost:3000, etc.
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      // Match *.localhost with or without port
      const localhostPattern = /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/i;
      if (localhostPattern.test(origin)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CORS] Allowing subdomain origin: ${origin}`);
        }
        return callback(null, true);
      }
      // Also allow localhost without subdomain
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origin for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[CORS] Rejected origin: ${origin}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-subdomain'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
});

// XSS protection middleware
const xssProtection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// Recursively sanitize object
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// File upload security middleware
const fileUploadSecurity = (req, res, next) => {
  if (req.file) {
    // Check file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }
    
    // Check file size
    if (req.file.size > config.upload.maxFileSize) {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
    
    // Sanitize filename
    req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
  
  next();
};

module.exports = {
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
};
