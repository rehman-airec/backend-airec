const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const { upload, handleUploadError } = require('../../middleware/upload');
const { addSingleCandidate, addBulkCandidates } = require('./candidate.controller');
const { validateSingleCandidate, validateBulkCandidates } = require('./candidate.validation');

// Single candidate add (admin)
router.post(
  '/admin/add',
  auth,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
  ]),
  handleUploadError,
  validateSingleCandidate,
  addSingleCandidate
);

// Bulk candidate add (admin)
router.post(
  '/admin/bulk-add',
  auth,
  upload.any(),
  handleUploadError,
  validateBulkCandidates,
  addBulkCandidates
);

module.exports = router;


