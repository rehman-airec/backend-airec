const express = require('express');
const router = express.Router();
const {
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
} = require('./auth.controller');
const {
  validateAdminSignup,
  validateAdminLogin,
  validateCandidateSignup,
  validateCandidateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../../middleware/validation');
const { auth } = require('../../middleware/auth');

// Admin routes
router.post('/admin/signup', validateAdminSignup, adminSignup);
router.post('/admin/login', validateAdminLogin, adminLogin);

// Candidate routes
router.post('/candidate/signup', validateCandidateSignup, candidateSignup);
router.post('/candidate/login', validateCandidateLogin, candidateLogin);

// Get current user (protected)
router.get('/me', auth, getCurrentUser);

// Refresh token
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', auth, logout);

// Change password
router.put('/change-password', auth, changePassword);

// Forgot/Reset password
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

// Get all admins (protected, for hiring team selection)
router.get('/admin/list', auth, getAllAdmins);

module.exports = router;

