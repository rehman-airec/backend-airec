const GuestApplication = require('./guestApplication.model');
const Application = require('../application/application.model');
const Job = require('../jobs/job.model');
const { Candidate } = require('../auth/auth.model');
const cvParsingService = require('../../services/cvParsingService');
const EmailService = require('../../services/emailService');
const crypto = require('crypto');
const GuestApplicationUtils = require('./guestApplication.utils');

/**
 * Guest Application Service
 * Contains all business logic for guest application operations
 */
class GuestApplicationService {
  /**
   * Apply for job as guest
   */
  static async applyForJobAsGuest(jobId, candidateInfo, resumePath, resumeFilename, screeningAnswers, source) {
    // Validate job
    const job = await GuestApplicationUtils.validateJobForApplication(jobId);
    
    // Parse screening answers
    const parsedScreeningAnswers = GuestApplicationUtils.parseScreeningAnswers(screeningAnswers);

    // Check for duplicate application
    await GuestApplicationUtils.checkDuplicateGuestApplication(jobId, candidateInfo.email);
    
    // Check if user with this email already exists and has applied
    await GuestApplicationUtils.checkExistingCandidateApplication(jobId, candidateInfo.email);

    // Validate resume
    GuestApplicationUtils.validateResume(resumePath, resumeFilename);

    // Parse CV
    const parsedCVData = await GuestApplicationUtils.parseCandidateResume(resumePath, resumeFilename);

    // Generate tracking token
    const trackingToken = crypto.randomBytes(32).toString('hex');

    // Create guest application
    const guestApplication = await GuestApplication.create({
      jobId,
      candidateInfo: {
        ...candidateInfo,
        email: candidateInfo.email.toLowerCase()
      },
      resumePath,
      resumeFilename,
      parsedCVData,
      screeningAnswers: parsedScreeningAnswers || [],
      source,
      trackingToken
    });

    // Get candidate data (use parsed CV data if available for better data quality)
    const candidateData = parsedCVData && parsedCVData.firstName ? parsedCVData : candidateInfo;
    
    // Create corresponding Application record
    const application = await Application.create({
      jobId,
      isGuestApplication: true,
      guestApplicationId: guestApplication._id,
      resumePath,
      resumeFilename,
      parsedCVData,
      screeningAnswers: parsedScreeningAnswers || [],
      source,
      candidateSnapshot: {
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        email: candidateData.email,
        phone: candidateData.phone,
        totalExperience: candidateData.totalExperience || 0,
        linkedinUrl: candidateData.linkedinUrl || ''
      }
    });

    // Increment job application count
    await job.incrementApplications();

    // Send confirmation email
    await GuestApplicationUtils.sendConfirmationEmail(guestApplication, job, candidateInfo.firstName, candidateInfo.lastName);

    return {
      id: application._id,
      guestApplicationId: guestApplication._id,
      jobId: application.jobId,
      status: application.status,
      appliedAt: application.appliedAt,
      trackingToken: guestApplication.trackingToken
    };
  }

  /**
   * Get guest application by tracking token
   */
  static async getGuestApplicationByToken(trackingToken) {
    const guestApplication = await GuestApplication.findOne({ trackingToken })
      .populate('jobId', 'title department location employmentType experienceLevel description');

    if (!guestApplication) {
      throw new Error('Application not found');
    }

    // Get corresponding Application record
    const application = await Application.findOne({ 
      guestApplicationId: guestApplication._id 
    });

    if (!application) {
      throw new Error('Application record not found');
    }

    // Transform the data
    return {
      ...application.toObject(),
      job: guestApplication.jobId,
      candidate: guestApplication.candidateInfo,
      guestApplication: guestApplication
    };
  }

  /**
   * Get guest applications by email
   */
  static async getGuestApplicationByEmail(email) {
    const guestApplications = await GuestApplication.find({ 
      'candidateInfo.email': email.toLowerCase() 
    })
      .populate('jobId', 'title department location employmentType experienceLevel')
      .sort({ appliedAt: -1 });

    // Get corresponding Application records
    const applicationIds = guestApplications.map(app => app._id);
    const applications = await Application.find({ 
      guestApplicationId: { $in: applicationIds } 
    });

    // Transform the data
    const transformedApplications = guestApplications.map(guestApp => {
      const application = applications.find(app => 
        app.guestApplicationId.toString() === guestApp._id.toString()
      );
      
      return {
        ...application.toObject(),
        job: guestApp.jobId,
        candidate: guestApp.candidateInfo,
        guestApplication: guestApp
      };
    });

    return transformedApplications;
  }

  /**
   * Convert guest application to user account
   */
  static async convertGuestToUser(trackingToken, password) {
    const guestApplication = await GuestApplication.findOne({ trackingToken });
    
    if (!guestApplication) {
      throw new Error('Guest application not found');
    }

    // Check if user already exists
    const existingCandidate = await Candidate.findOne({ 
      email: guestApplication.candidateInfo.email.toLowerCase() 
    });

    if (existingCandidate) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    // Create new candidate account
    const candidate = await Candidate.create({
      firstName: guestApplication.candidateInfo.firstName,
      lastName: guestApplication.candidateInfo.lastName,
      email: guestApplication.candidateInfo.email,
      phone: guestApplication.candidateInfo.phone,
      password,
      totalExperience: guestApplication.candidateInfo.totalExperience,
      linkedinUrl: guestApplication.candidateInfo.linkedinUrl,
      isActive: true
    });

    // Update guest application to mark as converted
    await guestApplication.convertToUser(candidate._id);

    // Update Application record to link to new candidate
    const application = await Application.findOne({ 
      guestApplicationId: guestApplication._id 
    });
    
    if (application) {
      application.candidateId = candidate._id;
      application.isGuestApplication = false;
      application.guestApplicationId = undefined;
      await application.save();
    }

    return {
      id: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email
    };
  }
}

module.exports = GuestApplicationService;
