const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

// Import Candidate from auth module
const { Candidate } = require('../auth/auth.model');

// Import Application model
const Application = require('../application/application.model');

// Import Job model
const Job = require('../jobs/job.model');

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.userType;
    
    if (userType !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can access profile data'
      });
    }

    // Get candidate with populated profile data
    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      candidate: candidate.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const userType = req.userType;
    
    if (userType !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can update profile data'
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      totalExperience,
      linkedinUrl,
      profile
    } = req.body;

    // Check if email is being changed and if it's already in use
    if (email && email !== req.user.email) {
      const existingCandidate = await Candidate.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      
      if (existingCandidate) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another candidate'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (totalExperience !== undefined) updateData.totalExperience = totalExperience;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    
    // Handle profile nested object
    if (profile) {
      if (profile.bio !== undefined) {
        updateData['profile.bio'] = profile.bio;
      }
      if (profile.skills !== undefined) {
        updateData['profile.skills'] = profile.skills;
      }
      if (profile.education !== undefined) {
        updateData['profile.education'] = profile.education;
      }
      if (profile.experience !== undefined) {
        updateData['profile.experience'] = profile.experience;
      }
    }

    // Update candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!updatedCandidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      candidate: updatedCandidate.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get profile statistics
const getProfileStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.userType;
    
    if (userType !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can access profile stats'
      });
    }

    // Get candidate data
    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Count applications
    const totalApplications = await Application.countDocuments({ 
      candidateId: userId 
    });

    // Count recent applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentApplications = await Application.countDocuments({
      candidateId: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Calculate profile completion percentage
    const profileCompletion = calculateProfileCompletion(candidate);

    // TODO: Implement profile views tracking when feature is added
    const profileViews = 0; // Placeholder for future implementation

    res.json({
      success: true,
      profileViews,
      applicationsCount: totalApplications,
      profileCompletionPercentage: profileCompletion,
      recentApplications
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.userType;
    
    if (userType !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can upload avatars'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    // Get candidate
    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Delete old avatar if exists
    if (candidate.profile?.avatar) {
      const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', candidate.profile.avatar);
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        console.warn('Could not delete old avatar:', err.message);
      }
    }

    // Update candidate with new avatar path
    const avatarFilename = req.file.filename;
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      userId,
      { 'profile.avatar': avatarFilename },
      { new: true }
    );

    const avatarUrl = `/uploads/avatars/${avatarFilename}`;

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl,
      candidate: updatedCandidate.toJSON()
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete avatar
const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.userType;
    
    if (userType !== 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can delete avatars'
      });
    }

    // Get candidate
    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Delete avatar file if exists
    if (candidate.profile?.avatar) {
      const avatarPath = path.join(__dirname, '../../uploads/avatars', candidate.profile.avatar);
      try {
        await fs.unlink(avatarPath);
      } catch (err) {
        console.warn('Could not delete avatar file:', err.message);
      }
    }

    // Remove avatar from candidate profile
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      userId,
      { $unset: { 'profile.avatar': 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Avatar removed successfully',
      candidate: updatedCandidate.toJSON()
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (candidate) => {
  let completed = 0;
  const total = 8;

  // Basic information
  if (candidate.firstName) completed++;
  if (candidate.lastName) completed++;
  if (candidate.email) completed++;
  if (candidate.phone) completed++;
  
  // Profile information
  if (candidate.profile?.bio) completed++;
  if (candidate.totalExperience > 0) completed++;
  if (candidate.profile?.skills && candidate.profile.skills.length > 0) completed++;
  if (candidate.profile?.avatar) completed++;

  return Math.round((completed / total) * 100);
};

// Get candidate's saved jobs
const getSavedJobs = async (req, res) => {
  try {
    const candidateId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const candidate = await Candidate.findById(candidateId)
      .populate({
        path: 'savedJobs',
        match: { status: { $ne: 'archived' } }, // Don't show archived jobs
        options: {
          sort: { createdAt: -1 },
          skip: skip,
          limit: limit
        }
      });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Get total count for pagination
    const totalSavedJobs = candidate.savedJobs.length;
    const totalPages = Math.ceil(totalSavedJobs / limit);

    res.json({
      success: true,
      jobs: candidate.savedJobs || [],
      pagination: {
        current: page,
        pages: totalPages,
        total: totalSavedJobs,
        limit: limit
      }
    });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Save a job for candidate
const saveJob = async (req, res) => {
  try {
    const candidateId = req.user._id;
    const { jobId } = req.params;

    // Validate job exists and is published
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (!job.isPublished || job.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Job is not available for saving'
      });
    }

    // Add job to saved jobs
    const candidate = await Candidate.findById(candidateId);
    await candidate.addSavedJob(jobId);

    res.json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Unsave a job for candidate
const unsaveJob = async (req, res) => {
  try {
    const candidateId = req.user._id;
    const { jobId } = req.params;

    const candidate = await Candidate.findById(candidateId);
    await candidate.removeSavedJob(jobId);

    res.json({
      success: true,
      message: 'Job removed from saved jobs'
    });
  } catch (error) {
    console.error('Unsave job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Check if job is saved by candidate
const checkJobSaved = async (req, res) => {
  try {
    const candidateId = req.user._id;
    const { jobId } = req.params;

    const candidate = await Candidate.findById(candidateId);
    const isSaved = candidate.savedJobs.includes(jobId);

    res.json({
      success: true,
      isSaved: isSaved
    });
  } catch (error) {
    console.error('Check job saved error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProfileStats,
  uploadAvatar,
  deleteAvatar,
  getSavedJobs,
  saveJob,
  unsaveJob,
  checkJobSaved
};
