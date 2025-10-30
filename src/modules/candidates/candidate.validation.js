const { body } = require('express-validator');

const validatePhone = body('phone')
  .optional({ nullable: true })
  .matches(/^[\+]?[1-9][\d]{0,15}$/)
  .withMessage('Please enter a valid phone number');

const validateSingleCandidate = [
  body('firstName').optional().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  validatePhone,
  body('experience').optional().isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50'),
  body('linkedinUrl').optional().matches(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/).withMessage('Please enter a valid LinkedIn URL'),
];

const validateBulkCandidates = [
  body('candidates')
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === 'string') {
        try { return Array.isArray(JSON.parse(value)); } catch { return false; }
      }
      return false;
    })
    .withMessage('candidates must be an array or a JSON string array')
];

module.exports = { validateSingleCandidate, validateBulkCandidates };


