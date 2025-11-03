const Job = require('./job.model');
const JobUtils = require('./job.utils');
const Application = require('../application/application.model');
const { addTenantFilter, ensureTenantId } = require('../../utils/tenantQueryHelper');

/**
 * Job Service
 * Contains all business logic for job operations
 */
class JobService {
  // ============ Job CRUD Operations ============
  
  /**
   * Create a new job
   * @param {Object} jobData - Job data
   * @param {String} userId - User ID creating the job
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async createJob(jobData, userId, req = null) {
    // Validate application deadline
    if (jobData.applicationDeadline) {
      JobUtils.validateApplicationDeadline(jobData.applicationDeadline);
    }

    // Validate application limit
    if (jobData.maxApplications) {
      JobUtils.validateApplicationLimit(jobData.maxApplications);
    }

    // Create job with tenantId if tenant context exists
    const jobWithTenant = ensureTenantId({
      ...jobData,
      createdBy: userId,
      status: 'draft'
    }, req);

    const job = await Job.create(jobWithTenant);

    return job;
  }

  /**
   * Update job step (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {String} step - Step number
   * @param {Object} stepData - Step data
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async updateJobStep(jobId, step, stepData, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
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
   * Get job by ID (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async getJobById(jobId, req = null) {
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name email');

    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant if tenant context exists
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
    } else if (job.tenantId && req) {
      // Job has tenantId but no tenant context - deny access
      throw new Error('Forbidden: Job is company-specific and requires tenant context');
    }

    return job;
  }

  /**
   * Update job (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {Object} updateData - Update data
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async updateJob(jobId, updateData, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    // Prevent tenantId from being changed
    delete updateData.tenantId;

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
   * Delete job (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async deleteJob(jobId, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
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
   * Publish job (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {Array} publishedOn - Job boards
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async publishJob(jobId, publishedOn, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.publish(publishedOn || []);

    return job;
  }

  /**
   * Close job (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async closeJob(jobId, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.close();

    return job;
  }

  /**
   * Archive job (tenant-aware)
   * @param {String} jobId - Job ID
   * @param {String} userId - User ID
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async archiveJob(jobId, userId, req = null) {
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Tenant isolation: Verify job belongs to current tenant
    if (req && req.tenant && req.tenantId) {
      if (!job.tenantId || job.tenantId.toString() !== req.tenantId.toString()) {
        throw new Error('Forbidden: Job does not belong to your company');
      }
    }

    // Check if user is the creator
    JobUtils.validateJobOwnership(job, userId);

    await job.archive();

    return job;
  }

  // ============ Job Listing Operations ============

  /**
   * Get all jobs with filters (tenant-aware)
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async getAllJobs(filters = {}, pagination = {}, req = null) {
    const { page = 1, limit = 10 } = pagination;

    const baseFilter = JobUtils.buildJobFilter(filters);
    
    // If tenant context is required but missing, return empty result
    if (req && (!req.tenant || !req.tenantId)) {
      return {
        jobs: [],
        pagination: {
          current: parseInt(page),
          pages: 0,
          total: 0
        }
      };
    }
    
    const filter = addTenantFilter(baseFilter, req); // Add tenant filter if tenant context exists
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
   * @param {String} userId - Admin user ID
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async getAdminJobs(userId, filters = {}, pagination = {}, req = null) {
    const { page = 1, limit = 10, status } = filters;

    const baseFilter = { createdBy: userId };
    if (status === 'published') {
      baseFilter.isPublished = true;
    } else if (status === 'draft') {
      baseFilter.isPublished = false;
    }

    const filter = addTenantFilter(baseFilter, req); // Add tenant filter if tenant context exists
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
   * Get job statistics (tenant-aware)
   * @param {Object} req - Express request object (optional, for tenant context)
   */
  static async getJobStats(req = null) {
    // Build base filter with tenant context
    const baseFilter = {};
    const filter = addTenantFilter(baseFilter, req);

    const stats = await Job.aggregate([
      {
        $match: filter // Apply tenant filter
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalJobs = await Job.countDocuments(filter);
    const publishedFilter = addTenantFilter({ isPublished: true }, req);
    const publishedJobs = await Job.countDocuments(publishedFilter);
    const draftFilter = addTenantFilter({ status: 'draft' }, req);
    const draftJobs = await Job.countDocuments(draftFilter);

    return {
      total: totalJobs,
      published: publishedJobs,
      draft: draftJobs,
      byStatus: stats
    };
  }
}

module.exports = JobService;