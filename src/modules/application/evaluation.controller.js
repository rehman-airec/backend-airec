const { validationResult } = require('express-validator');
const Evaluation = require('./evaluation.model');
const Application = require('./application.model');

/**
 * Evaluation Controller
 * Handles HTTP requests for evaluation management
 */

// Create a new evaluation
const createEvaluation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const {
      overallRating,
      recommendation,
      strengths,
      areasOfInterest,
      additionalNotes,
      detailedRatings,
      interviewType,
      duration,
      isFinal,
      isConfidential
    } = req.body;

    // Validate that the application exists
    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if evaluator has already evaluated this application
    const existingEvaluation = await Evaluation.findOne({
      applicationId: req.params.applicationId,
      evaluatorId: req.user._id
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: 'You have already evaluated this application'
      });
    }

    // Create the evaluation
    const evaluation = new Evaluation({
      applicationId: req.params.applicationId,
      evaluatorId: req.user._id,
      overallRating,
      recommendation,
      strengths,
      areasOfInterest,
      additionalNotes,
      detailedRatings,
      interviewType,
      duration,
      isFinal,
      isConfidential
    });

    await evaluation.save();

    // Add log entry to application
    application.logs.push({
      action: `Evaluation added by ${req.user.firstName} ${req.user.lastName}`,
      userId: req.user._id,
      userRole: 'Admin',
      metadata: {
        evaluationId: evaluation._id,
        overallRating,
        recommendation,
        isFinal
      }
    });
    await application.save();

    res.status(201).json({
      success: true,
      message: 'Evaluation added successfully',
      evaluation
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get evaluations for an application
const getApplicationEvaluations = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { evaluatorId, isFinal } = req.query;

    let query = { applicationId };

    if (evaluatorId) {
      query.evaluatorId = evaluatorId;
    }

    if (isFinal !== undefined) {
      query.isFinal = isFinal === 'true';
    }

    const evaluations = await Evaluation.find(query)
      .populate('evaluatorId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      evaluations
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get evaluation by ID
const getEvaluationById = async (req, res) => {
  try {
    const { evaluationId } = req.params;

    const evaluation = await Evaluation.findById(evaluationId)
      .populate('evaluatorId', 'firstName lastName email')
      .populate('applicationId', 'candidateSnapshot job');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      evaluation
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update evaluation
const updateEvaluation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { evaluationId } = req.params;
    const updateData = req.body;

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if user can update this evaluation
    if (evaluation.evaluatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own evaluations'
      });
    }

    // Store edit history before updating
    if (!evaluation.editHistory) {
      evaluation.editHistory = [];
    }
    
    evaluation.editHistory.push({
      data: {
        overallRating: evaluation.overallRating,
        recommendation: evaluation.recommendation,
        strengths: evaluation.strengths,
        areasOfInterest: evaluation.areasOfInterest,
        additionalNotes: evaluation.additionalNotes,
        detailedRatings: evaluation.detailedRatings,
        interviewType: evaluation.interviewType,
        duration: evaluation.duration
      },
      editedAt: evaluation.editedAt || evaluation.createdAt,
      editedBy: evaluation.editedBy || evaluation.evaluatorId
    });

    // Update evaluation with new data and edit tracking
    updateData.editedAt = new Date();
    updateData.editedBy = req.user._id;

    const updatedEvaluation = await Evaluation.findByIdAndUpdate(
      evaluationId,
      updateData,
      { new: true, runValidators: true }
    ).populate('editedBy', 'name email').populate('evaluatorId', 'name email');

    // Add log entry to application
    const application = await Application.findById(evaluation.applicationId);
    if (application) {
      application.logs.push({
        action: `Evaluation updated by ${req.user.firstName} ${req.user.lastName}`,
        userId: req.user._id,
        userRole: 'Admin',
        metadata: {
          evaluationId: updatedEvaluation._id,
          changes: updateData
        }
      });
      await application.save();
    }

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      evaluation: updatedEvaluation
    });
  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete evaluation
const deleteEvaluation = async (req, res) => {
  try {
    const { evaluationId } = req.params;

    const evaluation = await Evaluation.findById(evaluationId);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if user can delete this evaluation
    if (evaluation.evaluatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own evaluations'
      });
    }

    await Evaluation.findByIdAndDelete(evaluationId);

    // Add log entry to application
    const application = await Application.findById(evaluation.applicationId);
    if (application) {
      application.logs.push({
        action: `Evaluation deleted by ${req.user.firstName} ${req.user.lastName}`,
        userId: req.user._id,
        userRole: 'Admin',
        metadata: {
          evaluationId: evaluation._id,
          overallRating: evaluation.overallRating,
          recommendation: evaluation.recommendation
        }
      });
      await application.save();
    }

    res.json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get evaluation statistics for an application
const getEvaluationStats = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const evaluations = await Evaluation.find({ applicationId });

    if (evaluations.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalEvaluations: 0,
          averageRating: 0,
          recommendations: {},
          detailedRatings: {}
        }
      });
    }

    // Calculate average rating
    const totalRating = evaluations.reduce((sum, eval) => sum + eval.overallRating, 0);
    const averageRating = totalRating / evaluations.length;

    // Count recommendations
    const recommendations = evaluations.reduce((acc, eval) => {
      acc[eval.recommendation] = (acc[eval.recommendation] || 0) + 1;
      return acc;
    }, {});

    // Calculate average detailed ratings
    const detailedRatings = {};
    const ratingKeys = ['technicalSkills', 'communication', 'culturalFit', 'experience', 'problemSolving'];
    
    ratingKeys.forEach(key => {
      const ratings = evaluations
        .map(eval => eval.detailedRatings?.[key])
        .filter(rating => rating !== undefined);
      
      if (ratings.length > 0) {
        detailedRatings[key] = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      }
    });

    res.json({
      success: true,
      stats: {
        totalEvaluations: evaluations.length,
        averageRating: Math.round(averageRating * 10) / 10,
        recommendations,
        detailedRatings
      }
    });
  } catch (error) {
    console.error('Error fetching evaluation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createEvaluation,
  getApplicationEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  getEvaluationStats
};
