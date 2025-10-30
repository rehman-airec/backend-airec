const Admin = require('./auth.model').Admin;
const Candidate = require('./auth.model').Candidate;
const JWTService = require('../../services/jwtService');
const AuthUtils = require('./auth.utils');
const EmailService = require('../../services/emailService');
const crypto = require('crypto');
const config = require('../../config');

/**
 * Auth Service
 * Contains all business logic for authentication operations
 */
class AuthService {
  // ============ Admin Operations ============
  
  /**
   * Register a new admin user
   */
  static async registerAdmin(userData) {
    const { name, email, password, role } = userData;

    // Validate email format
    AuthUtils.validateEmail(email);
    AuthUtils.validatePassword(password);

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new Error('Admin with this email already exists');
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || 'recruiter'
    });

    // Generate tokens
    const tokenPair = AuthUtils.generateTokens(admin._id, 'admin');

    return {
      admin: AuthUtils.formatAdminResponse(admin),
      ...tokenPair
    };
  }

  /**
   * Login admin user
   */
  static async loginAdmin(email, password) {
    // Find admin and include password
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate tokens
    const tokenPair = AuthUtils.generateTokens(admin._id, 'admin');

    return {
      admin: AuthUtils.formatAdminResponse(admin),
      ...tokenPair
    };
  }

  // ============ Candidate Operations ============

  /**
   * Register a new candidate user
   */
  static async registerCandidate(userData) {
    const { firstName, lastName, email, password, phone, totalExperience, linkedinUrl } = userData;

    // Validate inputs
    AuthUtils.validateEmail(email);
    AuthUtils.validatePassword(password);
    if (phone) AuthUtils.validatePhone(phone);

    // Check if candidate already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      throw new Error('Candidate with this email already exists');
    }

    // Create candidate
    const candidate = await Candidate.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      totalExperience: totalExperience || 0,
      linkedinUrl
    });

    // Generate tokens
    const tokenPair = AuthUtils.generateTokens(candidate._id, 'candidate');

    return {
      candidate: AuthUtils.formatCandidateResponse(candidate),
      ...tokenPair
    };
  }

  /**
   * Login candidate user
   */
  static async loginCandidate(email, password) {
    // Find candidate and include password
    const candidate = await Candidate.findOne({ email }).select('+password');
    if (!candidate) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await candidate.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await candidate.updateLastLogin();

    // Generate tokens
    const tokenPair = AuthUtils.generateTokens(candidate._id, 'candidate');

    return {
      candidate: AuthUtils.formatCandidateResponse(candidate),
      ...tokenPair
    };
  }

  // ============ Token Operations ============

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Generate new token pair
    return AuthUtils.generateTokens(decoded.userId, decoded.userType);
  }

  // ============ Password Operations ============

  /**
   * Change user password
   */
  static async changePassword(user, currentPassword, newPassword) {
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    AuthUtils.validatePassword(newPassword);

    // Update password
    user.password = newPassword;
    await user.save();

    return true;
  }

  /**
   * Request password reset (for both Admin and Candidate)
   */
  static async requestPasswordReset(email) {
    AuthUtils.validateEmail(email);

    // Try finding user in Admin or Candidate collections
    let user = await Admin.findOne({ email });
    let userType = 'admin';
    if (!user) {
      user = await Candidate.findOne({ email });
      userType = user ? 'candidate' : null;
    }

    // Always respond success to avoid email enumeration
    if (!user) {
      return { success: true };
    }

    const resetToken = user.generatePasswordReset();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || config.security.corsOrigin || '';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;

    await EmailService.sendEmail(user.email, subject, html);
    return { success: true, userType };
  }

  /**
   * Reset password using a token
   */
  static async resetPassword(token, newPassword) {
    if (!token) {
      throw new Error('Reset token is required');
    }
    AuthUtils.validatePassword(newPassword);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Look up in Admin first then Candidate
    let user = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password');

    if (!user) {
      user = await Candidate.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
      }).select('+password');
    }

    if (!user) {
      throw new Error('Reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.clearPasswordReset();
    await user.save();

    return { success: true };
  }

  // ============ User Operations ============

  /**
   * Get current user details
   */
  static async getCurrentUser(user, userType) {
    return {
      user: user,
      userType: userType
    };
  }

  /**
   * Get all active admins (for hiring team selection)
   */
  static async getAllAdmins() {
    const admins = await Admin.find({ isActive: true })
      .select('name email role profile.department')
      .sort({ name: 1 });
    
    return admins.map(admin => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      department: admin.profile?.department || ''
    }));
  }
}

module.exports = AuthService;
