const { validationResult } = require('express-validator');
const CandidateService = require('./candidate.service');
const { logger } = require('../../config/database');

// Add single candidate
const addSingleCandidate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const files = req.files || {};
    const resume = files.resume?.[0] || null;
    const coverLetter = files.coverLetter?.[0] || null;

    const result = await CandidateService.addSingleCandidate({
      body: req.body,
      resume,
      coverLetter,
      adminId: req.user?._id,
    });

    res.status(201).json({ success: true, message: 'Candidate added successfully', candidate: result });
  } catch (error) {
    const status = error.message?.includes('exists') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Server error' });
  }
};

// Add bulk candidates
const addBulkCandidates = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const files = req.files || [];
    const result = await CandidateService.addBulkCandidates({
      body: req.body,
      files,
      adminId: req.user?._id,
    });

    res.status(201).json({ success: true, message: 'Bulk candidates processed', summary: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// List candidates (admin)
const listCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const tenantId = req.tenantId || null;

    const result = await CandidateService.getCandidates(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit)
    }, {
      search: search || undefined,
      role: role || undefined
    });

    res.json({
      success: true,
      data: result.candidates,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
};

// Get candidate by ID (admin)
const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await CandidateService.getCandidateById(id);

    res.json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch candidate',
    });
  }
};

// Update candidate (admin)
const updateCandidate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const files = req.files || {};

    const candidate = await CandidateService.updateCandidate(id, req.body, files);

    res.json({
      success: true,
      message: 'Candidate updated successfully',
      data: candidate,
    });
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 
                   error.message?.includes('exists') ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update candidate',
    });
  }
};

// Delete candidate (admin)
const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    await CandidateService.deleteCandidate(id);

    res.json({
      success: true,
      message: 'Candidate deleted successfully',
    });
  } catch (error) {
    const status = error.message?.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete candidate',
    });
  }
};

module.exports = {
  addSingleCandidate,
  addBulkCandidates,
  listCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
};


