require('dotenv').config();

const Job = require('../jobs/job.model');
const GuestApplication = require('./guestApplication.model');
const Application = require('../application/application.model');
const { Candidate } = require('../auth/auth.model');
const EmailService = require('../../services/emailService');
const cvParsingService = require('../../services/cvParsingService');

/**
 * Guest Application Utility Functions
 * Helper functions for guest application module
 */
class GuestApplicationUtils {
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
   * Check for duplicate guest application
   */
  static async checkDuplicateGuestApplication(jobId, email) {
    const existingGuestApplication = await GuestApplication.findOne({
      jobId,
      'candidateInfo.email': email.toLowerCase()
    });

    if (existingGuestApplication) {
      throw new Error('You have already applied for this job');
    }
  }

  /**
   * Check if candidate with email exists and has already applied
   */
  static async checkExistingCandidateApplication(jobId, email) {
    const existingCandidate = await Candidate.findOne({ 
      email: email.toLowerCase() 
    });
    
    if (existingCandidate) {
      const existingApplication = await Application.findOne({
        jobId,
        candidateId: existingCandidate._id
      });

      if (existingApplication) {
        throw new Error('You have already applied for this job. Please sign in to view your application.');
      }
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
        console.log('CV parsed successfully for guest application');
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

  /**
   * Send confirmation email
   */
  static async sendConfirmationEmail(guestApplication, job, firstName, lastName) {
    try {
      const frontendUrl = process.env.FRONTEND_URL;
      const emailTemplate = EmailService.generateApplicationConfirmationEmail(
        `${firstName} ${lastName}`,
        job.title,
        guestApplication.trackingToken,
        frontendUrl
      );

      await EmailService.sendEmail(
        guestApplication.candidateInfo.email,
        emailTemplate.subject,
        emailTemplate.html
      );
      console.log('Confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the application if email fails
    }
  }
}

module.exports = GuestApplicationUtils;
