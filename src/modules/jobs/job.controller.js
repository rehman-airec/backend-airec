const { validationResult } = require('express-validator');
const Job = require('./job.model');
const Application = require('../application/application.model');

// Create job (multi-step)
const createJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { step, ...jobData } = req.body;
    
    // Add creator and set initial status
    const job = await Job.create({
      ...jobData,
      createdBy: req.user._id,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update job step
const updateJobStep = async (req, res) => {
  try {
    const { step } = req.params;
    const { jobId, ...stepData } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

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
        if (stepData.evaluationTemplateId) {
          job.evaluationTemplateId = stepData.evaluationTemplateId;
        } else if (stepData.evaluationTemplateId === null) {
          job.evaluationTemplateId = undefined;
        }
        break;
      case '4':
        job.applicationDeadline = stepData.applicationDeadline;
        job.maxApplications = stepData.maxApplications || 1000;
        job.tags = stepData.tags || [];
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid step number'
        });
    }

    await job.save();

    res.json({
      success: true,
      message: `Job step ${step} updated successfully`,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all jobs with filters
const getJobs = async (req, res) => {
  try {
    const {
      q,
      city,
      department,
      employmentType,
      experienceLevel,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = { isPublished: true };

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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.json({
      success: true,
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update job
const updateJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Publish job
const publishJob = async (req, res) => {
  try {
    const { publishedOn } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this job'
      });
    }

    // Use the model method to publish
    await job.publish(publishedOn || []);

    res.json({
      success: true,
      message: 'Job published successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Close job
const closeJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this job'
      });
    }

    await job.close();

    res.json({
      success: true,
      message: 'Job closed successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Archive job
const archiveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this job'
      });
    }

    await job.archive();

    res.json({
      success: true,
      message: 'Job archived successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete job
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the creator
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    // Check if job has applications
    const applicationCount = await Application.countDocuments({ jobId: req.params.id });
    
    if (applicationCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete job with ${applicationCount} application(s). Please archive the job instead.`
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get jobs created by admin
const getAdminJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { createdBy: req.user._id };
    if (status === 'published') {
      filter.isPublished = true;
    } else if (status === 'draft') {
      filter.isPublished = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Job.countDocuments(filter);

    // Normalize response to only include required fields
    const normalizedJobs = await Promise.all(jobs.map(async (job) => {
      // Count applications for this job
      const applicationCount = await Application.countDocuments({ jobId: job._id });
      
      // Format location
      const locationParts = [];
      if (job.location?.city) locationParts.push(job.location.city);
      if (job.location?.country) locationParts.push(job.location.country);
      if (job.location?.remote) locationParts.push('Remote');
      const location = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';
      
      // Format salary
      let salary = 'Salary not specified';
      if (job.salaryRange) {
        const min = job.salaryRange.min;
        const max = job.salaryRange.max;
        const currency = job.salaryRange.currency || 'USD';
        if (min && max) {
          salary = `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
        } else if (min) {
          salary = `${currency} ${min.toLocaleString()}+`;
        } else if (max) {
          salary = `Up to ${currency} ${max.toLocaleString()}`;
        }
      }
      
      // Format status (Published / Live)
      let statusDisplay = job.status || 'Draft';
      if (job.isPublished && job.status === 'published') {
        statusDisplay = 'Live';
      } else if (job.isPublished) {
        statusDisplay = 'Published';
      }
      
      // Get first requirement for "Additional Requirement"
      const additionalRequirement = job.requirements && job.requirements.length > 0 
        ? job.requirements[0] 
        : 'None';

      return {
        _id: job._id,
        title: job.title,
        status: statusDisplay,
        department: job.department,
        location: location,
        type: job.employmentType || job.jobType || 'Not specified',
        salary: salary,
        numberOfApplications: applicationCount,
        createdAt: job.createdAt,
        publishedAt: job.publishedAt || null,
        additionalRequirement: additionalRequirement
      };
    }));

    res.json({
      success: true,
      jobs: normalizedJobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get applications for a job or all applications
const getJobApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Handle "all" case - get applications for all jobs created by the admin
    let filter = {};
    
    if (req.params.id === 'all') {
      // Get all jobs created by this admin
      const adminJobs = await Job.find({ createdBy: req.user._id }).select('_id');
      const jobIds = adminJobs.map(job => job._id);
      
      if (jobIds.length === 0) {
        // No jobs created by this admin
        return res.json({
          success: true,
          applications: [],
          pagination: {
            current: parseInt(page),
            pages: 0,
            total: 0
          }
        });
      }
      
      filter = { jobId: { $in: jobIds } };
    } else {
      // Specific job ID
      filter = { jobId: req.params.id };
    }
    
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find(filter)
      .populate('candidateId', 'firstName lastName email phone')
      .populate('jobId', 'title')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Normalize to minimal fields for list view
    const transformedApplications = applications.map(app => {
      const appObj = app.toObject();

      const isGuest = !!appObj.isGuestApplication;
      const candidate = isGuest ? (appObj.candidateSnapshot || {}) : (appObj.candidateId || {});
      const firstName = candidate.firstName || '';
      const lastName = candidate.lastName || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';

      return {
        id: appObj._id,
        name: fullName,
        email: candidate.email || '',
        phone: candidate.phone || '',
        jobTitle: (appObj.jobId && appObj.jobId.title) ? appObj.jobId.title : 'Unknown Job',
        status: appObj.status,
        appliedAt: appObj.appliedAt,
      };
    });

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      applications: transformedApplications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get job statistics
const getJobStats = async (req, res) => {
  try {
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

    res.json({
      success: true,
      stats: {
        total: totalJobs,
        published: publishedJobs,
        draft: draftJobs,
        byStatus: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Search jobs with advanced filters
const searchJobs = async (req, res) => {
  try {
    const {
      q,
      location,
      department,
      employmentType,
      experienceLevel,
      salaryMin,
      salaryMax,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isPublished: true, status: 'published' };

    if (q) {
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    if (location) {
      filter['location.city'] = new RegExp(location, 'i');
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

    if (salaryMin || salaryMax) {
      filter['salaryRange.min'] = {};
      if (salaryMin) filter['salaryRange.min'].$gte = parseInt(salaryMin);
      if (salaryMax) filter['salaryRange.max'] = { $lte: parseInt(salaryMax) };
    }

    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const jobs = await Job.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(filter);

    res.json({
      success: true,
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get job titles only (lightweight endpoint for filtering)
const getJobTitles = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id })
      .select('_id title')
      .sort({ createdAt: -1 })
      .lean();

    const jobTitles = jobs.map(job => ({
      _id: job._id,
      title: job.title
    }));

    res.json({
      success: true,
      jobs: jobTitles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createJob,
  updateJobStep,
  getJobs,
  searchJobs,
  getJobById,
  updateJob,
  publishJob,
  closeJob,
  archiveJob,
  deleteJob,
  getAdminJobs,
  getJobTitles,
  getJobApplications,
  getJobStats
};

