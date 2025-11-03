require('dotenv').config();

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

    // Generate tokens with role and tenantId
    const tokenPair = AuthUtils.generateTokens(
      admin._id, 
      'admin',
      admin.role || 'recruiter',
      admin.tenantId ? admin.tenantId.toString() : null
    );

    return {
      admin: AuthUtils.formatAdminResponse(admin),
      ...tokenPair
    };
  }

  /**
   * Login admin user
   */
  static async loginAdmin(email, password) {
    // Find admin and include password, populate tenant to get subdomain
    const admin = await Admin.findOne({ email })
      .select('+password')
      .populate('tenantId', 'subdomain name');
    
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

    // Generate tokens with role and tenantId
    const tokenPair = AuthUtils.generateTokens(
      admin._id, 
      'admin',
      admin.role || 'recruiter',
      admin.tenantId ? admin.tenantId.toString() : null
    );

    // Format admin response with tenant subdomain
    const adminResponse = AuthUtils.formatAdminResponse(admin);
    
    // Include tenant subdomain if tenant exists
    if (admin.tenantId && admin.tenantId.subdomain) {
      adminResponse.tenant = {
        subdomain: admin.tenantId.subdomain,
        name: admin.tenantId.name
      };
      adminResponse.subdomain = admin.tenantId.subdomain;
    }

    return {
      admin: adminResponse,
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
      linkedinUrl,
      tenantId: userData.tenantId || null
    });

    // Generate tokens with role and tenantId
    // Candidates can have role 'candidate' or 'employee'
    const candidateRole = candidate.role || 'candidate';
    const tokenPair = AuthUtils.generateTokens(
      candidate._id, 
      'candidate',
      candidateRole,
      candidate.tenantId ? candidate.tenantId.toString() : null
    );

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

    // Generate tokens with role and tenantId
    // Candidates can have role 'candidate' or 'employee'
    const candidateRole = candidate.role || 'candidate';
    const tokenPair = AuthUtils.generateTokens(
      candidate._id, 
      'candidate',
      candidateRole,
      candidate.tenantId ? candidate.tenantId.toString() : null
    );

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

    // Generate new token pair, preserving role and tenantId from refresh token
    return AuthUtils.generateTokens(
      decoded.userId, 
      decoded.userType,
      decoded.role || null,
      decoded.tenantId || null
    );
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
    const companyName = process.env.COMPANY_NAME;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <div style="background-color: rgba(255, 255, 255, 0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px; display: table-cell; vertical-align: middle; text-align: center; line-height: 64px; font-size: 32px;">
            🔒
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Password Reset</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Secure password reset for your account</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #f9fafb;">
          <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hello,
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
              We received a request to reset the password for your ${companyName} account. If you made this request, click the button below to create a new password.
            </p>

            <!-- Primary CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.2s;">
                Reset Password
              </a>
            </div>

            <!-- Alternative Link Section -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0; font-weight: 500;">
                Button not working? Copy and paste this URL into your browser:
              </p>
              <p style="color: #3B82F6; font-size: 13px; word-break: break-all; margin: 0; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
                ${resetUrl}
              </p>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                ⏰ Security Notice
              </p>
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                This password reset link will expire in <strong>1 hour</strong> for your security. If you didn't request this, please ignore this email and your password will remain unchanged.
              </p>
            </div>

            <!-- Warning -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>⚠️ Important:</strong> If you did not request a password reset, please ignore this email or contact our support team if you have concerns about your account security.
              </p>
            </div>
          </div>

          <!-- Help Section -->
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Need help? Contact our support team
            </p>
            <p style="color: #3B82F6; font-size: 14px; margin: 0;">
              <a href="${frontendUrl}/support" style="color: #3B82F6; text-decoration: none; font-weight: 500;">Get Support →</a>
            </p>
          </div>
        </div>
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
