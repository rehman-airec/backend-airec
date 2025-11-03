/**
 * Tenant Detection Middleware
 * 
 * Detects tenant from subdomain (production) or x-tenant-subdomain header (development).
 * If tenant is found, attaches tenant object to req.tenant.
 * If no tenant is found, continues normally (non-breaking for existing functionality).
 * 
 * Usage:
 * - Production: abc.mydomain.com -> detects "abc" subdomain (works with any domain)
 * - Development: abc.localhost:3000 or header x-tenant-subdomain: abc
 * 
 * This middleware is environment-aware and works with any domain configuration.
 */

const Tenant = require('../modules/tenant/tenant.model');
const { logger } = require('../config/database');

/**
 * Extract subdomain from hostname
 * Environment-aware: works with any domain (localhost in dev, any domain in prod)
 * 
 * Examples:
 * - abc.localhost -> "abc"
 * - abc.mydomain.com -> "abc"
 * - localhost -> null
 * - mydomain.com -> null
 */
function extractSubdomain(hostname) {
  if (!hostname) return null;
  
  // Remove port if present (e.g., "vision.localhost:3000" -> "vision.localhost")
  const hostWithoutPort = hostname.split(':')[0];
  
  // Split by dot
  const parts = hostWithoutPort.split('.');
  
  // If we have at least 2 parts and first part is not empty
  // e.g., "abc.localhost" or "abc.airec.com"
  if (parts.length >= 2 && parts[0] && parts[0] !== 'www') {
    // In development: "abc.localhost" -> ["abc", "localhost"]
    // In production: "abc.airec.com" -> ["abc", "airec", "com"]
    // Return first part as subdomain
    return parts[0].toLowerCase();
  }
  
  return null;
}

/**
 * Tenant Detection Middleware
 * 
 * This middleware:
 * 1. Checks for subdomain in request hostname
 * 2. Falls back to x-tenant-subdomain header (for local dev/testing)
 * 3. Looks up tenant in database if subdomain/header found
 * 4. Attaches tenant to req.tenant if found
 * 5. Continues normally even if no tenant found (non-breaking)
 */
const tenantFromSubdomain = async (req, res, next) => {
  try {
    let subdomain = null;
    
    // Method 1: Extract from subdomain in hostname (production)
    const hostname = req.get('host') || req.hostname;
    subdomain = extractSubdomain(hostname);
    
    // Method 2: Fall back to header (development/testing)
    if (!subdomain) {
      subdomain = req.get('x-tenant-subdomain');
      if (subdomain) {
        // Clean the subdomain value
        subdomain = subdomain.toLowerCase().trim();
      }
    }
    
    // If no subdomain found, continue without tenant context (non-breaking)
    if (!subdomain) {
      req.tenant = null;
      return next();
    }
    
    // Look up tenant by subdomain
    const tenant = await Tenant.findOne({ 
      subdomain: subdomain,
      isActive: true
    }).lean();
    
    if (tenant) {
      req.tenant = tenant;
      req.tenantId = tenant._id;
      
      // Log tenant context in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Tenant context: ${tenant.name} (${tenant.subdomain})`);
      }
    } else {
      // Tenant subdomain provided but not found in database
      // Log warning but continue (don't break existing flows)
      logger.warn(`Tenant subdomain "${subdomain}" not found or inactive`);
      req.tenant = null;
      req.tenantId = null;
    }
    
    next();
  } catch (error) {
    // Log error but continue (non-breaking behavior)
    logger.error('Error in tenant detection middleware:', error);
    req.tenant = null;
    req.tenantId = null;
    next();
  }
};

module.exports = tenantFromSubdomain;

