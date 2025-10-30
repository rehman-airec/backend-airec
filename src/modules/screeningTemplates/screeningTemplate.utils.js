/**
 * Screening Template Utility Functions
 * Helper functions for screening template module
 */
class ScreeningTemplateUtils {
  /**
   * Validate questions
   */
  static validateQuestions(questions) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('At least one question is required');
    }

    // Validate each question
    questions.forEach((question, index) => {
      if (!question.text || question.text.trim().length === 0) {
        throw new Error(`Question ${index + 1} must have text`);
      }

      if (!question.type) {
        throw new Error(`Question ${index + 1} must have a type`);
      }

      // Validate question type
      const validTypes = ['text', 'multiple-choice', 'yes-no', 'rating'];
      if (!validTypes.includes(question.type)) {
        throw new Error(`Question ${index + 1} has invalid type. Valid types: ${validTypes.join(', ')}`);
      }

      // If multiple-choice, validate options
      if (question.type === 'multiple-choice') {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
          throw new Error(`Question ${index + 1} must have at least one option`);
        }
      }
    });
  }

  /**
   * Check template access
   */
  static checkTemplateAccess(template, userId) {
    if (!template.isDefault && template.createdBy.toString() !== userId.toString()) {
      throw new Error('Access denied');
    }
  }

  /**
   * Check template ownership
   */
  static checkTemplateOwnership(template, userId) {
    if (template.createdBy.toString() !== userId.toString()) {
      throw new Error('Only the creator can update this template');
    }
  }

  /**
   * Check delete permissions
   */
  static checkDeletePermissions(template, userId) {
    if (template.isDefault) {
      throw new Error('Default templates cannot be deleted');
    }

    if (template.createdBy.toString() !== userId.toString()) {
      throw new Error('Only the creator can delete this template');
    }
  }
}

module.exports = ScreeningTemplateUtils;
