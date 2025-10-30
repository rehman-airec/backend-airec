const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['superadmin', 'recruiter'],
    default: 'recruiter'
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
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

adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

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

module.exports = {
  Admin: mongoose.models.Admin || mongoose.model('Admin', adminSchema),
  Candidate: mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema)
};

