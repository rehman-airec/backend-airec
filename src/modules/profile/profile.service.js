const { Candidate } = require('../auth/auth.model');
const Application = require('../application/application.model');
const Job = require('../jobs/job.model');
const ProfileUtils = require('./profile.utils');
const fs = require('fs').promises;
const path = require('path');

/**
 * Profile Service
 * Contains all business logic for profile operations
 */
class ProfileService {
  /**
   * Get current user profile
   */
  static async getProfile(userId, userType) {
    if (userType !== 'candidate') {
      throw new Error('Only candidates can access profile data');
    }

    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return candidate.toJSON();
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, userType, updateData) {
    if (userType !== 'candidate') {
      throw new Error('Only candidates can update profile data');
    }

    const { email } = updateData;

    // Check if email is being changed and if it's already in use
    if (email) {
      await ProfileUtils.checkEmailAvailability(email, userId);
    }

    // Prepare update data
    const update = ProfileUtils.prepareUpdateData(updateData);

    // Update candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      userId,
      update,
      { new: true, runValidators: true }
    );

    if (!updatedCandidate) {
      throw new Error('Candidate not found');
    }

    return updatedCandidate.toJSON();
  }

  /**
   * Get profile statistics
   */
  static async getProfileStats(userId, userType) {
    if (userType !== 'candidate') {
      throw new Error('Only candidates can access profile stats');
    }

    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      throw new Error('Candidate not found');
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
    const profileCompletion = ProfileUtils.calculateProfileCompletion(candidate);

    return {
      profileViews: 0, // Placeholder for future implementation
      applicationsCount: totalApplications,
      profileCompletionPercentage: profileCompletion,
      recentApplications
    };
  }

  /**
   * Upload avatar
   */
  static async uploadAvatar(userId, userType, file) {
    if (userType !== 'candidate') {
      throw new Error('Only candidates can upload avatars');
    }

    if (!file) {
      throw new Error('No avatar file provided');
    }

    // Get candidate
    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      throw new Error('Candidate not found');
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
    const avatarFilename = file.filename;
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      userId,
      { 'profile.avatar': avatarFilename },
      { new: true }
    );

    const avatarUrl = `/uploads/avatars/${avatarFilename}`;

    return {
      avatarUrl,
      candidate: updatedCandidate.toJSON()
    };
  }

  /**
   * Delete avatar
   */
  static async deleteAvatar(userId, userType) {
    if (userType !== 'candidate') {
      throw new Error('Only candidates can delete avatars');
    }

    const candidate = await Candidate.findById(userId);
    
    if (!candidate) {
      throw new Error('Candidate not found');
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

    return updatedCandidate.toJSON();
  }

  /**
   * Get saved jobs
   */
  static async getSavedJobs(candidateId, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const candidate = await Candidate.findById(candidateId)
      .populate({
        path: 'savedJobs',
        match: { status: { $ne: 'archived' } },
        options: {
          sort: { createdAt: -1 },
          skip: skip,
          limit: limit
        }
      });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const totalSavedJobs = candidate.savedJobs?.length || 0;
    const totalPages = Math.ceil(totalSavedJobs / limit);

    return {
      jobs: candidate.savedJobs || [],
      pagination: {
        current: page,
        pages: totalPages,
        total: totalSavedJobs,
        limit: limit
      }
    };
  }

  /**
   * Save a job
   */
  static async saveJob(candidateId, jobId) {
    // Validate job exists and is published
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    if (!job.isPublished || job.status !== 'published') {
      throw new Error('Job is not available for saving');
    }

    // Add job to saved jobs
    const candidate = await Candidate.findById(candidateId);
    await candidate.addSavedJob(jobId);

    return true;
  }

  /**
   * Unsave a job
   */
  static async unsaveJob(candidateId, jobId) {
    const candidate = await Candidate.findById(candidateId);
    await candidate.removeSavedJob(jobId);

    return true;
  }

  /**
   * Check if job is saved
   */
  static async checkJobSaved(candidateId, jobId) {
    const candidate = await Candidate.findById(candidateId);
    const isSaved = candidate.savedJobs.includes(jobId);

    return { isSaved };
  }
}

module.exports = ProfileService;
