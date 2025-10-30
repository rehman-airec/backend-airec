const mongoose = require('mongoose');

const screeningQuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'multiple-choice', 'yes-no', 'rating'],
    default: 'text'
  },
  required: {
    type: Boolean,
    default: true
  },
  options: [String],
  maxLength: Number,
  placeholder: String,
  correctAnswer: {
    type: String,
    required: false
  }
});

const screeningTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [screeningQuestionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for efficient queries
screeningTemplateSchema.index({ createdBy: 1 });
screeningTemplateSchema.index({ isDefault: 1 });
screeningTemplateSchema.index({ tags: 1 });
screeningTemplateSchema.index({ usageCount: -1 });

// Method to increment usage count
screeningTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model('ScreeningTemplate', screeningTemplateSchema);

