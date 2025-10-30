const jwt = require('jsonwebtoken');
const config = require('../config');

class JWTService {
  static generateAccessToken(userId, userType) {
    return jwt.sign(
      { userId, userType },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  static generateRefreshToken(userId, userType) {
    return jwt.sign(
      { userId, userType, type: 'refresh' },
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

  static generateTokenPair(userId, userType) {
    return {
      accessToken: this.generateAccessToken(userId, userType),
      refreshToken: this.generateRefreshToken(userId, userType),
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
