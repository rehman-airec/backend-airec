const { validationResult } = require('express-validator');
const AuthService = require('./auth.service');

/**
 * Auth Controller
 * Handles HTTP requests and delegates business logic to AuthService
 */

// Admin signup
const adminSignup = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Call service
    const result = await AuthService.registerAdmin(req.body);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      ...result
    });
  } catch (error) {
    const statusCode = error.message === 'Admin with this email already exists' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Call service
    const result = await AuthService.loginAdmin(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    const statusCode = error.message === 'Invalid credentials' ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Candidate signup
const candidateSignup = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Call service
    const result = await AuthService.registerCandidate(req.body);

    res.status(201).json({
      success: true,
      message: 'Candidate created successfully',
      ...result
    });
  } catch (error) {
    const statusCode = error.message === 'Candidate with this email already exists' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Candidate login
const candidateLogin = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Call service
    const result = await AuthService.loginCandidate(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    const statusCode = error.message === 'Invalid credentials' ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Call service
    const result = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...result
    });
  } catch (error) {
    const statusCode = error.message === 'Refresh token is required' ? 400 : 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const result = await AuthService.getCurrentUser(req.user, req.userType);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Call service
    await AuthService.changePassword(user, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    const statusCode = error.message === 'Current password is incorrect' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Forgot password (request reset link)
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;
    await AuthService.requestPasswordReset(email);
    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Reset password (submit new password)
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    const status = error.message && error.message.includes('token') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get all admins (for hiring team selection)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await AuthService.getAllAdmins();

    res.json({
      success: true,
      admins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

module.exports = {
  adminSignup,
  adminLogin,
  candidateSignup,
  candidateLogin,
  refreshToken,
  getCurrentUser,
  logout,
  changePassword,
  getAllAdmins,
  forgotPassword,
  resetPassword
};

