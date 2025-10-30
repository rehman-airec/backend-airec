const CVParsingUtils = require('./cvParsing.utils');
const cvParsingService = require('../../services/cvParsingService');
const path = require('path');

/**
 * CV Parsing Service
 * Contains all business logic for CV parsing operations
 */
class CVParsingService {
  /**
   * Parse uploaded CV and return structured data
   */
  static async parseCV(filePath, originalFilename) {
    if (!filePath) {
      throw new Error('No CV file uploaded');
    }

    CVParsingUtils.validateFile(filePath, originalFilename);

    console.log(`Parsing CV: ${originalFilename}`);

    // Parse the CV
    const result = await cvParsingService.parseResume(filePath, originalFilename);

    if (!result.success) {
      throw new Error(result.error || 'Failed to parse CV');
    }

    return {
      data: result.data,
      filename: originalFilename
    };
  }

  /**
   * Validate CV file
   */
  static async validateCV(filePath, originalFilename, fileSize) {
    CVParsingUtils.validateFile(filePath, originalFilename);

    await cvParsingService.validateFile(filePath, originalFilename);

    return {
      filename: originalFilename,
      size: fileSize
    };
  }

  /**
   * Get parsing statistics
   */
  static getParsingStats() {
    return cvParsingService.getParsingStats();
  }
}

module.exports = CVParsingService;
