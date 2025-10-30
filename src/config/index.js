require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  
  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE,
  },
  
  // File upload configuration
  upload: {
    path: process.env.UPLOAD_PATH,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE),
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },
  
  // Security configuration
  security: {
    corsOrigin: process.env.FRONTEND_URL,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  },
  
  // Admin seed configuration
  admin: {
    seedEmail: process.env.ADMIN_SEED_EMAIL,
    seedPassword: process.env.ADMIN_SEED_PASSWORD,
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL,
  },
};

module.exports = config;
