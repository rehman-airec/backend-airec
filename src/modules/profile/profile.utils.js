const { Candidate } = require('../auth/auth.model');

/**
 * Profile Utility Functions
 * Helper functions for profile module
 */
class ProfileUtils {
  /**
   * Check email availability
   */
  static async checkEmailAvailability(email, excludeUserId) {
    const existingCandidate = await Candidate.findOne({ 
      email, 
      _id: { $ne: excludeUserId } 
    });
    
    if (existingCandidate) {
      throw new Error('Email already in use by another candidate');
    }
  }

  /**
   * Prepare update data for candidate
   */
  static prepareUpdateData(body) {
    const { firstName, lastName, email, phone, totalExperience, linkedinUrl, profile } = body;
    
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
    
    return updateData;
  }

  /**
   * Calculate profile completion percentage
   */
  static calculateProfileCompletion(candidate) {
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
  }
}

module.exports = ProfileUtils;
