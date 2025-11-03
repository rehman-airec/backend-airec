const EmployeeService = require('./employee.service');
const { logger } = require('../../config/database');

/**
 * Employee Controller
 * 
 * Handles HTTP requests for employee management operations.
 * All operations are scoped to the current tenant.
 */

/**
 * GET /api/v1/tenant/users
 * List all employees for the current tenant
 */
const getEmployees = async (req, res) => {
  try {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
    }

    const { page = 1, limit = 10 } = req.query;

    const result = await EmployeeService.getEmployees(req.tenantId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.employees,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/tenant/users/:id
 * Get a specific employee by ID
 */
const getEmployeeById = async (req, res) => {
  try {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
    }

    const employee = await EmployeeService.getEmployeeById(
      req.params.id,
      req.tenantId
    );

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    logger.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
      error: error.message
    });
  }
};

/**
 * POST /api/v1/tenant/users
 * Create a new employee for the current tenant
 */
const createEmployee = async (req, res) => {
  try {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    // Prevent tenantId from being set by client
    const sanitizedData = {
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined
    };

    const employee = await EmployeeService.createEmployee(
      sanitizedData,
      req.tenantId,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    if (error.message.includes('limit reached') || error.message.includes('Quota exceeded')) {
      return res.status(403).json({
        success: false,
        message: 'Employee limit reached. Contact product owner to upgrade.'
      });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    logger.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/tenant/users/:id
 * Delete (soft delete) an employee
 */
const deleteEmployee = async (req, res) => {
  try {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
    }

    await EmployeeService.deleteEmployee(req.params.id, req.tenantId);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    logger.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/tenant/users/stats/quota
 * Get employee quota information for the current tenant
 */
const getEmployeeQuota = async (req, res) => {
  try {
    if (!req.tenant || !req.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
    }

    const quota = await EmployeeService.checkEmployeeQuota(req.tenantId);

    res.json({
      success: true,
      data: quota
    });
  } catch (error) {
    logger.error('Error fetching employee quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee quota',
      error: error.message
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  deleteEmployee,
  getEmployeeQuota
};

