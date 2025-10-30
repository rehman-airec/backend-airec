const mongoose = require('mongoose');

const screeningAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: {
    type: String,
    required: true
  }
});

const noteSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const guestApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  // Guest candidate information
  candidateInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    totalExperience: {
      type: Number,
      required: true,
      min: 0
    },
    linkedinUrl: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['New', 'In Review', 'Interview', 'Offer', 'Hired', 'Rejected'],
    default: 'New'
  },
  resumePath: {
    type: String,
    required: [true, 'Resume is required']
  },
  resumeFilename: {
    type: String,
    required: true
  },
  // Parsed CV data for enhanced search and matching
  parsedCVData: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    linkedinUrl: String,
    totalExperience: Number,
    skills: [String],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startYear: Number,
      endYear: Number,
      isCurrent: Boolean
    }],
    experience: [{
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      isCurrent: Boolean,
      description: String
    }],
    summary: String,
    languages: [String],
    certifications: [String]
  },
  screeningAnswers: [screeningAnswerSchema],
  notes: [noteSchema],
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  source: {
    type: String,
    enum: ['company_website', 'linkedin', 'indeed', 'other'],
    default: 'company_website'
  },
  // Track if guest converted to registered user
  convertedToUser: {
    type: Boolean,
    default: false
  },
  convertedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  },
  convertedAt: {
    type: Date
  },
  // Unique token for guest application tracking
  trackingToken: {
    type: String,
    required: false, // Will be generated in pre-save
    unique: true
  }
}, {
  timestamps: true
});

// Methods
guestApplicationSchema.methods.updateStatus = function(newStatus, adminId, note = null) {
  this.status = newStatus;
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  
  if (note) {
    this.notes.push({
      adminId: adminId,
      text: note
    });
  }
  
  return this.save();
};

guestApplicationSchema.methods.addNote = function(adminId, note) {
  this.notes.push({
    adminId: adminId,
    text: note
  });
  return this.save();
};

guestApplicationSchema.methods.updatePriority = function(priority) {
  this.priority = priority;
  return this.save();
};

guestApplicationSchema.methods.convertToUser = function(candidateId) {
  this.convertedToUser = true;
  this.convertedUserId = candidateId;
  this.convertedAt = new Date();
  return this.save();
};

// Virtual for days since application
guestApplicationSchema.virtual('daysSinceApplication').get(function() {
  return Math.floor((new Date() - this.appliedAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate tracking token (fallback in case not set explicitly)
guestApplicationSchema.pre('save', function(next) {
  if (this.isNew && !this.trackingToken) {
    const crypto = require('crypto');
    // Generate unique tracking token
    this.trackingToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Compound index for efficient queries
guestApplicationSchema.index({ jobId: 1, 'candidateInfo.email': 1 }, { unique: true });
guestApplicationSchema.index({ 'candidateInfo.email': 1 });
guestApplicationSchema.index({ status: 1 });
guestApplicationSchema.index({ appliedAt: -1 });
guestApplicationSchema.index({ reviewedBy: 1 });
guestApplicationSchema.index({ priority: 1 });
guestApplicationSchema.index({ source: 1 });
guestApplicationSchema.index({ trackingToken: 1 }, { unique: true });
guestApplicationSchema.index({ convertedToUser: 1 });

module.exports = mongoose.model('GuestApplication', guestApplicationSchema);
