require('dotenv').config();

const toInt = (v, d = undefined) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};

const config = {
  // Server configuration
  port: toInt(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',
  
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
    maxFileSize: toInt(process.env.MAX_FILE_SIZE),
    allowedMimeTypes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
  },
  
  // Security configuration
  security: {
    corsOrigin: process.env.FRONTEND_URL,
    rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS),
    rateLimitMaxRequests: toInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  },
  
  // Mail configuration (supports Mailgun API or SMTP)
  mail: {
    driver: (process.env.MAIL_DRIVER || '').toLowerCase(),
    fromAddress: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_FROM,
    fromName: process.env.MAIL_FROM_NAME,
    encryption: process.env.MAIL_ENCRYPTION, // e.g. tls
    mailgun: {
      domain: process.env.MAILGUN_DOMAIN,
      secret: process.env.MAILGUN_SECRET,
      apiBase: process.env.MAILGUN_API_BASE,
    },
    smtp: {
      host: process.env.SMTP_HOST || process.env.MAIL_HOST,
      port: toInt(process.env.SMTP_PORT || process.env.MAIL_PORT),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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
