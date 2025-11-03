const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const { upload, handleUploadError } = require('../../middleware/upload');
const { 
  addSingleCandidate, 
  addBulkCandidates, 
  listCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
} = require('./candidate.controller');
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

// List candidates (admin)
router.get(
  '/admin/list',
  auth,
  listCandidates
);

// Get candidate by ID (admin)
router.get(
  '/admin/:id',
  auth,
  getCandidateById
);

// Update candidate (admin)
router.put(
  '/admin/:id',
  auth,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
  ]),
  handleUploadError,
  validateSingleCandidate,
  updateCandidate
);

// Delete candidate (admin)
router.delete(
  '/admin/:id',
  auth,
  deleteCandidate
);

module.exports = router;


