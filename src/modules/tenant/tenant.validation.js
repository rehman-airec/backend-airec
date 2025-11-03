const { body, validationResult } = require('express-validator');

/**
 * Validation middleware for tenant operations
 */

/**
 * Validate tenant creation request
 * Used by super admin to create tenant and tenant admin
 */
const validateCreateTenant = [
  body('tenant.name')
    .notEmpty().withMessage('Tenant name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Tenant name must be between 2 and 100 characters'),
  
  body('tenant.subdomain')
    .notEmpty().withMessage('Subdomain is required')
    .matches(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/).withMessage('Invalid subdomain format')
    .isLength({ min: 2, max: 63 }).withMessage('Subdomain must be between 2 and 63 characters'),
  
  body('tenant.maxUsers')
    .optional()
    .isInt({ min: 1 }).withMessage('Max users must be a positive integer'),
  
  body('admin.name')
    .notEmpty().withMessage('Admin name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Admin name must be between 2 and 50 characters'),
  
  body('admin.email')
    .notEmpty().withMessage('Admin email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('admin.password')
    .notEmpty().withMessage('Admin password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

/**
 * Validate tenant user creation request
 * Used by tenant admin to create users
 */
const validateCreateTenantUser = [
  body('userType')
    .notEmpty().withMessage('User type is required')
    .isIn(['admin', 'candidate']).withMessage('User type must be either "admin" or "candidate"'),
  
  body('userData.email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('userData.password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  // Admin-specific validation
  body('userData.name')
    .if(body('userType').equals('admin'))
    .notEmpty().withMessage('Name is required for admin')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('userData.role')
    .if(body('userType').equals('admin'))
    .optional()
    .isIn(['recruiter', 'superadmin']).withMessage('Role must be either "recruiter" or "superadmin"'),
  
  // Candidate-specific validation
  body('userData.firstName')
    .if(body('userType').equals('candidate'))
    .notEmpty().withMessage('First name is required for candidate')
    .isLength({ min: 2, max: 30 }).withMessage('First name must be between 2 and 30 characters'),
  
  body('userData.lastName')
    .if(body('userType').equals('candidate'))
    .notEmpty().withMessage('Last name is required for candidate')
    .isLength({ min: 2, max: 30 }).withMessage('Last name must be between 2 and 30 characters'),
  
  body('userData.phone')
    .if(body('userType').equals('candidate'))
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number format')
];

/**
 * Validate tenant update request
 * Used by super admin to update tenant
 */
const validateUpdateTenant = [
  body('name')
    .optional()
    .notEmpty().withMessage('Tenant name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Tenant name must be between 2 and 100 characters'),
  
  body('maxUsers')
    .optional()
    .isInt({ min: 1 }).withMessage('Max users must be a positive integer'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean value')
];

module.exports = {
  validateCreateTenant,
  validateCreateTenantUser,
  validateUpdateTenant
};

