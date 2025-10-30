const { body } = require('express-validator');

// Admin signup validation
const validateAdminSignup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['superadmin', 'recruiter'])
    .withMessage('Invalid role')
];

// Admin login validation
const validateAdminLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Candidate signup validation
const validateCandidateSignup = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('totalExperience')
    .optional()
    .isNumeric()
    .withMessage('Experience must be a number'),
  
  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('Please provide a valid LinkedIn URL')
];

// Candidate login validation
const validateCandidateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Job creation validation
const validateJobCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3 })
    .withMessage('Job title must be at least 3 characters'),
  
  body('location.city')
    .optional()
    .trim(),
  
  body('location.country')
    .optional()
    .trim(),
  
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 2000 })
    .withMessage('Job description must be at least 2000 characters'),
  
  body('experienceRequiredYears')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Experience required is required'),
  
  body('employmentType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage('Invalid employment type'),
  
  body('jobType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Volunteer'])
    .withMessage('Invalid job type'),
  
  body('workplaceTypes')
    .optional()
    .isArray()
    .withMessage('Workplace types must be an array'),
  
  body('experienceLevel')
    .optional()
    .isIn(['Entry', 'Mid', 'Senior', 'Executive'])
    .withMessage('Invalid experience level'),
  
  body('toolsTechnologies')
    .optional()
    .isArray()
    .withMessage('Tools and technologies must be an array'),
  
  body('educationCertifications')
    .optional()
    .isArray()
    .withMessage('Education and certifications must be an array'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  
  body('jobFunctions')
    .optional()
    .isArray()
    .withMessage('Job functions must be an array'),
  
  body('interviewQuestions')
    .optional()
    .isArray()
    .withMessage('Interview questions must be an array'),
  
  body('interviewers')
    .optional()
    .isArray()
    .withMessage('Interviewers must be an array'),
  
  body('hiringManager')
    .optional(),
  
  body('assignProjectClient')
    .optional()
    .trim(),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),
  
  body('leaderboard')
    .optional()
    .isBoolean()
    .withMessage('Leaderboard must be a boolean'),
  
  body('positions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Positions must be at least 1'),
  
  body('salaryBudget.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary budget must be a number'),
  
  body('salaryBudget.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary budget must be a number'),
  
  body('salaryRange.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  
  body('salaryRange.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number'),
  
  body('salaryRange.hideFromCandidates')
    .optional()
    .isBoolean()
    .withMessage('Hide from candidates must be a boolean'),
  
  body('salaryRange.type')
    .optional()
    .isIn(['Fixed', 'Variable', 'Commission', 'Hourly'])
    .withMessage('Invalid salary type'),
  
  body('salaryRange.period')
    .optional()
    .isIn(['Yearly', 'Monthly', 'Weekly', 'Hourly'])
    .withMessage('Invalid salary period'),
  
  body('screeningQuestions')
    .optional()
    .isArray()
    .withMessage('Screening questions must be an array'),
  
  body('screeningQuestions.*.text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  
  body('screeningQuestions.*.type')
    .optional()
    .isIn(['text', 'multiple-choice', 'yes-no', 'rating'])
    .withMessage('Invalid question type'),
  
  body('screeningQuestions.*.required')
    .optional()
    .isBoolean()
    .withMessage('Required field must be boolean'),
  
  body('screeningQuestions.*.maxLength')
    .optional()
    .isNumeric()
    .withMessage('Max length must be a number'),
  
  body('screeningQuestions.*.placeholder')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Placeholder must be less than 200 characters'),
  
  body('screeningQuestions.*.correctAnswer')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Correct answer must be less than 500 characters'),
  
  body('hiringTeam')
    .optional()
    .isArray()
    .withMessage('Hiring team must be an array'),
  
  body('hiringTeam.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Team member name is required'),
  
  body('hiringTeam.*.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email for team member')
];

// Application validation
const validateApplication = [
  body('jobId')
    .isMongoId()
    .withMessage('Invalid job ID'),
  
  body('screeningAnswers')
    .optional()
    .custom((value) => {
      // Allow array or JSON string
      if (Array.isArray(value)) {
        return true;
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return false;
    })
    .withMessage('Screening answers must be an array or valid JSON string'),
  
  body('screeningAnswers.*.questionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid question ID'),
  
  body('screeningAnswers.*.answer')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Answer is required')
];

// Application status update validation
const validateApplicationStatusUpdate = [
  body('status')
    .isIn([
      'New',
      'Selected',
      'In Review',
      'Interview',
      'Offer',
      'Hired',
      'Rejected',
      'Decision Pending',
      'Saved for Future',
      'Out of Budget',
      'Shortlisted'
    ])
    .withMessage('Invalid status'),
  
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note must be less than 500 characters'),
  
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority')
];

// Bulk application status update validation
const validateBulkApplicationStatusUpdate = [
  body('applicationIds')
    .isArray({ min: 1 })
    .withMessage('Application IDs must be an array with at least one ID'),
  
  body('applicationIds.*')
    .isMongoId()
    .withMessage('Invalid application ID'),
  
  body('status')
    .isIn([
      'New',
      'Selected',
      'In Review',
      'Interview',
      'Offer',
      'Hired',
      'Rejected',
      'Decision Pending',
      'Saved for Future',
      'Out of Budget',
      'Shortlisted'
    ])
    .withMessage('Invalid status'),
  
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note must be less than 500 characters')
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Job search validation
const validateJobSearch = [
  body('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Location must be less than 50 characters'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department must be less than 50 characters'),
  
  body('employmentType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage('Invalid employment type'),
  
  body('experienceLevel')
    .optional()
    .isIn(['Entry', 'Mid', 'Senior', 'Executive'])
    .withMessage('Invalid experience level'),
  
  body('salaryMin')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  
  body('salaryMax')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number'),
  
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// File upload validation
const validateFileUpload = [
  body('jobId')
    .isMongoId()
    .withMessage('Invalid job ID')
];

// Note validation
const validateNote = [
  body('note')
    .trim()
    .notEmpty()
    .withMessage('Note is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Note must be between 1 and 500 characters')
];

// Guest application validation
const validateGuestApplication = [
  body('jobId')
    .isMongoId()
    .withMessage('Invalid job ID'),
  
  body('candidateInfo.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('candidateInfo.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('candidateInfo.email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('candidateInfo.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('candidateInfo.totalExperience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  body('candidateInfo.linkedinUrl')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value || value === '') return true;
      return /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(value);
    })
    .withMessage('Please enter a valid LinkedIn URL'),
  
  body('screeningAnswers')
    .optional()
    .custom((value) => {
      // Allow array or JSON string
      if (Array.isArray(value)) {
        return true;
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      return false;
    })
    .withMessage('Screening answers must be an array or valid JSON string'),
  
  body('screeningAnswers.*.questionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid question ID'),
  
  body('screeningAnswers.*.answer')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Answer is required'),
  
  body('source')
    .optional()
    .isIn(['company_website', 'linkedin', 'indeed', 'other'])
    .withMessage('Invalid source')
];

// Guest to user conversion validation
const validateGuestToUserConversion = [
  body('trackingToken')
    .notEmpty()
    .withMessage('Tracking token is required'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Screening template validation
const validateScreeningTemplate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3 })
    .withMessage('Template name must be at least 3 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  
  body('questions.*.text')
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  
  body('questions.*.type')
    .isIn(['text', 'multiple-choice', 'yes-no', 'rating'])
    .withMessage('Invalid question type'),
  
  body('questions.*.required')
    .isBoolean()
    .withMessage('Required field must be boolean'),
  
  body('questions.*.maxLength')
    .optional()
    .isNumeric()
    .withMessage('Max length must be a number'),
  
  body('questions.*.placeholder')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Placeholder must be less than 200 characters'),
  
  body('questions.*.correctAnswer')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Correct answer must be less than 500 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

module.exports = {
  validateAdminSignup,
  validateAdminLogin,
  validateCandidateSignup,
  validateCandidateLogin,
  validateJobCreation,
  validateApplication,
  validateApplicationStatusUpdate,
  validateBulkApplicationStatusUpdate,
  validatePasswordChange,
  validateJobSearch,
  validateFileUpload,
  validateNote,
  validateGuestApplication,
  validateGuestToUserConversion,
  validateScreeningTemplate
};

// Profile update validation
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),
  
  body('totalExperience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  body('linkedinUrl')
    .optional()
    .matches(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/)
    .withMessage('Please enter a valid LinkedIn URL'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('profile.skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  
  body('profile.skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters')
];

// Event creation validation
const validateEventCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Event title must be between 3 and 100 characters'),
  
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Attendees must be an array'),
  
  body('attendees.*.userId')
    .optional()
    .notEmpty()
    .withMessage('Attendee userId is required'),
  
  body('attendees.*.userType')
    .optional()
    .isIn(['Admin', 'Candidate'])
    .withMessage('Invalid attendee userType'),
  
  body('additionalEmails')
    .optional()
    .isArray()
    .withMessage('Additional emails must be an array'),
  
  body('additionalEmails.*')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('date')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const eventDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .withMessage('Event date cannot be in the past'),
  
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)')
    .custom((value, { req }) => {
      if (req.body.startTime && value <= req.body.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Evaluation creation validation
const validateEvaluationCreation = [
  body('overallRating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  
  body('recommendation')
    .isIn(['hire', 'maybe', 'no_hire', 'strong_hire'])
    .withMessage('Invalid recommendation'),
  
  body('strengths')
    .trim()
    .notEmpty()
    .withMessage('Strengths are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Strengths must be between 10 and 2000 characters'),
  
  body('areasOfInterest')
    .trim()
    .notEmpty()
    .withMessage('Areas of interest are required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Areas of interest must be between 10 and 2000 characters'),
  
  body('additionalNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Additional notes must be less than 2000 characters'),
  
  body('detailedRatings.technicalSkills')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Technical skills rating must be between 1 and 5'),
  
  body('detailedRatings.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  
  body('detailedRatings.culturalFit')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Cultural fit rating must be between 1 and 5'),
  
  body('detailedRatings.experience')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Experience rating must be between 1 and 5'),
  
  body('detailedRatings.problemSolving')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Problem solving rating must be between 1 and 5'),
  
  body('interviewType')
    .optional()
    .isIn(['phone', 'video', 'in_person', 'technical', 'hr', 'final'])
    .withMessage('Invalid interview type'),
  
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  
  body('isFinal')
    .optional()
    .isBoolean()
    .withMessage('isFinal must be a boolean'),
  
  body('isConfidential')
    .optional()
    .isBoolean()
    .withMessage('isConfidential must be a boolean')
];

// Evaluation template creation validation
const validateEvaluationTemplateCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('category')
    .optional()
    .isIn(['technical', 'hr', 'behavioral', 'coding', 'design', 'managerial', 'general'])
    .withMessage('Invalid category'),
  
  body('criteria')
    .optional()
    .isArray()
    .withMessage('Criteria must be an array'),
  
  body('criteria.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Criterion name is required'),
  
  body('criteria.*.ratingScale')
    .optional()
    .isIn(['1-5', '1-10', 'poor-excellent', 'custom'])
    .withMessage('Invalid rating scale'),
  
  body('overallRatingScale')
    .optional()
    .isIn(['1-5', '1-10', 'poor-excellent'])
    .withMessage('Invalid overall rating scale'),
  
  body('recommendationOptions')
    .optional()
    .isArray()
    .withMessage('Recommendation options must be an array')
];

// Evaluation template update validation
const validateEvaluationTemplateUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('category')
    .optional()
    .isIn(['technical', 'hr', 'behavioral', 'coding', 'design', 'managerial', 'general'])
    .withMessage('Invalid category'),
  
  body('criteria')
    .optional()
    .isArray()
    .withMessage('Criteria must be an array'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Add validateProfileUpdate to exports
// Email template validation
const validateEmailTemplate = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Subject must be between 3 and 200 characters'),
  
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Email body is required')
    .isLength({ min: 10 })
    .withMessage('Email body must be at least 10 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('category')
    .optional()
    .isIn(['event', 'interview', 'general'])
    .withMessage('Invalid category'),
  
  body('variables')
    .optional()
    .isArray()
    .withMessage('Variables must be an array')
];

module.exports.validateProfileUpdate = validateProfileUpdate;
module.exports.validateEventCreation = validateEventCreation;
module.exports.validateEvaluationCreation = validateEvaluationCreation;
module.exports.validateEvaluationTemplateCreation = validateEvaluationTemplateCreation;
module.exports.validateEvaluationTemplateUpdate = validateEvaluationTemplateUpdate;
module.exports.validateEmailTemplate = validateEmailTemplate;
