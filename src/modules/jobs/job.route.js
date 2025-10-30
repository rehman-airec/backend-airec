const express = require('express');
const router = express.Router();
const {
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
} = require('./job.controller');
const {
  validateJobCreation
} = require('../../middleware/validation');
const { auth, adminAuth } = require('../../middleware/auth');

// Public routes
router.get('/', getJobs);
router.get('/search', searchJobs);
router.get('/:id', getJobById);

// Protected routes (admin only)
router.post('/', auth, adminAuth, validateJobCreation, createJob);
router.put('/:id/step/:step', auth, adminAuth, updateJobStep);
router.put('/:id', auth, adminAuth, updateJob);
router.post('/:id/publish', auth, adminAuth, publishJob);
router.post('/:id/close', auth, adminAuth, closeJob);
router.post('/:id/archive', auth, adminAuth, archiveJob);
router.delete('/:id', auth, adminAuth, deleteJob);
router.get('/admin/jobs', auth, adminAuth, getAdminJobs);
router.get('/admin/job-titles', auth, adminAuth, getJobTitles);
router.get('/admin/stats', auth, adminAuth, getJobStats);
router.get('/:id/applications', auth, adminAuth, getJobApplications);

module.exports = router;

