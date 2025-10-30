const CVParsingService = require('./cvParsing.service');

/**
 * CV Parsing Controller
 * Handles HTTP requests and delegates business logic to CVParsingService
 */

// Parse uploaded CV
const parseCV = async (req, res) => {
  try {
    const result = await CVParsingService.parseCV(req.file.path, req.file.originalname);
    
    res.json({
      success: true,
      message: 'CV parsed successfully',
      ...result
    });
  } catch (error) {
    const statusCode = error.message.includes('uploaded') || 
                      error.message.includes('not supported') || 
                      error.message.includes('exceeds') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error',
      error: error.message
    });
  }
};

// Get CV parsing statistics
const getParsingStats = async (req, res) => {
  try {
    const stats = CVParsingService.getParsingStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get parsing statistics',
      error: error.message
    });
  }
};

// Validate CV file
const validateCV = async (req, res) => {
  try {
    const result = await CVParsingService.validateCV(
      req.file.path,
      req.file.originalname,
      req.file.size
    );

    res.json({
      success: true,
      message: 'CV file is valid',
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid CV file',
      error: error.message
    });
  }
};

module.exports = {
  parseCV,
  getParsingStats,
  validateCV
};
