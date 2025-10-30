const express = require('express');
const router = express.Router();
const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage
} = require('./evaluationTemplate.controller');
const { auth, adminAuth } = require('../../middleware/auth');
const { validateEvaluationTemplateCreation, validateEvaluationTemplateUpdate } = require('../../middleware/validation');

// Get all templates (protected, admin only)
router.get('/', auth, adminAuth, getAllTemplates);

// Get template by ID
router.get('/:templateId', auth, adminAuth, getTemplateById);

// Create new template
router.post('/', auth, adminAuth, validateEvaluationTemplateCreation, createTemplate);

// Update template
router.put('/:templateId', auth, adminAuth, validateEvaluationTemplateUpdate, updateTemplate);

// Delete template
router.delete('/:templateId', auth, adminAuth, deleteTemplate);

// Increment usage count
router.post('/:templateId/increment-usage', auth, adminAuth, incrementUsage);

module.exports = router;

