const EvaluationTemplate = require('./evaluationTemplate.model');
const { validationResult } = require('express-validator');

/**
 * Evaluation Template Controller
 * Handles HTTP requests for evaluation template management
 */

// Get all evaluation templates
const getAllTemplates = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await EvaluationTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching evaluation templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching evaluation templates'
    });
  }
};

// Get template by ID
const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await EvaluationTemplate.findById(templateId)
      .populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error fetching evaluation template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching evaluation template'
    });
  }
};

// Create new evaluation template
const createTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const templateData = {
      ...req.body,
      createdBy: req.user._id
    };

    const template = await EvaluationTemplate.create(templateData);

    res.status(201).json({
      success: true,
      message: 'Evaluation template created successfully',
      template
    });
  } catch (error) {
    console.error('Error creating evaluation template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating evaluation template'
    });
  }
};

// Update evaluation template
const updateTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { templateId } = req.params;
    
    const template = await EvaluationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation template not found'
      });
    }

    // Check if user can update (only creator or superadmin)
    if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own templates'
      });
    }

    const updatedTemplate = await EvaluationTemplate.findByIdAndUpdate(
      templateId,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Evaluation template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating evaluation template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating evaluation template'
    });
  }
};

// Delete evaluation template
const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await EvaluationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation template not found'
      });
    }

    // Check if user can delete (only creator or superadmin)
    if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own templates'
      });
    }

    // Don't allow deletion of default templates
    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default templates'
      });
    }

    await EvaluationTemplate.findByIdAndDelete(templateId);

    res.json({
      success: true,
      message: 'Evaluation template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting evaluation template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting evaluation template'
    });
  }
};

// Increment usage count
const incrementUsage = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await EvaluationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation template not found'
      });
    }

    await template.incrementUsage();

    res.json({
      success: true,
      message: 'Usage count updated'
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating usage count'
    });
  }
};

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage
};

