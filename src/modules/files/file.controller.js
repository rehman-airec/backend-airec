const fs = require('fs');
const FileService = require('./file.service');
const FileUtils = require('./file.utils');

/**
 * File Controller
 * Handles HTTP requests and delegates business logic to FileService
 */

// Upload resume
const uploadResume = async (req, res) => {
  try {
    const result = await FileService.uploadResume(req.file);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: result
    });
  } catch (error) {
    const statusCode = error.message.includes('uploaded') || 
                      error.message.includes('exceeds') || 
                      error.message.includes('allowed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Serve PDF file
const servePDF = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const result = await FileService.servePDF(filename, req.user, req.userType);

    // Set appropriate headers for PDF
    Object.entries(FileUtils.getPDFHeaders(result.fileSize, result.downloadFilename))
      .forEach(([key, value]) => {
        res.setHeader(key, value);
      });

    // Stream the file
    const fileStream = fs.createReadStream(result.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error reading file'
        });
      }
    });

  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('authorized') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error',
      error: error.message
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    await FileService.deleteFile(filename, req.userType);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('authorized') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Get file info
const getFileInfo = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const fileInfo = await FileService.getFileInfo(filename, req.user, req.userType);

    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('authorized') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// List files for admin
const listFiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, jobId } = req.query;

    const result = await FileService.listFiles(
      { page, limit, jobId },
      { page, limit }
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  uploadResume,
  servePDF,
  deleteFile,
  getFileInfo,
  listFiles
};