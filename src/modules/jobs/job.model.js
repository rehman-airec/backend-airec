const mongoose = require('mongoose');

const screeningQuestionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    required: false
  },
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

const hiringTeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  }
});

const salaryRangeSchema = new mongoose.Schema({
  min: Number,
  max: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  hideFromCandidates: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['Fixed', 'Variable', 'Commission', 'Hourly'],
    default: 'Fixed'
  },
  period: {
    type: String,
    enum: ['Yearly', 'Monthly', 'Weekly', 'Hourly'],
    default: 'Yearly'
  }
});

const locationSchema = new mongoose.Schema({
  city: String,
  country: String,
  remote: {
    type: Boolean,
    default: false
  },
  alternateLocations: [{
    city: String,
    country: String
  }]
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [3, 'Job title must be at least 3 characters'],
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  jobFunctions: {
    type: [String],
    default: []
  },
  location: {
    type: locationSchema,
    required: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [50, 'Department cannot exceed 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    minlength: [50, 'Job description must be at least 50 characters'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  experienceRequiredYears: {
    type: String,
    default: '0-1'
  },
  toolsTechnologies: {
    type: [String],
    default: []
  },
  educationCertifications: {
    type: [String],
    default: []
  },
  responsibilities: [{
    type: String,
    trim: true,
    maxlength: [1000, 'Responsibility cannot exceed 1000 characters']
  }],
  requirements: [{
    type: String,
    trim: true,
    maxlength: [1000, 'Requirement cannot exceed 1000 characters']
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters']
  }],
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  workplaceTypes: {
    type: [String],
    enum: ['Remote', 'On-site', 'Hybrid'],
    default: []
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Volunteer'],
    default: 'Full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['Entry', 'Mid', 'Senior', 'Executive'],
    default: 'Mid'
  },
  salaryRange: salaryRangeSchema,
  salaryBudget: {
    min: Number,
    max: Number,
    currency: String
  },
  leaderboard: {
    type: Boolean,
    default: false
  },
  positions: {
    type: Number,
    default: 1,
    min: [1, 'Positions must be at least 1']
  },
  interviewQuestions: {
    type: [String],
    default: []
  },
  hiringManager: {
    name: String,
    email: String,
    phone: String
  },
  assignProjectClient: String,
  screeningQuestions: [screeningQuestionSchema],
  hiringTeam: [hiringTeamSchema],
  interviewers: [{
    name: String,
    email: String,
    role: String
  }],
  workflow: {
    type: [String],
    default: ['New', 'In Review', 'Interview', 'Offer', 'Hired', 'Rejected']
  },
  evaluationTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationTemplate',
    required: false
  },
  publishedOn: [String],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  applicationDeadline: {
    type: Date
  },
  maxApplications: {
    type: Number,
    min: [1, 'Maximum applications must be at least 1'],
    default: 1000
  },
  currentApplications: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  // Multi-tenant support: tenantId links job to a specific tenant
  // Optional to maintain backward compatibility with existing single-tenant data
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    required: false // Optional for backward compatibility
  }
}, {
  timestamps: true
});

// Methods
jobSchema.methods.publish = function(jobBoards = []) {
  this.isPublished = true;
  this.status = 'published';
  this.publishedAt = new Date();
  this.publishedOn = jobBoards;
  return this.save();
};

jobSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

jobSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

jobSchema.methods.incrementApplications = function() {
  this.currentApplications += 1;
  return this.save();
};

jobSchema.methods.decrementApplications = function() {
  if (this.currentApplications > 0) {
    this.currentApplications -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Virtual for application deadline status
jobSchema.virtual('isApplicationDeadlinePassed').get(function() {
  return this.applicationDeadline && new Date() > this.applicationDeadline;
});

// Virtual for application limit reached
jobSchema.virtual('isApplicationLimitReached').get(function() {
  return this.currentApplications >= this.maxApplications;
});

// Index for search functionality
jobSchema.index({ title: 'text', description: 'text', department: 'text' });
jobSchema.index({ 'location.city': 1 });
jobSchema.index({ department: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ isPublished: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdBy: 1 });
jobSchema.index({ publishedAt: -1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ tenantId: 1 }); // Multi-tenant index for efficient tenant-based queries
jobSchema.index({ tenantId: 1, createdAt: -1 }); // Composite index for tenant jobs sorted by creation date
jobSchema.index({ tenantId: 1, isPublished: 1, status: 1 }); // Composite index for tenant published jobs

module.exports = mongoose.model('Job', jobSchema);

