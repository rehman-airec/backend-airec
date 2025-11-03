const Tenant = require('./tenant.model');
const { Admin, Candidate } = require('../auth/auth.model');
const AuthService = require('../auth/auth.service');
const { logger } = require('../../config/database');

/**
 * Tenant Service
 * Contains all business logic for tenant operations
 */
class TenantService {
  /**
   * Create a new tenant and tenant admin account
   * This is called by the super admin
   * 
   * @param {Object} tenantData - Tenant information
   * @param {String} tenantData.name - Tenant company name
   * @param {String} tenantData.subdomain - Tenant subdomain (e.g., 'abc')
   * @param {String} tenantData.maxUsers - Maximum users allowed
   * @param {Object} adminData - Tenant admin account information
   * @param {String} adminData.name - Admin name
   * @param {String} adminData.email - Admin email
   * @param {String} adminData.password - Admin password
   * @param {String} superAdminId - ID of the super admin creating this tenant
   */
  static async createTenantWithAdmin(tenantData, adminData, superAdminId) {
    const { name, subdomain, maxUsers } = tenantData;
    const { name: adminName, email: adminEmail, password: adminPassword } = adminData;

    // Validate subdomain format
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      throw new Error('Invalid subdomain format');
    }

    // Check if subdomain already exists
    const existingTenant = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingTenant) {
      throw new Error('Subdomain already exists');
    }

    // Check if admin email already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      throw new Error('Admin email already exists');
    }

    // Create tenant
    const tenant = await Tenant.create({
      name,
      subdomain: subdomain.toLowerCase(),
      ownerUserId: superAdminId,
      maxUsers: maxUsers || 10,
      currentUsersCount: 0, // Will be incremented when admin is created
      isActive: true
    });

    // Create tenant admin account with tenantId
    const tenantAdmin = await Admin.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'recruiter', // Tenant admin has recruiter role
      tenantId: tenant._id,
      isActive: true
    });

    // Atomically increment tenant user count
    await tenant.incrementUserCount();

    logger.info(`Tenant created: ${tenant.name} (${tenant.subdomain}) with admin: ${adminEmail}`);

    return {
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        maxUsers: tenant.maxUsers,
        currentUsersCount: tenant.currentUsersCount
      },
      admin: {
        _id: tenantAdmin._id,
        name: tenantAdmin.name,
        email: tenantAdmin.email,
        role: tenantAdmin.role
      }
    };
  }

  /**
   * Create a new user (admin or candidate) for a tenant with atomic quota check
   * This is called by tenant admin
   * 
   * Uses MongoDB's findOneAndUpdate with $lt condition for atomic quota enforcement
   * If quota is exceeded, the update fails and we return an error
   * 
   * @param {Object} userData - User information
   * @param {String} userType - 'admin' or 'candidate'
   * @param {String} tenantId - Tenant ID
   */
  static async createTenantUser(userData, userType, tenantId) {
    // Find tenant and check quota atomically
    const tenant = await Tenant.findOne({ 
      _id: tenantId,
      isActive: true 
    });

    if (!tenant) {
      throw new Error('Tenant not found or inactive');
    }

    // Atomic quota check: increment only if currentUsersCount < maxUsers
    const updatedTenant = await Tenant.findOneAndUpdate(
      {
        _id: tenantId,
        currentUsersCount: { $lt: tenant.maxUsers }
      },
      {
        $inc: { currentUsersCount: 1 }
      },
      {
        new: true
      }
    );

    // If update failed, quota exceeded
    if (!updatedTenant) {
      throw new Error('QUOTA_EXCEEDED');
    }

    try {
      // Create user with tenantId
      let user;
      if (userType === 'admin') {
        // Check if email already exists
        const existingAdmin = await Admin.findOne({ 
          email: userData.email.toLowerCase(),
          tenantId: tenantId // Check within tenant scope
        });
        
        if (existingAdmin) {
          // Rollback: decrement user count
          await Tenant.findByIdAndUpdate(tenantId, { $inc: { currentUsersCount: -1 } });
          throw new Error('Admin email already exists for this tenant');
        }

        user = await Admin.create({
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: userData.password,
          role: userData.role || 'recruiter',
          tenantId: tenantId,
          isActive: true
        });

        logger.info(`Tenant user created (admin): ${userData.email} for tenant: ${tenantId}`);
      } else if (userType === 'candidate') {
        // Check if email already exists
        const existingCandidate = await Candidate.findOne({ 
          email: userData.email.toLowerCase(),
          tenantId: tenantId // Check within tenant scope
        });
        
        if (existingCandidate) {
          // Rollback: decrement user count
          await Tenant.findByIdAndUpdate(tenantId, { $inc: { currentUsersCount: -1 } });
          throw new Error('Candidate email already exists for this tenant');
        }

        user = await Candidate.create({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email.toLowerCase(),
          password: userData.password,
          phone: userData.phone,
          tenantId: tenantId,
          isActive: true
        });

        logger.info(`Tenant user created (candidate): ${userData.email} for tenant: ${tenantId}`);
      } else {
        // Rollback: decrement user count
        await Tenant.findByIdAndUpdate(tenantId, { $inc: { currentUsersCount: -1 } });
        throw new Error('Invalid user type');
      }

      return {
        user: userType === 'admin' 
          ? { _id: user._id, name: user.name, email: user.email, role: user.role }
          : { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email },
        tenant: {
          currentUsersCount: updatedTenant.currentUsersCount,
          maxUsers: updatedTenant.maxUsers
        }
      };
    } catch (error) {
      // If user creation fails, rollback the tenant counter
      // (Already handled in the if blocks above, but this is a safety net)
      if (error.message !== 'QUOTA_EXCEEDED') {
        await Tenant.findByIdAndUpdate(tenantId, { $inc: { currentUsersCount: -1 } });
      }
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  static async getTenantById(tenantId) {
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  /**
   * Get tenant by subdomain
   */
  static async getTenantBySubdomain(subdomain) {
    const tenant = await Tenant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    }).lean();
    return tenant;
  }

  /**
   * Get all tenants (Super Admin only)
   * Returns list of all tenants with their information
   * 
   * @param {Object} filters - Filter options (isActive, search, etc.)
   * @param {Object} pagination - Pagination options (page, limit)
   */
  static async getAllTenants(filters = {}, pagination = {}) {
    const { page = 1, limit = 10, isActive, search } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } }
      ];
    }

    // Get tenants with owner information
    const tenants = await Tenant.find(query)
      .populate('ownerUserId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Tenant.countDocuments(query);

    return {
      tenants,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    };
  }

  /**
   * Update tenant (Super Admin only)
   * Updates tenant information such as name, maxUsers, and isActive status
   * 
   * @param {String} tenantId - Tenant ID to update
   * @param {Object} updateData - Data to update { name?, maxUsers?, isActive? }
   */
  static async updateTenant(tenantId, updateData) {
    const { name, maxUsers, isActive } = updateData;

    // Find tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Build update object
    const update = {};
    if (name !== undefined) {
      update.name = name.trim();
      if (update.name.length < 2 || update.name.length > 100) {
        throw new Error('Tenant name must be between 2 and 100 characters');
      }
    }

    if (maxUsers !== undefined) {
      if (typeof maxUsers !== 'number' || maxUsers < 1) {
        throw new Error('Max users must be a positive integer');
      }
      // Ensure maxUsers is not less than current users
      if (maxUsers < tenant.currentUsersCount) {
        throw new Error(`Max users cannot be less than current users (${tenant.currentUsersCount})`);
      }
      update.maxUsers = maxUsers;
    }

    if (isActive !== undefined) {
      update.isActive = isActive;
    }

    // Update tenant
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      update,
      { new: true, runValidators: true }
    ).populate('ownerUserId', 'name email').lean();

    if (!updatedTenant) {
      throw new Error('Failed to update tenant');
    }

    logger.info(`Tenant updated: ${tenantId} by superadmin`);
    return updatedTenant;
  }

  /**
   * Delete tenant (Super Admin only)
   * Soft deletes a tenant by setting isActive to false
   * Optionally can hard delete if force is true (removes all related data)
   * 
   * @param {String} tenantId - Tenant ID to delete
   * @param {Boolean} force - If true, performs hard delete (removes all data)
   */
  static async deleteTenant(tenantId, force = false) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (force) {
      // Hard delete: Remove tenant and all related data
      // First, get all related admins and candidates
      const admins = await Admin.find({ tenantId });
      const candidates = await Candidate.find({ tenantId });

      // Delete all related users
      if (admins.length > 0) {
        await Admin.deleteMany({ tenantId });
        logger.info(`Deleted ${admins.length} admin users for tenant ${tenantId}`);
      }

      if (candidates.length > 0) {
        await Candidate.deleteMany({ tenantId });
        logger.info(`Deleted ${candidates.length} candidate users for tenant ${tenantId}`);
      }

      // Delete the tenant
      await Tenant.findByIdAndDelete(tenantId);
      logger.info(`Hard deleted tenant: ${tenant.name} (${tenant.subdomain})`);
      
      return { deleted: true, method: 'hard', usersDeleted: admins.length + candidates.length };
    } else {
      // Soft delete: Just deactivate
      const updatedTenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { isActive: false },
        { new: true }
      ).lean();

      logger.info(`Soft deleted tenant: ${tenant.name} (${tenant.subdomain})`);
      return { deleted: true, method: 'soft', tenant: updatedTenant };
    }
  }
}

module.exports = TenantService;

