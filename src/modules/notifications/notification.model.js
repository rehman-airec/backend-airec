const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    index: true,
  },
  userType: {
    type: String,
    enum: ['admin', 'candidate'],
    required: [true, 'User type is required'],
  },
  // Multi-tenant support
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true,
    required: false,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  link: {
    type: String,
    trim: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, userType: 1, read: 1 });
notificationSchema.index({ userId: 1, userType: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

