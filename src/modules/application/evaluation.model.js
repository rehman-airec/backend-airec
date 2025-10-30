const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  evaluatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  recommendation: {
    type: String,
    enum: ['hire', 'maybe', 'no_hire', 'strong_hire'],
    required: true
  },
  strengths: {
    type: String,
    required: true,
    trim: true
  },
  areasOfInterest: {
    type: String,
    required: true,
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  },
  // Detailed ratings for different aspects
  detailedRatings: {
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    culturalFit: {
      type: Number,
      min: 1,
      max: 5
    },
    experience: {
      type: Number,
      min: 1,
      max: 5
    },
    problemSolving: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  // Interview-specific fields
  interviewType: {
    type: String,
    enum: ['phone', 'video', 'in_person', 'technical', 'hr', 'final'],
    default: 'video'
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  // Flags for evaluation status
  isFinal: {
    type: Boolean,
    default: false
  },
  isConfidential: {
    type: Boolean,
    default: false
  },
  // Edit tracking
  editedAt: {
    type: Date
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  editHistory: [{
    data: mongoose.Schema.Types.Mixed,
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
evaluationSchema.index({ applicationId: 1 });
evaluationSchema.index({ evaluatorId: 1 });
evaluationSchema.index({ overallRating: 1 });
evaluationSchema.index({ recommendation: 1 });
evaluationSchema.index({ createdAt: -1 });

// Virtual for average detailed rating
evaluationSchema.virtual('averageDetailedRating').get(function() {
  const ratings = this.detailedRatings;
  if (!ratings) return null;
  
  const values = Object.values(ratings).filter(val => val !== undefined);
  if (values.length === 0) return null;
  
  return values.reduce((sum, val) => sum + val, 0) / values.length;
});

// Method to get recommendation text
evaluationSchema.methods.getRecommendationText = function() {
  const recommendationMap = {
    'strong_hire': 'Strong Hire',
    'hire': 'Hire',
    'maybe': 'Maybe',
    'no_hire': 'No Hire'
  };
  return recommendationMap[this.recommendation] || this.recommendation;
};

// Method to get rating text
evaluationSchema.methods.getRatingText = function() {
  const ratingMap = {
    1: 'Poor',
    2: 'Below Average',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };
  return ratingMap[this.overallRating] || this.overallRating.toString();
};

module.exports = mongoose.model('Evaluation', evaluationSchema);
