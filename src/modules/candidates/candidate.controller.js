const { validationResult } = require('express-validator');
const CandidateService = require('./candidate.service');

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

module.exports = {
  addSingleCandidate,
  addBulkCandidates,
};


