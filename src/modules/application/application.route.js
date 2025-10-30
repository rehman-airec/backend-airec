const express = require('express');
const router = express.Router();
const {
  applyForJob,
  getApplicationById,
  updateApplicationStatus,
  addNoteToApplication,
  updateNoteInApplication,
  bulkUpdateApplicationStatus,
  getCandidateApplications,
  getApplicationStats,
  getApplicationAnalytics
} = require('./application.controller');
const {
  createEvent,
  getApplicationEvents,
  updateEvent,
  deleteEvent,
  getAvailableAttendees
} = require('./event.controller');
const {
  createEvaluation,
  getApplicationEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  getEvaluationStats
} = require('./evaluation.controller');
const {
  validateApplication,
  validateApplicationStatusUpdate,
  validateEventCreation,
  validateEvaluationCreation
} = require('../../middleware/validation');
const { auth, adminAuth, candidateAuth } = require('../../middleware/auth');
const { upload, uploadEventAttachments, handleUploadError } = require('../../middleware/upload');
const { parseFormDataArrays } = require('../../middleware/parseFormData');

// Apply for job (candidate only)
router.post('/jobs/:jobId/apply', 
  auth, 
  candidateAuth, 
  upload.single('resume'),
  handleUploadError,
  validateApplication,
  applyForJob
);

// Get candidate applications
router.get('/candidate/applications', auth, candidateAuth, getCandidateApplications);

// Get candidate application by ID
router.get('/candidate/:id', auth, candidateAuth, getApplicationById);

// Admin routes
router.get('/:id', auth, adminAuth, getApplicationById);
router.put('/:id/status', auth, adminAuth, validateApplicationStatusUpdate, updateApplicationStatus);
router.post('/:id/note', auth, adminAuth, addNoteToApplication);
router.put('/:id/note/:noteIndex', auth, adminAuth, updateNoteInApplication);
router.put('/bulk/status', auth, adminAuth, bulkUpdateApplicationStatus);
router.get('/admin/stats', auth, adminAuth, getApplicationStats);
router.get('/admin/analytics', auth, adminAuth, getApplicationAnalytics);

// Event routes
router.post('/:applicationId/events', 
  auth, 
  adminAuth, 
  uploadEventAttachments.array('attachments', 10),
  handleUploadError,
  parseFormDataArrays,
  validateEventCreation, 
  createEvent
);
router.get('/:applicationId/events', auth, adminAuth, getApplicationEvents);
router.get('/:applicationId/events/available-attendees', auth, adminAuth, getAvailableAttendees);
router.put('/events/:eventId', auth, adminAuth, uploadEventAttachments.array('attachments', 10), handleUploadError, parseFormDataArrays, updateEvent);
router.delete('/events/:eventId', auth, adminAuth, deleteEvent);

// Evaluation routes
router.post('/:applicationId/evaluations', 
  auth, 
  adminAuth, 
  validateEvaluationCreation, 
  createEvaluation
);
router.get('/:applicationId/evaluations', auth, adminAuth, getApplicationEvaluations);
router.get('/evaluations/:evaluationId', auth, adminAuth, getEvaluationById);
router.put('/evaluations/:evaluationId', auth, adminAuth, updateEvaluation);
router.delete('/evaluations/:evaluationId', auth, adminAuth, deleteEvaluation);
router.get('/:applicationId/evaluations/stats', auth, adminAuth, getEvaluationStats);

module.exports = router;

