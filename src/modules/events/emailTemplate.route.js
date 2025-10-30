const express = require('express');
const router = express.Router();
const {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
} = require('./emailTemplate.controller');
const { validateEmailTemplate } = require('../../middleware/validation');
const { auth, adminAuth } = require('../../middleware/auth');

// All routes require admin authentication
router.use(auth, adminAuth);

// Get all email templates
router.get('/', getEmailTemplates);

// Get email template by ID
router.get('/:templateId', getEmailTemplateById);

// Create email template
router.post('/', validateEmailTemplate, createEmailTemplate);

// Update email template
router.put('/:templateId', validateEmailTemplate, updateEmailTemplate);

// Delete email template
router.delete('/:templateId', deleteEmailTemplate);

module.exports = router;

