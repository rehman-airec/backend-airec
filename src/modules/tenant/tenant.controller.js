const { validationResult } = require('express-validator');
const TenantService = require('./tenant.service');
const { logger } = require('../../config/database');

/**
 * Tenant Controller
 * Handles HTTP requests and delegates business logic to TenantService
 */

/**
 * Create tenant and tenant admin (Super Admin only)
 * POST /api/v1/superadmin/create-tenant
 */
const createTenantWithAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { tenant: tenantData, admin: adminData } = req.body;
    const superAdminId = req.user._id;

    // Verify user is super admin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const result = await TenantService.createTenantWithAdmin(
      tenantData,
      adminData,
      superAdminId
    );

    res.status(201).json({
      success: true,
      message: 'Tenant and admin created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error creating tenant:', error);
    
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create tenant'
    });
  }
};

/**
 * Create user for tenant (Tenant Admin only)
 * POST /api/v1/tenant/create-user
 * 
 * Uses atomic quota check - if quota exceeded, returns 403
 */
const createTenantUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { userType, userData } = req.body;
    const tenantId = req.tenantId;

    // Ensure request has tenant context
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Verify user is admin and belongs to this tenant
    if (req.userType !== 'admin' || req.user.tenantId?.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Tenant admin access required'
      });
    }

    const result = await TenantService.createTenantUser(
      userData,
      userType,
      tenantId
    );

    res.status(201).json({
      success: true,
      message: `${userType} created successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Error creating tenant user:', error);

    // Handle quota exceeded error specifically
    if (error.message === 'QUOTA_EXCEEDED') {
      return res.status(403).json({
        success: false,
        message: 'Quota reached. Contact product owner.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    const statusCode = error.message.includes('already exists') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create user'
    });
  }
};

/**
 * Get public tenant information (for public pages like jobs listing)
 * GET /api/v1/tenant/public-info
 * No authentication required - uses tenant from subdomain middleware
 */
const getPublicTenantInfo = async (req, res) => {
  try {
    const tenant = req.tenant;

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Return basic tenant info (public data only)
    res.json({
      success: true,
      data: {
        _id: tenant._id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        isActive: tenant.isActive
      }
    });
  } catch (error) {
    logger.error('Error getting public tenant info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tenant information'
    });
  }
};

/**
 * Get tenant information (Tenant Admin only)
 * GET /api/v1/tenant/info
 */
const getTenantInfo = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    // Verify user belongs to this tenant
    if (req.userType !== 'admin' || req.user.tenantId?.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Tenant admin access required'
      });
    }

    const tenant = await TenantService.getTenantById(tenantId);

    res.json({
      success: true,
      data: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        maxUsers: tenant.maxUsers,
        currentUsersCount: tenant.currentUsersCount,
        isActive: tenant.isActive
      }
    });
  } catch (error) {
    logger.error('Error getting tenant info:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tenant information'
    });
  }
};

/**
 * Get all tenants (Super Admin only)
 * GET /api/v1/superadmin/tenants
 */
const getAllTenants = async (req, res) => {
  try {
    // Verify user is super admin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const { page = 1, limit = 10, isActive, search } = req.query;
    
    const result = await TenantService.getAllTenants(
      { 
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search 
      },
      { page, limit }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting tenants list:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get tenants list'
    });
  }
};

/**
 * Update tenant (Super Admin only)
 * PUT /api/v1/superadmin/tenants/:id
 */
const updateTenant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    // Verify user is super admin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const tenantId = req.params.id;
    const updateData = req.body;

    const updatedTenant = await TenantService.updateTenant(tenantId, updateData);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: updatedTenant
    });
  } catch (error) {
    logger.error('Error updating tenant:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('cannot be less') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update tenant'
    });
  }
};

/**
 * Delete tenant (Super Admin only)
 * DELETE /api/v1/superadmin/tenants/:id
 * Query param: force=true for hard delete
 */
const deleteTenant = async (req, res) => {
  try {
    // Verify user is super admin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const tenantId = req.params.id;
    const force = req.query.force === 'true';

    const result = await TenantService.deleteTenant(tenantId, force);

    res.json({
      success: true,
      message: force 
        ? 'Tenant and all related data deleted permanently' 
        : 'Tenant deactivated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error deleting tenant:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete tenant'
    });
  }
};

module.exports = {
  createTenantWithAdmin,
  createTenantUser,
  getTenantInfo,
  getPublicTenantInfo,
  getAllTenants,
  updateTenant,
  deleteTenant
};

