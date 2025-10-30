const Job = require('../jobs/job.model');
const Application = require('./application.model');
const cvParsingService = require('../../services/cvParsingService');

/**
 * Application Utility Functions
 * Helper functions for application module
 */
class ApplicationUtils {
  /**
   * Validate job for application submission
   */
  static async validateJobForApplication(jobId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    if (!job.isPublished || job.status !== 'published') {
      throw new Error('Job is not available for applications');
    }

    // Check application deadline
    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      throw new Error('Application deadline has passed');
    }

    // Check application limit
    if (job.currentApplications >= job.maxApplications) {
      throw new Error('Application limit reached for this job');
    }

    return job;
  }

  /**
   * Check for duplicate application
   */
  static async checkDuplicateApplication(jobId, candidateId) {
    const existingApplication = await Application.findOne({
      jobId,
      candidateId
    });

    if (existingApplication) {
      throw new Error('You have already applied for this job');
    }
  }

  /**
   * Validate resume file
   */
  static validateResume(resumePath, resumeFilename) {
    if (!resumePath || !resumeFilename) {
      throw new Error('Resume is required');
    }
  }

  /**
   * Parse candidate resume
   */
  static async parseCandidateResume(resumePath, resumeFilename) {
    let parsedCVData = null;
    
    try {
      const parseResult = await cvParsingService.parseResume(resumePath, resumeFilename);
      if (parseResult.success) {
        parsedCVData = parseResult.data;
        console.log('CV parsed successfully for application');
      } else {
        console.log('CV parsing failed:', parseResult.error);
      }
    } catch (error) {
      console.error('CV parsing error:', error);
      // Continue without parsed data - don't fail the application
    }
    
    return parsedCVData;
  }

  /**
   * Check application authorization
   */
  static checkApplicationAuthorization(application, userId, userType, userRole) {
    // Admins can view any application
    if (userType === 'admin') {
      return true;
    }

    // Candidates can only view their own applications
    if (application.candidateId && 
        userType === 'candidate' && 
        application.candidateId._id.toString() !== userId.toString()) {
      throw new Error('You can only view your own applications');
    }
  }

  /**
   * Transform application for response
   */
  static transformApplication(application) {
    // For guest applications, use candidateSnapshot; otherwise use populated candidateId
    let candidate;
    
    if (application.isGuestApplication) {
      // For guest applications, prefer candidateSnapshot
      candidate = application.candidateSnapshot || null;
    } else {
      // For regular applications, use populated candidateId
      candidate = application.candidateId;
    }

    // Transform the data to match frontend expectations
    return {
      ...application.toObject(),
      job: application.jobId,
      candidate: candidate
    };
  }

  /**
   * Transform application for list display
   */
  static transformApplicationToList(application) {
    const appObj = application.toObject();
    return {
      ...appObj,
      job: appObj.jobId
    };
  }

  /**
   * Format application response
   */
  static formatApplicationResponse(application) {
    return {
      id: application._id,
      jobId: application.jobId,
      status: application.status,
      appliedAt: application.appliedAt
    };
  }

  /**
   * Validate note
   */
  static validateNote(note) {
    if (!note || note.trim().length === 0) {
      throw new Error('Note is required');
    }
  }

  /**
   * Validate bulk update input
   */
  static validateBulkUpdateInput(applicationIds) {
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('Application IDs are required');
    }
  }

  /**
   * Parse screening answers
   */
  static parseScreeningAnswers(rawScreeningAnswers) {
    let screeningAnswers = rawScreeningAnswers;
    
    if (typeof rawScreeningAnswers === 'string') {
      try {
        screeningAnswers = JSON.parse(rawScreeningAnswers);
      } catch (error) {
        throw new Error('Invalid screening answers format');
      }
    }
    
    return screeningAnswers;
  }
}

module.exports = ApplicationUtils;
