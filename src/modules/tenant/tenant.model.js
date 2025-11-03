const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Represents a company/organization using the platform
 */
const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    minlength: [2, 'Tenant name must be at least 2 characters'],
    maxlength: [100, 'Tenant name cannot exceed 100 characters']
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, 'Invalid subdomain format'],
    index: true
  },
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Owner user ID is required'],
    index: true
  },
  maxUsers: {
    type: Number,
    required: [true, 'Max users is required'],
    min: [1, 'Max users must be at least 1'],
    default: 10
  },
  currentUsersCount: {
    type: Number,
    required: true,
    min: [0, 'Current users count cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
tenantSchema.index({ subdomain: 1 }, { unique: true });
tenantSchema.index({ ownerUserId: 1 });
tenantSchema.index({ isActive: 1 });

// Methods
tenantSchema.methods.canAddUser = function() {
  return this.currentUsersCount < this.maxUsers;
};

tenantSchema.methods.incrementUserCount = async function() {
  // Atomic increment with quota check
  const updated = await mongoose.model('Tenant').findOneAndUpdate(
    {
      _id: this._id,
      currentUsersCount: { $lt: this.maxUsers }
    },
    {
      $inc: { currentUsersCount: 1 }
    },
    {
      new: true
    }
  );
  
  if (!updated) {
    throw new Error('Quota exceeded or tenant not found');
  }
  
  this.currentUsersCount = updated.currentUsersCount;
  return updated;
};

tenantSchema.methods.decrementUserCount = async function() {
  const updated = await mongoose.model('Tenant').findOneAndUpdate(
    { _id: this._id },
    { $inc: { currentUsersCount: -1 } },
    { new: true }
  );
  
  if (updated) {
    this.currentUsersCount = updated.currentUsersCount;
  }
  
  return updated;
};

module.exports = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);

