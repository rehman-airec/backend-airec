const JWTService = require('../../services/jwtService');

/**
 * Auth Utility Functions
 * Helper functions for authentication module
 */
class AuthUtils {
  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return true;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return true;
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokens(userId, userType) {
    return JWTService.generateTokenPair(userId, userType);
  }

  /**
   * Format admin response data
   */
  static formatAdminResponse(admin) {
    return {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin
    };
  }

  /**
   * Format candidate response data
   */
  static formatCandidateResponse(candidate) {
    return {
      id: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      totalExperience: candidate.totalExperience,
      linkedinUrl: candidate.linkedinUrl,
      createdAt: candidate.createdAt,
      lastLogin: candidate.lastLogin
    };
  }

  /**
   * Sanitize user data for response
   */
  static sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.__v;
    return userObj;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(userType) {
    return userType === 'admin' || userType === 'superadmin';
  }

  /**
   * Check if user is candidate
   */
  static isCandidate(userType) {
    return userType === 'candidate';
  }
}

module.exports = AuthUtils;
