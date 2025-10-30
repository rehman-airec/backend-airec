const express = require('express');
const router = express.Router();

console.log('Profile routes file loaded successfully');
const {
  getProfile,
  updateProfile,
  getProfileStats,
  uploadAvatar,
  deleteAvatar,
  getSavedJobs,
  saveJob,
  unsaveJob,
  checkJobSaved
} = require('./profile.controller');
const { auth } = require('../../middleware/auth');
const { avatarUpload, handleAvatarUploadError } = require('../../middleware/avatarUpload');
const { 
  validateProfileUpdate 
} = require('../../middleware/validation');

// Get current user profile
router.get('/me', auth, getProfile);

// Update profile
router.put('/me', auth, validateProfileUpdate, updateProfile);

// Get profile statistics
router.get('/me/stats', auth, getProfileStats);

// Avatar management
router.post('/avatar', auth, avatarUpload.single('avatar'), handleAvatarUploadError, uploadAvatar);
router.delete('/avatar', auth, deleteAvatar);

// Saved Jobs management
router.get('/me/saved-jobs', auth, getSavedJobs);
router.post('/jobs/:jobId/save', auth, saveJob);
router.delete('/jobs/:jobId/save', auth, unsaveJob);
router.get('/jobs/:jobId/saved', auth, checkJobSaved);

module.exports = router;
