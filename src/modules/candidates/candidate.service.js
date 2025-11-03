const { Candidate } = require('../auth/auth.model');
const cvParsingService = require('../../services/cvParsingService');

class CandidateService {
  /**
   * Generate a secure temporary password
   */
  static _generateTemporaryPassword() {
    // Generate a secure random password (16 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static async addSingleCandidate({ body, resume, coverLetter, adminId }) {
    const {
      firstName,
      lastName,
      email,
      phone,
      positionTitle,
      experience,
      linkedinUrl,
    } = body;

    // Parse resume if provided
    let parsedCVData = null;
    if (resume?.path) {
      try {
        const parseResult = await cvParsingService.parseResume(resume.path, resume.filename);
        if (parseResult.success) {
          parsedCVData = parseResult.data;
        } else {
          console.log('CV parsing failed:', parseResult.error);
        }
      } catch (error) {
        console.error('CV parsing error:', error);
        // Continue without parsed data - don't fail candidate creation
      }
    }

    // Check existing candidate by email
    const existing = await Candidate.findOne({ email: (email || '').toLowerCase() });
    if (existing) {
      throw new Error('Candidate with this email already exists');
    }

    // Generate a temporary password (required by schema)
    // Candidate will need to reset password via password reset flow
    const tempPassword = CandidateService._generateTemporaryPassword();
    
    // Create candidate with temporary password
    const candidate = await Candidate.create({
      firstName: firstName || parsedCVData?.firstName || '',
      lastName: lastName || parsedCVData?.lastName || '',
      email: (email || parsedCVData?.email || '').toLowerCase(),
      phone: phone || parsedCVData?.phone || '',
      password: tempPassword, // Temporary password - will be reset
      totalExperience: experience ? Number(experience) : (parsedCVData?.totalExperience || 0),
      linkedinUrl: linkedinUrl || parsedCVData?.linkedinUrl || '',
      createdBy: adminId, // Track who created this candidate
      profile: {
        bio: parsedCVData?.summary || '',
        skills: parsedCVData?.skills || [],
      }
    });

    // Generate password reset token so candidate can set their own password
    const resetToken = candidate.generatePasswordReset();
    await candidate.save({ validateBeforeSave: false });

    return {
      id: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
    };
  }

  static async addBulkCandidates({ body, files, adminId }) {
    // Expect body.candidates as JSON string or object array
    let candidates = body.candidates;
    if (typeof candidates === 'string') {
      try { candidates = JSON.parse(candidates); } catch { candidates = []; }
    }
    if (!Array.isArray(candidates)) candidates = [];

    // Map files by fieldname e.g., resume_0, coverLetter_0
    const filesByField = {};
    for (const f of files) {
      filesByField[f.fieldname] = f;
    }

    const results = [];
    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i] || {};
      const resume = filesByField[`resume_${i}`];
      const coverLetter = filesByField[`coverLetter_${i}`];
      try {
        const created = await CandidateService.addSingleCandidate({ body: entry, resume, coverLetter, adminId });
        results.push({ index: i, success: true, candidate: created });
      } catch (err) {
        results.push({ index: i, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    return { total: results.length, successCount, failureCount, results };
  }

  /**
   * Get all candidates for admin (with tenant filtering)
   * 
   * @param {String} tenantId - Tenant ID (optional, for multi-tenant support)
   * @param {Object} pagination - Pagination options { page, limit }
   * @param {Object} filters - Filter options { search, role }
   * @returns {Object} Candidates list with pagination
   */
  static async getCandidates(tenantId = null, pagination = {}, filters = {}) {
    const { page = 1, limit = 10 } = pagination;
    const { search, role } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    
    // Filter by tenant if provided
    if (tenantId) {
      query.tenantId = tenantId;
    }

    // Filter by role (default to 'candidate' if not specified)
    query.role = role || 'candidate';

    // Search filter (name or email)
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get candidates (exclude password fields)
    const candidates = await Candidate.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate createdBy if there are candidates
    if (candidates.length > 0) {
      await Candidate.populate(candidates, {
        path: 'createdBy',
        select: 'name email',
        model: 'Admin'
      });
    }

    const total = await Candidate.countDocuments(query);

    return {
      candidates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Get candidate by ID
   * 
   * @param {String} candidateId - Candidate ID
   * @returns {Object} Candidate document
   */
  static async getCandidateById(candidateId) {
    const candidate = await Candidate.findById(candidateId)
      .select('-password -passwordResetToken -passwordResetExpires')
      .lean();

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return candidate;
  }

  /**
   * Update candidate
   * 
   * @param {String} candidateId - Candidate ID
   * @param {Object} updateData - Data to update
   * @param {Object} files - Uploaded files (resume, coverLetter)
   * @returns {Object} Updated candidate
   */
  static async updateCandidate(candidateId, updateData, files = {}) {
    const {
      firstName,
      lastName,
      email,
      phone,
      experience,
      linkedinUrl,
    } = updateData;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== candidate.email.toLowerCase()) {
      const existing = await Candidate.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: candidateId }
      });
      if (existing) {
        throw new Error('Candidate with this email already exists');
      }
    }

    // Parse new resume if provided
    let parsedCVData = null;
    if (files.resume?.[0]?.path) {
      try {
        const parseResult = await cvParsingService.parseResume(
          files.resume[0].path,
          files.resume[0].filename
        );
        if (parseResult.success) {
          parsedCVData = parseResult.data;
        }
      } catch (error) {
        console.error('CV parsing error:', error);
      }
    }

    // Update fields
    if (firstName !== undefined) candidate.firstName = firstName;
    if (lastName !== undefined) candidate.lastName = lastName;
    if (email !== undefined) candidate.email = email.toLowerCase();
    if (phone !== undefined) candidate.phone = phone;
    if (experience !== undefined) candidate.totalExperience = Number(experience);
    if (linkedinUrl !== undefined) candidate.linkedinUrl = linkedinUrl;

    // Update from parsed CV data if available
    if (parsedCVData) {
      if (parsedCVData.firstName) candidate.firstName = parsedCVData.firstName;
      if (parsedCVData.lastName) candidate.lastName = parsedCVData.lastName;
      if (parsedCVData.email && !email) candidate.email = parsedCVData.email.toLowerCase();
      if (parsedCVData.phone && !phone) candidate.phone = parsedCVData.phone;
      if (parsedCVData.totalExperience !== undefined && experience === undefined) {
        candidate.totalExperience = parsedCVData.totalExperience;
      }
      if (parsedCVData.linkedinUrl && !linkedinUrl) candidate.linkedinUrl = parsedCVData.linkedinUrl;
      
      if (parsedCVData.summary) {
        candidate.profile = candidate.profile || {};
        candidate.profile.bio = parsedCVData.summary;
      }
      if (parsedCVData.skills) {
        candidate.profile = candidate.profile || {};
        candidate.profile.skills = parsedCVData.skills;
      }
    }

    await candidate.save();

    // Return updated candidate without sensitive fields
    const updated = candidate.toObject();
    delete updated.password;
    delete updated.passwordResetToken;
    delete updated.passwordResetExpires;

    return updated;
  }

  /**
   * Delete candidate
   * 
   * @param {String} candidateId - Candidate ID
   * @returns {Boolean} Success status
   */
  static async deleteCandidate(candidateId) {
    const candidate = await Candidate.findByIdAndDelete(candidateId);
    
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    return true;
  }
}

module.exports = CandidateService;


