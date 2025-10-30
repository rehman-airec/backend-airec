const { validationResult } = require('express-validator');
const ApplicationService = require('./application.service');
const ApplicationUtils = require('./application.utils');
const EmailService = require('../../services/emailService');
const GuestApplication = require('../guestApplications/guestApplication.model');
const { notifyUser } = require('../../services/realtime');

/**
 * Application Controller
 * Handles HTTP requests and delegates business logic to ApplicationService
 */

// Apply for job
const applyForJob = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { jobId, screeningAnswers: rawScreeningAnswers, source = 'company_website' } = req.body;
  
  // Parse screening answers
  const screeningAnswers = ApplicationUtils.parseScreeningAnswers(rawScreeningAnswers);
  
  const resumePath = req.file ? req.file.path : null;
  const resumeFilename = req.file ? req.file.filename : null;

  try {
    const result = await ApplicationService.applyForJob(
      jobId,
      req.user._id,
      resumePath,
      resumeFilename,
      screeningAnswers,
      source
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: result
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('already applied') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get application by ID
const getApplicationById = async (req, res) => {
  try {
    const result = await ApplicationService.getApplicationById(
      req.params.id,
      req.user._id,
      req.userType,
      req.user.role
    );

    res.json({
      success: true,
      application: result
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('authorized') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { status, note, priority } = req.body;

  try {
    const application = await ApplicationService.updateApplicationStatus(
      req.params.id,
      status,
      priority,
      req.user._id,
      note
    );

    // Send email notification for guest applications
    if (application.isGuestApplication && application.guestApplicationId) {
      try {
        const guestApplication = await GuestApplication.findById(application.guestApplicationId);
        const Job = require('../jobs/job.model');
        const job = await Job.findById(application.jobId);
        
        if (guestApplication && job) {
          const frontendUrl = process.env.FRONTEND_URL;
          const emailTemplate = EmailService.generateStatusUpdateEmail(
            `${guestApplication.candidateInfo.firstName} ${guestApplication.candidateInfo.lastName}`,
            job.title,
            status,
            guestApplication.trackingToken,
            frontendUrl
          );

          const emailResult = await EmailService.sendEmail(
            guestApplication.candidateInfo.email,
            emailTemplate.subject,
            emailTemplate.html
          );

          // Log email dispatch in application logs
          try {
            application.logs.push({
              action: `Email sent: Status update (${status})`,
              userId: req.user._id,
              userRole: 'Admin',
              metadata: {
                to: guestApplication.candidateInfo.email,
                subject: emailTemplate.subject,
                messageId: emailResult?.messageId || null,
                candidateType: 'Guest'
              }
            });
            await application.save();
          } catch (logErr) {
            console.error('Failed to log status update email (guest):', logErr);
          }
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the request if email sending fails
      }
    } else if (application.candidateId) {
      // Send email notification for registered candidates
      try {
        const { Candidate } = require('../auth/auth.model');
        const Job = require('../jobs/job.model');
        const candidate = await Candidate.findById(application.candidateId);
        const job = await Job.findById(application.jobId);

        if (candidate && job) {
          const frontendUrl = process.env.FRONTEND_URL;
          const emailTemplate = EmailService.generateStatusUpdateEmailForRegistered(
            `${candidate.firstName} ${candidate.lastName}`,
            job.title,
            status,
            application._id,
            frontendUrl
          );

          const emailResult = await EmailService.sendEmail(
            candidate.email,
            emailTemplate.subject,
            emailTemplate.html
          );

          // Log email dispatch in application logs
          try {
            application.logs.push({
              action: `Email sent: Status update (${status})`,
              userId: req.user._id,
              userRole: 'Admin',
              metadata: {
                to: candidate.email,
                subject: emailTemplate.subject,
                messageId: emailResult?.messageId || null,
                candidateType: 'Registered'
              }
            });
            await application.save();
          } catch (logErr) {
            console.error('Failed to log status update email (registered):', logErr);
          }
        }
      } catch (emailError) {
        console.error('Failed to send status update email (registered candidate):', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // Emit realtime notifications
    try {
      if (application.candidateId) {
        notifyUser(String(application.candidateId), {
          type: 'application_status',
          title: 'Application Status Updated',
          message: `Your application status changed to ${status}`,
          applicationId: String(application._id),
          status,
          timestamp: new Date().toISOString()
        });
      }
    } catch (emitErr) {
      console.error('Failed to emit notification:', emitErr);
    }

    // Reload populated application and return a consistent, full response
    try {
      const Application = require('./application.model');
      const populated = await Application.findById(application._id)
        .populate('jobId', 'title department location employmentType experienceLevel description')
        .populate('candidateId', 'firstName lastName email phone totalExperience linkedinUrl')
        .populate('notes.adminId', 'name email')
        .populate('notes.editedBy', 'name email');

      const fullApp = ApplicationUtils.transformApplication(populated);

      res.json({
        success: true,
        message: 'Application status updated successfully',
        application: fullApp
      });
    } catch (populateErr) {
      // Fallback to original object if populate/transform fails
      console.error('Failed to populate application after status update:', populateErr);
      res.json({
        success: true,
        message: 'Application status updated successfully',
        application
      });
    }
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get candidate applications
const getCandidateApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await ApplicationService.getCandidateApplications(
      req.user._id,
      { page, limit, status },
      { page, limit }
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get application statistics for admin
const getApplicationStats = async (req, res) => {
  try {
    const stats = await ApplicationService.getApplicationStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Add note to application
const addNoteToApplication = async (req, res) => {
  try {
    const { note } = req.body;

    const application = await ApplicationService.addNote(
      req.params.id,
      req.user._id,
      note
    );

    res.json({
      success: true,
      message: 'Note added successfully',
      application
    });
  } catch (error) {
    const statusCode = error.message.includes('required') ? 400 :
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

const updateNoteInApplication = async (req, res) => {
  try {
    const { noteIndex } = req.params;
    const { note } = req.body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }

    const updatedApplication = await ApplicationService.updateNote(
      req.params.id,
      parseInt(noteIndex),
      req.user._id,
      note
    );

    res.json({
      success: true,
      message: 'Note updated successfully',
      application: ApplicationUtils.transformApplication(updatedApplication)
    });
  } catch (error) {
    const statusCode = error.message.includes('required') ? 400 :
                      error.message.includes('not found') ? 404 :
                      error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Bulk update application statuses
const bulkUpdateApplicationStatus = async (req, res) => {
  try {
    const { applicationIds, status, note } = req.body;

    const count = await ApplicationService.bulkUpdateApplicationStatus(
      applicationIds,
      status,
      req.user._id,
      note
    );

    res.json({
      success: true,
      message: `${count} applications updated successfully`
    });
  } catch (error) {
    const statusCode = error.message.includes('required') ? 400 :
                      error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get application analytics
const getApplicationAnalytics = async (req, res) => {
  try {
    const { jobId, startDate, endDate } = req.query;

    const analytics = await ApplicationService.getApplicationAnalytics({
      jobId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      analytics
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
  applyForJob,
  getApplicationById,
  updateApplicationStatus,
  addNoteToApplication,
  updateNoteInApplication,
  bulkUpdateApplicationStatus,
  getCandidateApplications,
  getApplicationStats,
  getApplicationAnalytics
};

