const fs = require('fs');
const path = require('path');

/**
 * CV Parsing Utility Functions
 * Helper functions for CV parsing module
 */
class CVParsingUtils {
  /**
   * Validate uploaded file
   */
  static validateFile(filePath, originalFilename) {
    if (!filePath || !originalFilename) {
      throw new Error('No CV file uploaded');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('Uploaded file does not exist');
    }

    // Get file extension
    const ext = path.extname(originalFilename).toLowerCase();

    // Validate file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`File type ${ext} is not supported. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

    // Validate file size (max 10MB)
    if (fileSizeInMB > 10) {
      throw new Error('File size exceeds maximum allowed size of 10MB');
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTempFiles(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }

  /**
   * Get file metadata
   */
  static getFileMetadata(filePath, originalFilename) {
    const stats = fs.statSync(filePath);
    const ext = path.extname(originalFilename).toLowerCase();

    return {
      filename: originalFilename,
      originalName: path.basename(originalFilename),
      extension: ext,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }
}

module.exports = CVParsingUtils;
