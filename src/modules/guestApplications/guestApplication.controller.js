const { validationResult } = require('express-validator');
const GuestApplicationService = require('./guestApplication.service');
const GuestApplicationUtils = require('./guestApplication.utils');

/**
 * Guest Application Controller
 * Handles HTTP requests and delegates business logic to GuestApplicationService
 */

// Middleware to parse candidateInfo before validation
const parseCandidateInfo = (req, res, next) => {
  console.log('=== parseCandidateInfo Middleware ===');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('candidateInfo exists:', !!req.body.candidateInfo);
  console.log('candidateInfo type:', typeof req.body.candidateInfo);
  
  // Parse candidateInfo if it's a JSON string
  if (req.body.candidateInfo && typeof req.body.candidateInfo === 'string') {
    console.log('candidateInfo is a string, parsing...');
    console.log('candidateInfo string value:', req.body.candidateInfo);
    
    try {
      const parsed = JSON.parse(req.body.candidateInfo);
      console.log('Successfully parsed candidateInfo:', parsed);
      
      // Remove linkedinUrl if it's empty string to avoid validation errors
      if (parsed.linkedinUrl === '') {
        delete parsed.linkedinUrl;
      }
      
      req.body.candidateInfo = parsed;
      console.log('Final candidateInfo after parsing:', req.body.candidateInfo);
    } catch (error) {
      console.error('Failed to parse candidateInfo:', error);
      console.error('candidateInfo string that failed:', req.body.candidateInfo);
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate information format'
      });
    }
  } else {
    console.log('candidateInfo is not a string, type:', typeof req.body.candidateInfo);
    console.log('candidateInfo value:', req.body.candidateInfo);
  }
  
  console.log('Final req.body.candidateInfo:', req.body.candidateInfo);
  next();
};

// Apply for job as guest
const applyForJobAsGuest = async (req, res) => {
  console.log('=== Guest Application Request ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files);
  console.log('File:', req.file);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { 
    jobId, 
    candidateInfo,
    screeningAnswers: rawScreeningAnswers, 
    source = 'company_website' 
  } = req.body;
  
  // Parse screening answers
  const screeningAnswers = GuestApplicationUtils.parseScreeningAnswers(rawScreeningAnswers);
  
  const resumePath = req.file ? req.file.path : null;
  const resumeFilename = req.file ? req.file.filename : null;

  try {
    const result = await GuestApplicationService.applyForJobAsGuest(
      jobId,
      candidateInfo,
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
    console.error('Guest application error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('already') ? 400 :
                      error.message.includes('available') ? 400 :
                      error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get guest application by tracking token
const getGuestApplicationByToken = async (req, res) => {
  try {
    const result = await GuestApplicationService.getGuestApplicationByToken(req.params.trackingToken);

    res.json({
      success: true,
      application: result
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get guest application by email
const getGuestApplicationByEmail = async (req, res) => {
  try {
    const applications = await GuestApplicationService.getGuestApplicationByEmail(req.params.email);

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Convert guest application to user account
const convertGuestToUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { trackingToken, password } = req.body;

    const candidate = await GuestApplicationService.convertGuestToUser(trackingToken, password);

    res.json({
      success: true,
      message: 'Account created successfully',
      candidate
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('already exists') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Send application status update email (placeholder)
const sendStatusUpdateEmail = async (guestApplication, newStatus) => {
  try {
    console.log(`Sending status update email to ${guestApplication.candidateInfo.email}: ${newStatus}`);
    return true;
  } catch (error) {
    console.error('Error sending status update email:', error);
    return false;
  }
};

module.exports = {
  parseCandidateInfo,
  applyForJobAsGuest,
  getGuestApplicationByToken,
  getGuestApplicationByEmail,
  convertGuestToUser,
  sendStatusUpdateEmail
};