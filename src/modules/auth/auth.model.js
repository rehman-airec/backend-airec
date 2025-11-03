const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // Multi-tenant support: tenantId links admin to a specific tenant
  // Optional to maintain backward compatibility with existing single-tenant data
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    required: false // Optional for backward compatibility
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'recruiter', 'employee'],
    default: 'recruiter'
  },
  // Track who created this user (for audit trail)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    phone: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    avatar: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [30, 'First name cannot exceed 30 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [30, 'Last name cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // Multi-tenant support: tenantId links candidate to a specific tenant
  // Optional to maintain backward compatibility with existing single-tenant data
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    required: false // Optional for backward compatibility
  },
  // Role for candidates (candidate or employee)
  role: {
    type: String,
    enum: ['candidate', 'employee'],
    default: 'candidate'
  },
  // Track who created this user (for audit trail)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  totalExperience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years'],
    default: 0
  },
  linkedinUrl: {
    type: String,
    trim: true,
    match: [/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/, 'Please enter a valid LinkedIn URL']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  profile: {
    avatar: {
      type: String
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    skills: [{
      type: String,
      trim: true
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startYear: Number,
      endYear: Number,
      isCurrent: { type: Boolean, default: false }
    }],
    experience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      isCurrent: { type: Boolean, default: false },
      description: String
    }]
  }
}, {
  timestamps: true
});

// Admin Methods
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

adminSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

adminSchema.methods.generatePasswordReset = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  return resetToken;
};

adminSchema.methods.clearPasswordReset = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ tenantId: 1 }); // Multi-tenant index for efficient tenant-based queries
adminSchema.index({ tenantId: 1, role: 1 }); // Composite index for tenant + role queries

// Candidate Methods
candidateSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

candidateSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

candidateSchema.methods.toJSON = function() {
  const candidate = this.toObject();
  delete candidate.password;
  return candidate;
};

candidateSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

candidateSchema.methods.generatePasswordReset = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  return resetToken;
};

candidateSchema.methods.clearPasswordReset = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

candidateSchema.methods.addSavedJob = function(jobId) {
  if (!this.savedJobs.includes(jobId)) {
    this.savedJobs.push(jobId);
    return this.save();
  }
  return Promise.resolve(this);
};

candidateSchema.methods.removeSavedJob = function(jobId) {
  this.savedJobs = this.savedJobs.filter(id => id.toString() !== jobId.toString());
  return this.save();
};

candidateSchema.index({ isActive: 1 });
candidateSchema.index({ totalExperience: 1 });
candidateSchema.index({ 'profile.skills': 1 });
candidateSchema.index({ tenantId: 1 }); // Multi-tenant index for efficient tenant-based queries
candidateSchema.index({ tenantId: 1, role: 1 }); // Composite index for tenant + role queries
candidateSchema.index({ tenantId: 1, role: 1, isActive: 1 }); // Composite index for employee queries (tenantId + role + isActive)

module.exports = {
  Admin: mongoose.models.Admin || mongoose.model('Admin', adminSchema),
  Candidate: mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema)
};

