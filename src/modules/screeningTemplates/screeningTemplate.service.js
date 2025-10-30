const ScreeningTemplate = require('./screeningTemplate.model');
const ScreeningTemplateUtils = require('./screeningTemplate.utils');

/**
 * Screening Template Service
 * Contains all business logic for screening template operations
 */
class ScreeningTemplateService {
  /**
   * Get all templates with filters
   */
  static async getTemplates(userId, filters = {}, pagination = {}) {
    const { page = 1, limit = 20, search, tags, includeDefaults = true } = filters;
    
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
        { createdBy: userId },
        { isDefault: true }
      ];
    } else {
      filter.createdBy = userId;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const templates = await ScreeningTemplate.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    
    const total = await ScreeningTemplate.countDocuments(filter);
    
    return {
      templates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId, userId) {
    const template = await ScreeningTemplate.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Check if user has access
    ScreeningTemplateUtils.checkTemplateAccess(template, userId);
    
    return template;
  }

  /**
   * Create new template
   */
  static async createTemplate(templateData, userId) {
    const { name, description, questions, tags } = templateData;
    
    // Validate questions
    ScreeningTemplateUtils.validateQuestions(questions);
    
    const template = await ScreeningTemplate.create({
      name,
      description,
      questions,
      createdBy: userId,
      tags: tags || []
    });
    
    return template;
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId, updateData, userId) {
    const template = await ScreeningTemplate.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Check if user is the owner
    ScreeningTemplateUtils.checkTemplateOwnership(template, userId);
    
    // Validate questions if provided
    if (updateData.questions) {
      ScreeningTemplateUtils.validateQuestions(updateData.questions);
    }
    
    // Update fields
    const { name, description, questions, tags } = updateData;
    
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (questions) template.questions = questions;
    if (tags) template.tags = tags;
    
    await template.save();
    
    return template;
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId, userId) {
    const template = await ScreeningTemplate.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Check permissions
    ScreeningTemplateUtils.checkDeletePermissions(template, userId);
    
    await ScreeningTemplate.findByIdAndDelete(templateId);
    
    return true;
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(templateId) {
    const template = await ScreeningTemplate.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    await template.incrementUsage();
    
    return template;
  }
}

module.exports = ScreeningTemplateService;
