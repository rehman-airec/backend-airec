const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage
} = require('./screeningTemplate.controller');
const { auth, adminAuth } = require('../../middleware/auth');
const { validateScreeningTemplate } = require('../../middleware/validation');

// All routes require admin authentication
router.get('/', auth, adminAuth, getTemplates);
router.get('/:id', auth, adminAuth, getTemplateById);
router.post('/', auth, adminAuth, validateScreeningTemplate, createTemplate);
router.put('/:id', auth, adminAuth, validateScreeningTemplate, updateTemplate);
router.delete('/:id', auth, adminAuth, deleteTemplate);
router.post('/:id/increment-usage', auth, adminAuth, incrementUsage);

module.exports = router;

