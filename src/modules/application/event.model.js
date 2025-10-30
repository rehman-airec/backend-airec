const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'attendees.userType',
    required: true
  },
  userType: {
    type: String,
    enum: ['Admin', 'Candidate'],
    required: true
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  name: {
    type: String,
    required: true
  }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  // New structure: specific users as attendees
  attendees: [attendeeSchema],
  // Legacy support: role-based attendees (deprecated but kept for backwards compatibility)
  legacyAttendees: [{
    type: String,
    enum: ['candidate', 'hr_manager', 'hiring_manager', 'interviewer']
  }],
  // Additional emails for external attendees
  additionalEmails: [{
    type: String,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  }],
  // Privacy setting: if true, attendees cannot see full attendee list
  privacyEnabled: {
    type: Boolean,
    default: true
  },
  // Google Calendar event ID (for integration)
  googleCalendarEventId: {
    type: String,
    trim: true
  },
  // Email sending options
  sendEventDetails: {
    type: Boolean,
    default: false
  },
  emailTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },
  candidateEmails: [{
    type: String,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  }],
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
eventSchema.index({ applicationId: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ 'attendees.userId': 1 });
eventSchema.index({ googleCalendarEventId: 1 });

// Virtual for formatted date and time
eventSchema.virtual('formattedDateTime').get(function() {
  const date = new Date(this.date);
  const dateStr = date.toLocaleDateString();
  return `${dateStr} ${this.startTime} - ${this.endTime}`;
});

// Method to check if event is upcoming
eventSchema.methods.isUpcoming = function() {
  const now = new Date();
  const eventDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.startTime}`);
  return eventDateTime > now && this.status === 'scheduled';
};

// Method to check if event is past
eventSchema.methods.isPast = function() {
  const now = new Date();
  const eventDateTime = new Date(`${this.date.toISOString().split('T')[0]}T${this.endTime}`);
  return eventDateTime < now;
};

module.exports = mongoose.model('Event', eventSchema);
