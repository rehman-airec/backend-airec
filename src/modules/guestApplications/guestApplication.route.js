const express = require('express');
const router = express.Router();
const {
  parseCandidateInfo,
  applyForJobAsGuest,
  getGuestApplicationByToken,
  getGuestApplicationByEmail,
  convertGuestToUser
} = require('./guestApplication.controller');
const {
  validateGuestApplication,
  validateGuestToUserConversion
} = require('../../middleware/validation');
const { upload, handleUploadError } = require('../../middleware/upload');

// Apply for job as guest (no authentication required)
router.post('/jobs/:jobId/apply/guest', 
  upload.single('resume'),
  handleUploadError,
  parseCandidateInfo,
  validateGuestApplication,
  applyForJobAsGuest
);

// Get guest application by tracking token (no authentication required)
router.get('/guest/track/:trackingToken', getGuestApplicationByToken);

// Get guest applications by email (no authentication required)
router.get('/guest/applications/:email', getGuestApplicationByEmail);

// Convert guest application to user account (no authentication required)
router.post('/guest/convert-to-user', 
  validateGuestToUserConversion,
  convertGuestToUser
);

module.exports = router;
