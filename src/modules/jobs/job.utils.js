const Job = require('./job.model');

/**
 * Job Utility Functions
 * Helper functions for job module
 */
class JobUtils {
  /**
   * Validate job ownership
   */
  static validateJobOwnership(job, userId) {
    if (job.createdBy.toString() !== userId.toString()) {
      throw new Error('Not authorized to perform this action on this job');
    }
  }

  /**
   * Check if job has applications
   */
  static async checkJobHasApplications(jobId) {
    const { Application } = require('../application/application.model');
    const applicationCount = await Application.countDocuments({ jobId });
    return applicationCount > 0;
  }

  /**
   * Build filter for job queries
   */
  static buildJobFilter(queryParams, userContext = null) {
    const { q, city, department, employmentType, experienceLevel } = queryParams;
    const filter = { isPublished: true };

    // Search filter
    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }

    if (department) {
      filter.department = new RegExp(department, 'i');
    }

    if (employmentType) {
      filter.employmentType = employmentType;
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    // User context filters
    if (userContext && userContext.userId) {
      filter.createdBy = userContext.userId;
    }

    return filter;
  }

  /**
   * Format job response
   */
  static formatJobResponse(job) {
    return job;
  }

  /**
   * Validate application deadline
   */
  static validateApplicationDeadline(deadline) {
    if (deadline && new Date(deadline) < new Date()) {
      throw new Error('Application deadline cannot be in the past');
    }
  }

  /**
   * Validate application limit
   */
  static validateApplicationLimit(limit) {
    if (limit && limit < 1) {
      throw new Error('Maximum applications must be at least 1');
    }
  }
}

module.exports = JobUtils;
