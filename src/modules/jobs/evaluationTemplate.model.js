const mongoose = require('mongoose');

const evaluationCriteriaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    min: 0,
    max: 100,
    default: 1
  },
  ratingScale: {
    type: String,
    enum: ['1-5', '1-10', 'poor-excellent', 'custom'],
    default: '1-5'
  },
  required: {
    type: Boolean,
    default: true
  }
});

const evaluationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['technical', 'hr', 'behavioral', 'coding', 'design', 'managerial', 'general'],
    default: 'general'
  },
  // Evaluation criteria/questions
  criteria: {
    type: [evaluationCriteriaSchema],
    default: []
  },
  // Overall rating settings
  overallRatingScale: {
    type: String,
    enum: ['1-5', '1-10', 'poor-excellent'],
    default: '1-5'
  },
  // Recommendation options
  recommendationOptions: {
    type: [String],
    default: ['hire', 'maybe', 'no_hire', 'strong_hire']
  },
  // Additional fields that should be included
  includeStrengths: {
    type: Boolean,
    default: true
  },
  includeAreasOfInterest: {
    type: Boolean,
    default: true
  },
  includeAdditionalNotes: {
    type: Boolean,
    default: true
  },
  // Default interview type for this template
  defaultInterviewType: {
    type: String,
    enum: ['phone', 'video', 'in_person', 'technical', 'hr', 'final'],
    default: 'video'
  },
  // Who created this template
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  // Usage statistics
  usageCount: {
    type: Number,
    default: 0
  },
  // Is this a default/system template
  isDefault: {
    type: Boolean,
    default: false
  },
  // Is template active
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
evaluationTemplateSchema.index({ category: 1 });
evaluationTemplateSchema.index({ createdBy: 1 });
evaluationTemplateSchema.index({ isActive: 1 });
evaluationTemplateSchema.index({ name: 'text' });

// Method to increment usage count
evaluationTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model('EvaluationTemplate', evaluationTemplateSchema);

