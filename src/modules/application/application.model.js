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
  },
  editedAt: {
    type: Date
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  editHistory: [{
    text: String,
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }]
});

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: function() {
      return !this.isGuestApplication;
    }
  },
  // Support for guest applications
  isGuestApplication: {
    type: Boolean,
    default: false
  },
  guestApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestApplication',
    required: function() {
      return this.isGuestApplication;
    }
  },
  status: {
    type: String,
    enum: [
      'New',
      'Selected',
      'In Review',
      'Interview',
      'Offer',
      'Hired',
      'Rejected',
      'Decision Pending',
      'Saved for Future',
      'Out of Budget',
      'Shortlisted'
    ],
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
  candidateSnapshot: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    totalExperience: Number,
    linkedinUrl: String
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
  logs: [{
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'logs.userRole'
    },
    userRole: {
      type: String,
      enum: ['Admin', 'Candidate']
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  }]
}, {
  timestamps: true
});

// Methods
applicationSchema.methods.updateStatus = function(newStatus, adminId, note = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  
  if (note) {
    this.notes.push({
      adminId: adminId,
      text: note
    });
  }

  // Log the status change
  this.logs.push({
    action: `Status changed from ${oldStatus} to ${newStatus}`,
    userId: adminId,
    userRole: 'Admin',
    metadata: {
      oldStatus,
      newStatus,
      note: note || null
    }
  });
  
  return this.save();
};

applicationSchema.methods.addNote = function(adminId, note) {
  this.notes.push({
    adminId: adminId,
    text: note
  });

  // Log the note addition
  this.logs.push({
    action: 'Note added',
    userId: adminId,
    userRole: 'Admin',
    metadata: {
      note: note.substring(0, 100) // Store first 100 chars
    }
  });

  return this.save();
};

applicationSchema.methods.updateNote = function(noteIndex, adminId, newText) {
  if (noteIndex < 0 || noteIndex >= this.notes.length) {
    throw new Error('Invalid note index');
  }

  const note = this.notes[noteIndex];
  
  // Store edit history
  if (!note.editHistory) {
    note.editHistory = [];
  }
  
  note.editHistory.push({
    text: note.text,
    editedAt: note.editedAt || note.timestamp,
    editedBy: note.editedBy || note.adminId
  });

  // Update note
  note.text = newText;
  note.editedAt = new Date();
  note.editedBy = adminId;

  // Log the note update
  this.logs.push({
    action: 'Note updated',
    userId: adminId,
    userRole: 'Admin',
    metadata: {
      noteIndex: noteIndex,
      previousNote: note.editHistory[note.editHistory.length - 1].text.substring(0, 100)
    }
  });

  return this.save();
};

applicationSchema.methods.updatePriority = function(priority) {
  this.priority = priority;
  return this.save();
};

// Virtual for days since application
applicationSchema.virtual('daysSinceApplication').get(function() {
  return Math.floor((new Date() - this.appliedAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to create candidate snapshot and initial log
applicationSchema.pre('save', async function(next) {
  // Only create snapshot if it doesn't exist
  if (this.isNew && !this.candidateSnapshot) {
    if (this.isGuestApplication) {
      // For guest applications, get snapshot from GuestApplication
      const GuestApplication = this.constructor.db.model('GuestApplication');
      const guestApp = await GuestApplication.findById(this.guestApplicationId);
      if (guestApp) {
        this.candidateSnapshot = {
          firstName: guestApp.candidateInfo.firstName,
          lastName: guestApp.candidateInfo.lastName,
          email: guestApp.candidateInfo.email,
          phone: guestApp.candidateInfo.phone,
          totalExperience: guestApp.candidateInfo.totalExperience,
          linkedinUrl: guestApp.candidateInfo.linkedinUrl
        };
      }
    } else {
      // For regular applications, get snapshot from Candidate
      const candidate = await this.constructor.db.model('Candidate').findById(this.candidateId);
      if (candidate) {
        this.candidateSnapshot = {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          totalExperience: candidate.totalExperience,
          linkedinUrl: candidate.linkedinUrl
        };
      }
    }
  }

  // Add initial log entry for application creation if this is a new application and logs array is empty
  if (this.isNew && (!this.logs || this.logs.length === 0)) {
    this.logs = [{
      action: 'Application submitted',
      timestamp: new Date(),
      userId: this.candidateId || this.guestApplicationId,
      userRole: this.isGuestApplication ? 'Guest' : 'Candidate'
    }];
  }
  
  next();
});

// Compound index for efficient queries
applicationSchema.index({ jobId: 1, candidateId: 1 }, { 
  unique: true, 
  partialFilterExpression: { isGuestApplication: false }
});
applicationSchema.index({ jobId: 1, guestApplicationId: 1 }, { 
  unique: true, 
  partialFilterExpression: { isGuestApplication: true }
});
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ guestApplicationId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ reviewedBy: 1 });
applicationSchema.index({ priority: 1 });
applicationSchema.index({ source: 1 });
applicationSchema.index({ isGuestApplication: 1 });

module.exports = mongoose.model('Application', applicationSchema);

