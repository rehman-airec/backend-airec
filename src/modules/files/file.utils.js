const fs = require('fs');
const path = require('path');
const Application = require('../application/application.model');

/**
 * File Utility Functions
 * Helper functions for file module
 */
class FileUtils {
  /**
   * Validate resume upload
   */
  static validateResumeUpload(file) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds maximum allowed size of 10MB');
    }

    // Validate file type
    const allowedMimeTypes = ['application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Only PDF files are allowed');
    }
  }

  /**
   * Get file path
   */
  static getFilePath(filename) {
    const backendRoot = process.cwd();
    return path.join(backendRoot, 'uploads', 'resumes', filename);
  }

  /**
   * Authorize file access
   */
  static async authorizeFileAccess(filename, user, userType) {
    const application = await Application.findOne({
      resumeFilename: filename
    }).populate('candidateId jobId');

    if (!application) {
      throw new Error('Application not found');
    }

    // Check authorization
    const isAuthorized = 
      // Admin can access any file
      userType === 'admin' ||
      // Candidate can access their own files (only for non-guest applications)
      (application.candidateId && 
       userType === 'candidate' && 
       application.candidateId._id.toString() === user._id.toString());

    if (!isAuthorized) {
      throw new Error('Not authorized to access this file');
    }

    return application;
  }

  /**
   * Generate download filename
   */
  static generateDownloadFilename(application) {
    const candidateName = this.getCandidateName(application);
    return `${candidateName}_resume.pdf`;
  }

  /**
   * Get candidate name from application
   */
  static getCandidateName(application) {
    if (application.candidateSnapshot) {
      return `${application.candidateSnapshot.firstName}_${application.candidateSnapshot.lastName}`;
    } else if (application.candidateId) {
      return `${application.candidateId.firstName}_${application.candidateId.lastName}`;
    }
    return 'resume';
  }

  /**
   * Get candidate info from application
   */
  static getCandidateInfo(application) {
    if (application.candidateSnapshot) {
      return {
        name: `${application.candidateSnapshot.firstName} ${application.candidateSnapshot.lastName}`,
        email: application.candidateSnapshot.email
      };
    } else if (application.candidateId) {
      return {
        name: `${application.candidateId.firstName} ${application.candidateId.lastName}`,
        email: application.candidateId.email
      };
    }
    return null;
  }

  /**
   * Validate admin access
   */
  static validateAdminAccess(userType) {
    if (userType !== 'admin') {
      throw new Error('Not authorized to delete files');
    }
  }

  /**
   * Get PDF headers for streaming
   */
  static getPDFHeaders(fileSize, downloadFilename) {
    return {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${downloadFilename}"`,
      'Content-Length': fileSize,
      'Cache-Control': 'private, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff'
    };
  }
}

module.exports = FileUtils;
