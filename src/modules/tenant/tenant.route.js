const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const {
  createTenantWithAdmin,
  createTenantUser,
  getTenantInfo,
  getPublicTenantInfo,
  getAllTenants,
  updateTenant,
  deleteTenant
} = require('./tenant.controller');
const {
  validateCreateTenant,
  validateCreateTenantUser,
  validateUpdateTenant
} = require('./tenant.validation');

/**
 * Tenant Routes
 * 
 * Routes for multi-tenant functionality:
 * - Super admin routes for tenant management
 * - Tenant admin routes for user management within tenant
 */

// Super Admin Routes
// ==================

/**
 * GET /api/v1/superadmin/tenants
 * Get all tenants (paginated)
 * Requires: Super admin authentication
 * Query params: page, limit, isActive, search
 */
router.get(
  '/superadmin/tenants',
  auth,
  requireRole(['superadmin']), // Only superadmin can access
  getAllTenants
);

/**
 * POST /api/v1/superadmin/create-tenant
 * Create a new tenant and tenant admin account
 * Requires: Super admin authentication
 * Body: { tenant: { name, subdomain, maxUsers? }, admin: { name, email, password } }
 */
router.post(
  '/superadmin/create-tenant',
  auth,
  requireRole(['superadmin']), // Only superadmin can access
  validateCreateTenant,
  createTenantWithAdmin
);

/**
 * PUT /api/v1/superadmin/tenants/:id
 * Update a tenant
 * Requires: Super admin authentication
 * Body: { name?, maxUsers?, isActive? }
 */
router.put(
  '/superadmin/tenants/:id',
  auth,
  requireRole(['superadmin']), // Only superadmin can access
  validateUpdateTenant,
  updateTenant
);

/**
 * DELETE /api/v1/superadmin/tenants/:id
 * Delete (soft or hard) a tenant
 * Requires: Super admin authentication
 * Query param: force=true for hard delete
 */
router.delete(
  '/superadmin/tenants/:id',
  auth,
  requireRole(['superadmin']), // Only superadmin can access
  deleteTenant
);

// Tenant Admin Routes
// ==================

/**
 * POST /api/v1/tenant/create-user
 * Create a new user (admin or candidate) for the current tenant
 * Requires: Tenant context (subdomain/header) + Tenant admin authentication
 * Body: { userType: 'admin' | 'candidate', userData: { ... } }
 */
router.post(
  '/tenant/create-user',
  auth,
  requireRole(['admin', 'recruiter']), // Tenant admin or recruiter can create users
  validateCreateTenantUser,
  createTenantUser
);

/**
 * GET /api/v1/tenant/public-info
 * Get public tenant information (for public pages)
 * Requires: Tenant context (subdomain/header) only - NO authentication required
 */
router.get(
  '/tenant/public-info',
  getPublicTenantInfo
);

/**
 * GET /api/v1/tenant/info
 * Get current tenant information
 * Requires: Tenant context (subdomain/header) + Tenant admin authentication
 */
router.get(
  '/tenant/info',
  auth,
  requireRole(['admin', 'recruiter']), // Tenant admin can view tenant info
  getTenantInfo
);

// Employee Management Routes
// ==================

/**
 * GET /api/v1/tenant/users
 * List all employees for the current tenant
 * Requires: Tenant context + Admin authentication
 * Query params: page, limit
 */
router.get(
  '/tenant/users',
  auth,
  requireRole(['admin', 'recruiter']), // Only tenant admin can list employees
  require('./employee.controller').getEmployees
);

/**
 * GET /api/v1/tenant/users/stats/quota
 * Get employee quota information for the current tenant
 * Requires: Tenant context + Admin authentication
 */
router.get(
  '/tenant/users/stats/quota',
  auth,
  requireRole(['admin', 'recruiter']),
  require('./employee.controller').getEmployeeQuota
);

/**
 * GET /api/v1/tenant/users/:id
 * Get a specific employee by ID
 * Requires: Tenant context + Admin authentication
 */
router.get(
  '/tenant/users/:id',
  auth,
  requireRole(['admin', 'recruiter']),
  require('./employee.controller').getEmployeeById
);

/**
 * POST /api/v1/tenant/users
 * Create a new employee for the current tenant
 * Requires: Tenant context + Admin authentication
 * Body: { firstName, lastName, email, password, phone? }
 */
router.post(
  '/tenant/users',
  auth,
  requireRole(['admin', 'recruiter']), // Only tenant admin can create employees
  require('./employee.validation').validateCreateEmployee,
  require('./employee.validation').handleValidationErrors,
  require('./employee.controller').createEmployee
);

/**
 * DELETE /api/v1/tenant/users/:id
 * Delete (soft delete) an employee
 * Requires: Tenant context + Admin authentication
 */
router.delete(
  '/tenant/users/:id',
  auth,
  requireRole(['admin', 'recruiter']), // Only tenant admin can delete employees
  require('./employee.controller').deleteEmployee
);

module.exports = router;

