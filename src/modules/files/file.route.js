const express = require('express');
const router = express.Router();
const {
  uploadResume,
  servePDF,
  deleteFile,
  getFileInfo,
  listFiles
} = require('./file.controller');
const { auth } = require('../../middleware/auth');
const { upload, handleUploadError } = require('../../middleware/upload');

// Upload resume
router.post('/resume', 
  auth, 
  upload.single('resume'),
  handleUploadError,
  uploadResume
);

// Serve PDF file  
router.get('/resume/:filename', auth, servePDF);

// Debug route to check file existence (temporary)
router.get('/debug/:filename', auth, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { filename } = req.params;
  const backendRoot = process.cwd();
  const filePath = path.join(backendRoot, 'uploads', 'resumes', filename);
  
  res.json({
    filename,
    filePath,
    exists: fs.existsSync(filePath),
    cwd: process.cwd(),
    __dirname
  });
});

// Get file info
router.get('/resume/:filename/info', auth, getFileInfo);

// List files (admin only)
router.get('/list', auth, listFiles);

// Delete file (admin only)
router.delete('/resume/:filename', auth, deleteFile);

module.exports = router;
