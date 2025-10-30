const { validationResult } = require('express-validator');
const ScreeningTemplate = require('./screeningTemplate.model');

// Get all templates (with filtering)
const getTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tags, includeDefaults = true } = req.query;
    
    const filter = {};
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'questions.text': new RegExp(search, 'i') }
      ];
    }
    
    // Tags filter
    if (tags) {
      filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }
    
    // Filter by user and defaults
    if (includeDefaults === 'true') {
      filter.$or = [
        { createdBy: req.user._id },
        { isDefault: true }
      ];
    } else {
      filter.createdBy = req.user._id;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const templates = await ScreeningTemplate.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    
    const total = await ScreeningTemplate.countDocuments(filter);
    
    res.json({
      success: true,
      templates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error in getTemplates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single template by ID
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await ScreeningTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Check if user has access (either owner or default)
    if (!template.isDefault && template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error in getTemplateById:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new template
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
    
    const { name, description, questions, tags } = req.body;
    
    // Validate questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one question is required'
      });
    }
    
    const template = await ScreeningTemplate.create({
      name,
      description,
      questions,
      createdBy: req.user._id,
      tags: tags || []
    });
    
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    console.error('Error in createTemplate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await ScreeningTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Only owner can update
    if (template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can update this template'
      });
    }
    
    // Update fields
    const { name, description, questions, tags } = req.body;
    
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (questions) template.questions = questions;
    if (tags) template.tags = tags;
    
    await template.save();
    
    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    console.error('Error in updateTemplate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await ScreeningTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Check permissions
    if (template.isDefault) {
      return res.status(403).json({
        success: false,
        message: 'Default templates cannot be deleted'
      });
    }
    
    if (template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this template'
      });
    }
    
    await ScreeningTemplate.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteTemplate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Increment usage count
const incrementUsage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await ScreeningTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    await template.incrementUsage();
    
    res.json({
      success: true,
      message: 'Usage count updated'
    });
  } catch (error) {
    console.error('Error in incrementUsage:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage
};

