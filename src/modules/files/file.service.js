const FileUtils = require('./file.utils');
const Application = require('../application/application.model');
const path = require('path');
const fs = require('fs');

/**
 * File Service
 * Contains all business logic for file operations
 */
class FileService {
  /**
   * Upload resume file
   */
  static async uploadResume(file) {
    FileUtils.validateResumeUpload(file);

    return {
      filename: file.filename,
      path: file.path,
      size: file.size
    };
  }

  /**
   * Serve PDF file with authorization
   */
  static async servePDF(filename, user, userType) {
    // Get file path
    const filePath = FileUtils.getFilePath(filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Check authorization
    const application = await FileUtils.authorizeFileAccess(filename, user, userType);

    // Get file stats
    const stats = fs.statSync(filePath);

    // Generate download filename
    const downloadFilename = FileUtils.generateDownloadFilename(application);

    return {
      filePath,
      fileSize: stats.size,
      downloadFilename,
      application
    };
  }

  /**
   * Get file information
   */
  static async getFileInfo(filename, user, userType) {
    // Get file path
    const filePath = FileUtils.getFilePath(filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Check authorization
    const application = await FileUtils.authorizeFileAccess(filename, user, userType);

    // Get file stats
    const stats = fs.statSync(filePath);

    // Get candidate name
    const candidateName = FileUtils.getCandidateName(application);

    return {
      filename: application.resumeFilename,
      originalName: `${candidateName}_resume.pdf`,
      size: stats.size,
      uploadedAt: application.appliedAt,
      candidate: {
        name: candidateName,
        email: application.candidateSnapshot?.email || application.candidateId?.email
      }
    };
  }

  /**
   * Delete file (admin only)
   */
  static async deleteFile(filename, userType) {
    FileUtils.validateAdminAccess(userType);

    const filePath = FileUtils.getFilePath(filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Delete file
    fs.unlinkSync(filePath);

    return true;
  }

  /**
   * List files with filters
   */
  static async listFiles(filters = {}, pagination = {}) {
    const { page = 1, limit = 10, jobId } = filters;

    const filter = {};
    if (jobId) filter.jobId = jobId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find(filter)
      .populate('candidateId', 'firstName lastName email')
      .populate('jobId', 'title department')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    const files = applications.map(app => ({
      id: app._id,
      filename: app.resumeFilename,
      originalName: FileUtils.getCandidateName(app) + '_resume.pdf',
      candidate: FileUtils.getCandidateInfo(app),
      job: app.jobId ? {
        title: app.jobId.title,
        department: app.jobId.department
      } : null,
      uploadedAt: app.appliedAt,
      status: app.status
    }));

    return {
      files,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }
}

module.exports = FileService;
