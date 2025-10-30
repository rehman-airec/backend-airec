const Application = require('./application.model');
const Job = require('../jobs/job.model');
const cvParsingService = require('../../services/cvParsingService');
const ApplicationUtils = require('./application.utils');

/**
 * Application Service
 * Contains all business logic for application operations
 */
class ApplicationService {
  // ============ Application Operations ============

  /**
   * Apply for a job
   */
  static async applyForJob(jobId, candidateId, resumePath, resumeFilename, screeningAnswers, source) {
    // Validate job
    const job = await ApplicationUtils.validateJobForApplication(jobId);
    
    // Check if candidate already applied
    await ApplicationUtils.checkDuplicateApplication(jobId, candidateId);

    // Validate resume
    ApplicationUtils.validateResume(resumePath, resumeFilename);

    // Parse CV for enhanced data extraction
    const parsedCVData = await ApplicationUtils.parseCandidateResume(resumePath, resumeFilename);

    // Create application
    const application = await Application.create({
      jobId,
      candidateId,
      resumePath,
      resumeFilename,
      parsedCVData,
      screeningAnswers: screeningAnswers || [],
      source
    });

    // Increment job application count
    await job.incrementApplications();

    return ApplicationUtils.formatApplicationResponse(application);
  }

  /**
   * Get application by ID with authorization
   */
  static async getApplicationById(applicationId, userId, userType, userRole) {
    const application = await Application.findById(applicationId)
      .populate('jobId', 'title department location employmentType experienceLevel description')
      .populate('candidateId', 'firstName lastName email phone totalExperience linkedinUrl')
      .populate('notes.adminId', 'name email')
      .populate('notes.editedBy', 'name email');

    if (!application) {
      throw new Error('Application not found');
    }

    // Check authorization
    ApplicationUtils.checkApplicationAuthorization(application, userId, userType, userRole);

    return ApplicationUtils.transformApplication(application);
  }

  /**
   * Update application status
   */
  static async updateApplicationStatus(applicationId, status, priority, userId, note) {
    const application = await Application.findById(applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Update status using model method
    await application.updateStatus(status, userId, note);

    // Update priority if provided
    if (priority) {
      await application.updatePriority(priority);
    }

    return application;
  }

  /**
   * Add note to application
   */
  static async addNote(applicationId, userId, note) {
    ApplicationUtils.validateNote(note);

    const application = await Application.findById(applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    await application.addNote(userId, note);

    return application;
  }

  /**
   * Update note in application
   */
  static async updateNote(applicationId, noteIndex, userId, newText) {
    ApplicationUtils.validateNote(newText);

    const application = await Application.findById(applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    await application.updateNote(noteIndex, userId, newText);

    // Reload with populated fields
    const updatedApplication = await Application.findById(applicationId)
      .populate('jobId', 'title department location employmentType experienceLevel description')
      .populate('candidateId', 'firstName lastName email phone totalExperience linkedinUrl')
      .populate('notes.adminId', 'name email')
      .populate('notes.editedBy', 'name email');

    return updatedApplication;
  }

  /**
   * Get candidate applications with filters
   */
  static async getCandidateApplications(candidateId, filters = {}, pagination = {}) {
    const { page = 1, limit = 10, status } = filters;

    const filter = { candidateId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find(filter)
      .populate('jobId', 'title department location employmentType experienceLevel')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const transformedApplications = applications.map(app => ApplicationUtils.transformApplicationToList(app));

    const total = await Application.countDocuments(filter);

    return {
      applications: transformedApplications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }

  /**
   * Bulk update application statuses
   */
  static async bulkUpdateApplicationStatus(applicationIds, status, userId, note) {
    ApplicationUtils.validateBulkUpdateInput(applicationIds);

    const applications = await Application.find({
      _id: { $in: applicationIds }
    });

    if (applications.length !== applicationIds.length) {
      throw new Error('Some applications not found');
    }

    // Update all applications
    const updatePromises = applications.map(app => 
      app.updateStatus(status, userId, note)
    );

    await Promise.all(updatePromises);

    return applications.length;
  }

  /**
   * Get application statistics
   */
  static async getApplicationStats() {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalApplications = await Application.countDocuments();

    return {
      total: totalApplications,
      byStatus: stats
    };
  }

  /**
   * Get application analytics
   */
  static async getApplicationAnalytics(filters = {}) {
    const { jobId, startDate, endDate } = filters;

    const filter = {};
    if (jobId) filter.jobId = jobId;
    if (startDate || endDate) {
      filter.appliedAt = {};
      if (startDate) filter.appliedAt.$gte = new Date(startDate);
      if (endDate) filter.appliedAt.$lte = new Date(endDate);
    }

    const analytics = await Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalApplications = await Application.countDocuments(filter);
    const newApplications = await Application.countDocuments({
      ...filter,
      status: 'New'
    });

    return {
      total: totalApplications,
      new: newApplications,
      byStatus: analytics
    };
  }
}

module.exports = ApplicationService;
