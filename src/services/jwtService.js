const jwt = require('jsonwebtoken');
const config = require('../config');

class JWTService {
  /**
   * Generate access token with role and tenantId
   * @param {string} userId - User ID
   * @param {string} userType - User type ('admin' or 'candidate')
   * @param {string} role - User role ('superadmin', 'recruiter', 'candidate', 'employee')
   * @param {string} tenantId - Optional tenant ID
   */
  static generateAccessToken(userId, userType, role = null, tenantId = null) {
    const payload = { userId, userType };
    
    // Include role in token if provided
    if (role) {
      payload.role = role;
    }
    
    // Include tenantId in token if provided
    if (tenantId) {
      payload.tenantId = tenantId;
    }
    
    return jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Generate refresh token with role and tenantId
   * @param {string} userId - User ID
   * @param {string} userType - User type ('admin' or 'candidate')
   * @param {string} role - User role ('superadmin', 'recruiter', 'candidate', 'employee')
   * @param {string} tenantId - Optional tenant ID
   */
  static generateRefreshToken(userId, userType, role = null, tenantId = null) {
    const payload = { userId, userType, type: 'refresh' };
    
    // Include role in token if provided
    if (role) {
      payload.role = role;
    }
    
    // Include tenantId in token if provided
    if (tenantId) {
      payload.tenantId = tenantId;
    }
    
    return jwt.sign(
      payload,
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  static verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  static verifyRefreshToken(token) {
    return jwt.verify(token, config.jwt.refreshSecret);
  }

  /**
   * Generate token pair (access + refresh) with role and tenantId
   * @param {string} userId - User ID
   * @param {string} userType - User type ('admin' or 'candidate')
   * @param {string} role - User role ('superadmin', 'recruiter', 'candidate', 'employee')
   * @param {string} tenantId - Optional tenant ID
   */
  static generateTokenPair(userId, userType, role = null, tenantId = null) {
    return {
      accessToken: this.generateAccessToken(userId, userType, role, tenantId),
      refreshToken: this.generateRefreshToken(userId, userType, role, tenantId),
      expiresIn: this.getTokenExpiration(config.jwt.expiresIn)
    };
  }

  static getTokenExpiration(expiresIn) {
    // Convert expiresIn string to seconds
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };
    
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const [, value, unit] = match;
      return parseInt(value) * units[unit];
    }
    
    return 3600; // Default 1 hour
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.replace('Bearer ', '');
  }
}

module.exports = JWTService;
