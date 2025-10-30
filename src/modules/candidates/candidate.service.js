const { Candidate } = require('../auth/auth.model');
const cvParsingService = require('../../services/cvParsingService');

class CandidateService {
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
      parsedCVData = await cvParsingService.parseCV(resume.path, resume.filename);
    }

    // Check existing candidate by email
    const existing = await Candidate.findOne({ email: (email || '').toLowerCase() });
    if (existing) {
      throw new Error('Candidate with this email already exists');
    }

    const candidate = await Candidate.create({
      firstName: firstName || parsedCVData?.firstName || '',
      lastName: lastName || parsedCVData?.lastName || '',
      email: (email || parsedCVData?.email || '').toLowerCase(),
      phone: phone || parsedCVData?.phone || '',
      totalExperience: experience ? Number(experience) : (parsedCVData?.totalExperience || 0),
      linkedinUrl: linkedinUrl || parsedCVData?.linkedinUrl || '',
      profile: {
        bio: parsedCVData?.summary || '',
        skills: parsedCVData?.skills || [],
      }
    });

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
        const created = await this.addSingleCandidate({ body: entry, resume, coverLetter, adminId });
        results.push({ index: i, success: true, candidate: created });
      } catch (err) {
        results.push({ index: i, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    return { total: results.length, successCount, failureCount, results };
  }
}

module.exports = CandidateService;


