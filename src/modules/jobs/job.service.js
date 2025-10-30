const Job = require('./job.model');
const JobUtils = require('./job.utils');
const Application = require('../application/application.model');

/**
 * Job Service
 * Contains all business logic for job operations
 */
class JobService {
  // ============ Job CRUD Operations ============
  
  /**
   * Create a new job
   */
  static async createJob(jobData, userId) {
    // Validate application deadline
    if (jobData.applicationDeadline) {
      JobUtils.validateApplicationDeadline(jobData.applicationDeadline);
    }

    // Validate application limit
    if (jobData.maxApplications) {
      JobUtils.validateApplicationLimit(jobData.maxApplications);
    }

    // Create job
    const job = await Job.create({
      ...jobData,
      createdBy: userId,
      status: 'draft'
    });

    return job;
  }

  /**
   * Update job step
   */
  static async updateJobStep(jobId, step, stepData, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    // Update based on step
    switch (step) {
      case '1':
        job.title = stepData.title;
        job.location = stepData.location;
        job.department = stepData.department;
        job.description = stepData.description;
        job.responsibilities = stepData.responsibilities || [];
        job.requirements = stepData.requirements || [];
        job.skills = stepData.skills || [];
        job.employmentType = stepData.employmentType;
        job.experienceLevel = stepData.experienceLevel;
        job.salaryRange = stepData.salaryRange;
        break;
      case '2':
        job.screeningQuestions = stepData.screeningQuestions || [];
        break;
      case '3':
        job.hiringTeam = stepData.hiringTeam || [];
        job.workflow = stepData.workflow || job.workflow;
        break;
      case '4':
        if (stepData.applicationDeadline) {
          JobUtils.validateApplicationDeadline(stepData.applicationDeadline);
        }
        job.applicationDeadline = stepData.applicationDeadline;
        job.maxApplications = stepData.maxApplications || 1000;
        if (stepData.maxApplications) {
          JobUtils.validateApplicationLimit(stepData.maxApplications);
        }
        job.tags = stepData.tags || [];
        break;
      default:
        throw new Error('Invalid step number');
    }

    await job.save();

    return job;
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId) {
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name email');

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }

  /**
   * Update job
   */
  static async updateJob(jobId, updateData, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    // Validate if updating critical fields
    if (updateData.applicationDeadline) {
      JobUtils.validateApplicationDeadline(updateData.applicationDeadline);
    }
    if (updateData.maxApplications) {
      JobUtils.validateApplicationLimit(updateData.maxApplications);
    }

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true, runValidators: true }
    );

    return updatedJob;
  }

  /**
   * Delete job
   */
  static async deleteJob(jobId, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    // Check if job has applications
    const hasApplications = await JobUtils.checkJobHasApplications(jobId);
    
    if (hasApplications) {
      throw new Error('Cannot delete job with applications. Please archive the job instead.');
    }

    await Job.findByIdAndDelete(jobId);

    return true;
  }

  // ============ Job Status Operations ============

  /**
   * Publish job
   */
  static async publishJob(jobId, publishedOn, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.publish(publishedOn || []);

    return job;
  }

  /**
   * Close job
   */
  static async closeJob(jobId, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.close();

    return job;
  }

  /**
   * Archive job
   */
  static async archiveJob(jobId, userId) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.archive();

    return job;
  }

  // ============ Job Listing Operations ============

  /**
   * Get all jobs with filters
   */
  static async getAllJobs(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;

    const filter = JobUtils.buildJobFilter(filters);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    return {
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }

  /**
   * Get admin jobs
   */
  static async getAdminJobs(userId, filters = {}, pagination = {}) {
    const { page = 1, limit = 10, status } = filters;

    const filter = { createdBy: userId };
    if (status === 'published') {
      filter.isPublished = true;
    } else if (status === 'draft') {
      filter.isPublished = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    return {
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }

  /**
   * Get job statistics
   */
  static async getJobStats() {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalJobs = await Job.countDocuments();
    const publishedJobs = await Job.countDocuments({ isPublished: true });
    const draftJobs = await Job.countDocuments({ status: 'draft' });

    return {
      total: totalJobs,
      published: publishedJobs,
      draft: draftJobs,
      byStatus: stats
    };
  }
}

module.exports = JobService;