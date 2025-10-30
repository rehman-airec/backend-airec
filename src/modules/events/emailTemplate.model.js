const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    unique: true,
    index: true
  },
  body: {
    type: String,
    required: [true, 'Email body is required']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['event', 'interview', 'general'],
    default: 'event'
  },
  variables: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes
emailTemplateSchema.index({ category: 1, isActive: 1 });
emailTemplateSchema.index({ subject: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);

