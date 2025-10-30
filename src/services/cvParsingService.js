const pdfParse = require('pdf-parse');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_FORMATS = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_TEXT_LENGTH = 10;

// ============================================================================
// CONFIGURATION
// ============================================================================

class CVParsingService {
  constructor() {
    this.supportedFormats = SUPPORTED_FORMATS;
    this.maxFileSize = MAX_FILE_SIZE;
    this.pdfExtract = new PDFExtract();
  }

  /**
   * Main entry point for CV parsing
   */
  async parseResume(filePath, originalFilename) {
    try {
      console.log(`[CV Parser] Starting: ${originalFilename}`);
      
      // Step 1: Validate file
      await this._validateFile(filePath, originalFilename);

      // Step 2: Extract text
      const textContent = await this._extractText(filePath, originalFilename);
      
      if (!textContent || textContent.trim().length === 0) {
        console.warn(`[CV Parser] No text found in: ${originalFilename}`);
        return this._createSuccessResponse(this._getEmptyData(), '', 
          'Document parsed but no text content found');
      }

      // Step 3: Parse into structured data
      const structuredData = this._parseFields(textContent);

      // Step 4: Clean and validate
      const cleanedData = this._cleanData(structuredData);

      console.log(`[CV Parser] Success: ${originalFilename} (${textContent.length} chars)`);
      
      return this._createSuccessResponse(cleanedData, textContent, 'CV parsed successfully');

    } catch (error) {
      console.error('[CV Parser] Error:', error.message);
      return this._createErrorResponse(error.message);
    }
  }

  getParsingStats() {
    return {
      supportedFormats: this.supportedFormats,
      maxFileSize: this.maxFileSize,
      serviceStatus: 'active',
      parserVersion: '3.0.0',
      strategies: ['pdf-parse', 'pdf.js-extract']
    };
  }

  // ==========================================================================
  // FILE VALIDATION
  // ==========================================================================

  async validateFile(filePath, filename) {
    await this._validateFile(filePath, filename);
  }

  async _validateFile(filePath, filename) {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.size > this.maxFileSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    const ext = path.extname(filename).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  // ==========================================================================
  // TEXT EXTRACTION
  // ==========================================================================

  async _extractText(filePath, filename) {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        return await this._extractFromPDF(filePath);
      case '.docx':
        return await this._extractFromDocx(filePath);
      case '.doc':
        return await this._extractFromDoc(filePath);
      case '.txt':
        return await this._extractFromTxt(filePath);
      default:
        throw new Error(`Unsupported format: ${ext}`);
    }
  }

  async _extractFromPDF(filePath) {
    console.log('[PDF] Attempting extraction...');
    
    // Try pdf-parse first (fastest)
    const text1 = await this._tryPdfParse(filePath);
    if (text1 && text1.length >= MIN_TEXT_LENGTH) {
      console.log('[PDF] Success with pdf-parse');
      return text1;
    }

    // Fallback to pdf.js-extract
    const text2 = await this._tryPdfJSExtract(filePath);
    if (text2 && text2.length >= MIN_TEXT_LENGTH) {
      console.log('[PDF] Success with pdf.js-extract');
      return text2;
    }

    // Both failed
    throw new Error('All PDF extraction strategies failed. The PDF might be corrupted or image-based.');
  }

  async _tryPdfParse(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      if (!buffer || buffer.length === 0) {
        throw new Error('Empty file');
      }

      const options = { normalizeWhitespace: false };
      const data = await pdfParse(buffer, options);

      if (data?.text?.trim().length >= MIN_TEXT_LENGTH) {
        return data.text.trim();
      }

      // Fallback without options
      const data2 = await pdfParse(buffer);
      return data2?.text?.trim() || '';
    } catch (error) {
      console.warn('[PDF] pdf-parse failed:', error.message);
      return '';
    }
  }

  async _tryPdfJSExtract(filePath) {
    return new Promise((resolve, reject) => {
      const options = { normalizeWhitespace: false };
      
      this.pdfExtract.extract(filePath, options, (err, data) => {
        if (err) {
          console.warn('[PDF] pdf.js-extract failed:', err.message);
          resolve('');
          return;
        }

        try {
          const text = this._extractTextFromPdfJSData(data);
          resolve(text);
        } catch (error) {
          console.warn('[PDF] Error processing pdf.js-extract data:', error.message);
          resolve('');
        }
      });
    });
  }

  _extractTextFromPdfJSData(data) {
    if (!data?.pages || !Array.isArray(data.pages)) {
      return '';
    }

    const textChunks = data.pages
      .map(page => {
        if (!page.texts || !Array.isArray(page.texts)) {
          return '';
        }

        const sorted = page.texts.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 10) return a.x - b.x;
          return b.y - a.y;
        });

        return sorted.map(item => item.str).join(' ');
      })
      .filter(chunk => chunk.trim().length > 0);

    return textChunks.join('\n\n');
  }

  async _extractFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result?.value?.trim() || '';
      
      if (!text) {
        throw new Error('No text content extracted');
      }
      
      return text;
    } catch (error) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  async _extractFromDoc(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      
      if (!text) {
        throw new Error('No text content extracted');
      }
      
      return text;
    } catch (error) {
      throw new Error(`Failed to parse DOC: ${error.message}`);
    }
  }

  async _extractFromTxt(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      
      if (!text) {
        throw new Error('No text content extracted');
      }
      
      return text;
    } catch (error) {
      throw new Error(`Failed to parse TXT: ${error.message}`);
    }
  }

  // ==========================================================================
  // FIELD EXTRACTION
  // ==========================================================================

  _parseFields(text) {
    const lines = this._splitIntoLines(text);
    const cleanedText = text.replace(/\s+/g, ' ').trim();

    console.log(`[Parser] Processing ${lines.length} lines, ${cleanedText.length} chars`);

    return {
      firstName: this._extractFirstName(lines, cleanedText),
      lastName: this._extractLastName(lines, cleanedText),
      email: this._extractEmail(cleanedText),
      phone: this._extractPhone(cleanedText),
      linkedinUrl: this._extractLinkedIn(cleanedText),
      totalExperience: this._extractExperience(lines, cleanedText),
      skills: this._extractSkills(lines, cleanedText),
      education: this._extractEducation(lines),
      experience: this._extractWorkExperience(lines),
      summary: this._extractSummary(lines, cleanedText),
      languages: this._extractLanguages(lines),
      certifications: this._extractCertifications(lines)
    };
  }

  _splitIntoLines(text) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  // ==========================================================================
  // PERSONAL INFORMATION
  // ==========================================================================

  _extractFirstName(lines, text) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (this._isContactLine(line)) continue;

      const words = line.split(/\s+/);
      if (words.length >= 2 && this._isValidName(words[0])) {
        return words[0];
      }
    }
    
    return this._findFirstCapitalizedWord(text);
  }

  _extractLastName(lines, text) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (this._isContactLine(line)) continue;

      const words = line.split(/\s+/);
      if (words.length >= 2) {
        return words.slice(1, 3).join(' ');
      }
    }
    
    return '';
  }

  _extractEmail(text) {
    const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return match ? match[0].toLowerCase() : '';
  }

  _extractPhone(text) {
    const patterns = [
      /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].replace(/[\s\-\(\)\.]/g, '');
      }
    }
    
    return '';
  }

  _extractLinkedIn(text) {
    const match = text.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/);
    return match ? match[0] : '';
  }

  // ==========================================================================
  // PROFESSIONAL INFORMATION
  // ==========================================================================

  _extractExperience(lines, text) {
    const keywords = ['experience', 'years', 'yr', 'yrs', 'exp'];
    let years = 0;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        const match = line.match(/(\d+)\s*(?:year|yr|yrs?|experience)/i);
        if (match) {
          years = Math.max(years, parseInt(match[1]));
        }
      }
    }

    if (years === 0) {
      const match = text.match(/(\d+)\s*(?:year|yr|yrs?|experience)/i);
      if (match) years = parseInt(match[1]);
    }

    return years;
  }

  _extractWorkExperience(lines) {
    const experience = [];
    const keywords = ['experience', 'employment', 'work history', 'career'];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const line = lines[j];
          if (line.length > 10 && line.length < 200) {
            experience.push({
              company: line,
              position: '',
              startDate: '',
              endDate: '',
              isCurrent: false,
              description: ''
            });
          }
        }
        break;
      }
    }

    return experience.slice(0, 10);
  }

  _extractSkills(lines, text) {
    const skills = [];
    const keywords = ['skills', 'technical skills', 'technologies', 'tools', 'programming'];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const parts = lines[j].split(/[,;•\-\n]/);
          skills.push(...parts.map(s => s.trim()).filter(s => s.length > 0));
        }
        break;
      }
    }

    if (skills.length === 0) {
      const match = text.match(/(?:skills?|technologies?)[:\s]+([^.]{10,200})/i);
      if (match) {
        const parts = match[1].split(/[,;•\-\n]/);
        skills.push(...parts.map(s => s.trim()).filter(s => s.length > 0));
      }
    }

    return skills.slice(0, 20);
  }

  _extractEducation(lines) {
    const education = [];
    const keywords = ['education', 'university', 'college', 'degree', 'bachelor', 'master', 'phd'];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const line = lines[j];
          if (line.length > 10 && line.length < 100) {
            education.push({
              institution: line,
              degree: '',
              field: '',
              startYear: null,
              endYear: null,
              isCurrent: false
            });
          }
        }
        break;
      }
    }

    return education.slice(0, 5);
  }

  _extractSummary(lines, text) {
    const keywords = ['summary', 'objective', 'profile', 'about', 'overview'];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (keywords.some(k => lower.includes(k))) {
        let summary = '';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].length > 20) {
            summary += lines[j] + ' ';
          }
        }
        return summary.trim();
      }
    }

    return '';
  }

  _extractLanguages(lines) {
    const languages = [];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('language')) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const parts = lines[j].split(/[,;•\-\n]/);
          languages.push(...parts.map(l => l.trim()).filter(l => l.length > 0));
        }
        break;
      }
    }

    return languages.slice(0, 10);
  }

  _extractCertifications(lines) {
    const certs = [];

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (['certification', 'certificate', 'certified', 'license'].some(k => lower.includes(k))) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].length > 5) {
            certs.push(lines[j].trim());
          }
        }
        break;
      }
    }

    return certs.slice(0, 10);
  }

  // ==========================================================================
  // DATA CLEANING
  // ==========================================================================

  _cleanData(data) {
    const cleaned = { ...data };

    // Clean text fields
    if (cleaned.firstName) cleaned.firstName = this._cleanText(cleaned.firstName);
    if (cleaned.lastName) cleaned.lastName = this._cleanText(cleaned.lastName);
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
      if (!this._isValidEmail(cleaned.email)) {
        cleaned.email = '';
      }
    }
    if (cleaned.summary) cleaned.summary = this._cleanText(cleaned.summary);

    // Clean phone
    if (cleaned.phone) {
      cleaned.phone = cleaned.phone.replace(/[^\d+]/g, '');
    }

    // Clean arrays
    cleaned.skills = (cleaned.skills || []).filter(s => s.length > 0 && s.length < 100);
    cleaned.education = (cleaned.education || []).filter(e => e.institution?.length > 0);
    cleaned.experience = (cleaned.experience || []).filter(e => e.company?.length > 0);
    cleaned.languages = (cleaned.languages || []).filter(l => l.length > 0);
    cleaned.certifications = (cleaned.certifications || []).filter(c => c.length > 0);

    return cleaned;
  }

  _cleanText(text) {
    return text.trim().replace(/\s+/g, ' ');
  }

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  _isContactLine(line) {
    const lower = line.toLowerCase();
    return lower.includes('resume') ||
           lower.includes('cv') ||
           line.includes('@') ||
           lower.includes('phone') ||
           lower.includes('email') ||
           lower.includes('linkedin');
  }

  _isValidName(word) {
    return word.length > 1 && /^[A-Za-z]+$/.test(word);
  }

  _findFirstCapitalizedWord(text) {
    const words = text.split(/\s+/);
    for (const word of words.slice(0, 3)) {
      if (this._isValidName(word) && /^[A-Z]/.test(word)) {
        return word;
      }
    }
    return '';
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _getEmptyData() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      totalExperience: 0,
      skills: [],
      education: [],
      experience: [],
      summary: '',
      languages: [],
      certifications: []
    };
  }

  _createSuccessResponse(data, rawText, message) {
    return {
      success: true,
      message,
      data,
      rawText: rawText || undefined
    };
  }

  _createErrorResponse(error) {
    return {
      success: false,
      message: 'Failed to parse CV',
      error,
      data: null
    };
  }
}

module.exports = new CVParsingService();