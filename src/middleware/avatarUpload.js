const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and user ID
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const userId = req.user ? req.user._id.toString().slice(-8) : 'anonymous';
    const extension = path.extname(file.originalname);
    const filename = `avatar_${timestamp}_${randomSuffix}_${userId}${extension}`;
    cb(null, filename);
  }
});

// File filter for avatars (images only)
const avatarFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars'), false);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
    files: 1
  }
});

// Middleware to handle avatar upload errors
const handleAvatarUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: 'Avatar file too large. Maximum size is 5MB.' 
      });
    }
  }
  
  if (error.message.includes('Only image files')) {
    return res.status(400).json({ 
      success: false,
      message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars' 
    });
  }
  
  next(error);
};

module.exports = { avatarUpload, handleAvatarUploadError };
