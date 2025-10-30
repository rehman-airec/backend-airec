const { validationResult } = require('express-validator');
const EmailTemplate = require('./emailTemplate.model');

/**
 * Email Template Controller
 * Handles CRUD operations for email templates
 */

// Get all email templates
const getEmailTemplates = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await EmailTemplate.find(query)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get email template by ID
const getEmailTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await EmailTemplate.findById(templateId)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create email template
const createEmailTemplate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { subject, body, description, category, variables } = req.body;

    // Check if subject already exists
    const existingTemplate = await EmailTemplate.findOne({ subject });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Email template with this subject already exists'
      });
    }

    const template = new EmailTemplate({
      subject,
      body,
      description,
      category: category || 'event',
      variables: variables || [],
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      template
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update email template
const updateEmailTemplate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { templateId } = req.params;
    const { subject, body, description, category, variables, isActive } = req.body;

    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    // Check if subject is being changed and if it's unique
    if (subject && subject !== template.subject) {
      const existingTemplate = await EmailTemplate.findOne({ subject });
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Email template with this subject already exists'
        });
      }
    }

    // Update fields
    if (subject) template.subject = subject;
    if (body) template.body = body;
    if (description !== undefined) template.description = description;
    if (category) template.category = category;
    if (variables) template.variables = variables;
    if (isActive !== undefined) template.isActive = isActive;
    template.lastModifiedBy = req.user._id;

    await template.save();

    res.json({
      success: true,
      message: 'Email template updated successfully',
      template
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete email template
const deleteEmailTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await EmailTemplate.findByIdAndDelete(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    res.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
};

