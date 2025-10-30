const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectory based on job ID if available
    let destDir = uploadsDir;
    if (req.body.jobId) {
      destDir = path.join(uploadsDir, req.body.jobId);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
    }
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and user ID
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const userId = req.user ? req.user._id.toString().slice(-8) : 'anonymous';
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${randomSuffix}_${userId}_${originalName}`;
    cb(null, filename);
  }
});

// File filter to only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1 // Only allow one file at a time
  }
});

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.' 
      });
    }
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({ 
      message: 'Only PDF files are allowed' 
    });
  }
  
  next(error);
};

// Upload middleware for events - allows all file types
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create directory for event attachments
    const eventAttachmentsDir = path.join(__dirname, '../../uploads/event-attachments');
    if (!fs.existsSync(eventAttachmentsDir)) {
      fs.mkdirSync(eventAttachmentsDir, { recursive: true });
    }
    cb(null, eventAttachmentsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and user ID
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const userId = req.user ? req.user._id.toString().slice(-8) : 'anonymous';
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${randomSuffix}_${userId}_${originalName}`;
    cb(null, filename);
  }
});

// File filter that allows all file types for events
const eventFileFilter = (req, file, cb) => {
  // Allow all file types
  cb(null, true);
};

const uploadEventAttachments = multer({
  storage: eventStorage,
  fileFilter: eventFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Allow up to 10 files for events
  }
});

module.exports = { upload, uploadEventAttachments, handleUploadError };
