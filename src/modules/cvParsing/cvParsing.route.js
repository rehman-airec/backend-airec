const express = require('express');
const router = express.Router();
const cvParsingController = require('./cvParsing.controller');
const { upload, handleUploadError } = require('../../middleware/upload');

/**
 * CV Parsing Routes
 * Handles CV upload, parsing, and validation
 */

// Parse uploaded CV
router.post('/parse', 
  upload.single('cv'),
  handleUploadError,
  cvParsingController.parseCV
);

// Validate CV file
router.post('/validate',
  upload.single('cv'),
  handleUploadError,
  cvParsingController.validateCV
);

// Get parsing service statistics
router.get('/stats',
  cvParsingController.getParsingStats
);

module.exports = router;
