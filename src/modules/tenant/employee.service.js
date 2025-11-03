const { Admin, Candidate } = require('../auth/auth.model');
const Tenant = require('./tenant.model');
const { logger } = require('../../config/database');

/**
 * Employee Service
 * 
 * Handles employee CRUD operations with tenant isolation and quota management.
 * Employees are stored as Candidate documents with role='employee'
 */
class EmployeeService {
  /**
   * Get all employees for a tenant
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Object} pagination - Pagination options { page, limit }
   * @returns {Object} Employees list with pagination
   */
  static async getEmployees(tenantId, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      tenantId: tenantId,
      role: 'employee',
      isActive: true
    };

    // Optimize: Populate only if there are results to avoid unnecessary joins
    const employees = await Candidate.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate createdBy only if there are employees (faster for empty results)
    if (employees.length > 0) {
      await Candidate.populate(employees, {
        path: 'createdBy',
        select: 'name email',
        model: 'Admin'
      });
    }

    // Use estimated count for faster response when collection is large
    // But use exact count for accuracy when results are few
    const total = await Candidate.countDocuments(filter);

    return {
      employees,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Get employee by ID (with tenant verification)
   * 
   * @param {String} employeeId - Employee ID
   * @param {String} tenantId - Tenant ID (for verification)
   * @returns {Object} Employee document
   */
  static async getEmployeeById(employeeId, tenantId) {
    const employee = await Candidate.findOne({
      _id: employeeId,
      tenantId: tenantId,
      role: 'employee'
    }).select('-password -passwordResetToken -passwordResetExpires')
      .populate('createdBy', 'name email')
      .lean();

    if (!employee) {
      throw new Error('Employee not found or does not belong to your tenant');
    }

    return employee;
  }

  /**
   * Create a new employee for a tenant with quota check
   * 
   * @param {Object} employeeData - Employee data
   * @param {String} tenantId - Tenant ID
   * @param {String} createdById - ID of admin creating the employee
   * @returns {Object} Created employee
   */
  static async createEmployee(employeeData, tenantId, createdById) {
    const { firstName, lastName, email, password, phone } = employeeData;

    // Get tenant to check quota
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if we can add more employees (atomic check)
    // Use tenant's maxUsers as employeeLimit
    const currentEmployeeCount = await Candidate.countDocuments({
      tenantId: tenantId,
      role: 'employee',
      isActive: true
    });

    if (currentEmployeeCount >= tenant.maxUsers) {
      throw new Error('Employee limit reached. Contact product owner to upgrade.');
    }

    // Check if email already exists
    const existingEmployee = await Candidate.findOne({ email: email.toLowerCase() });
    if (existingEmployee) {
      throw new Error('Employee with this email already exists');
    }

    // Create employee as Candidate with role='employee'
    const employee = await Candidate.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone,
      tenantId,
      role: 'employee',
      createdBy: createdById,
      isActive: true
    });

    // Atomically increment tenant user count
    try {
      await tenant.incrementUserCount();
    } catch (error) {
      // If quota exceeded during atomic increment, delete the employee
      await Candidate.findByIdAndDelete(employee._id);
      throw new Error('Employee limit reached. Contact product owner to upgrade.');
    }

    logger.info(`Employee created: ${employee.email} for tenant ${tenantId} by ${createdById}`);

    // Return employee without sensitive fields
    const employeeObj = employee.toObject();
    delete employeeObj.password;
    delete employeeObj.passwordResetToken;
    delete employeeObj.passwordResetExpires;

    return employeeObj;
  }

  /**
   * Delete employee (soft delete by setting isActive=false)
   * 
   * @param {String} employeeId - Employee ID
   * @param {String} tenantId - Tenant ID (for verification)
   * @returns {Boolean} Success status
   */
  static async deleteEmployee(employeeId, tenantId) {
    const employee = await Candidate.findOne({
      _id: employeeId,
      tenantId: tenantId,
      role: 'employee'
    });

    if (!employee) {
      throw new Error('Employee not found or does not belong to your tenant');
    }

    // Soft delete
    employee.isActive = false;
    await employee.save();

    // Decrement tenant user count
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      await tenant.decrementUserCount();
    }

    logger.info(`Employee deleted (soft): ${employeeId} from tenant ${tenantId}`);

    return true;
  }

  /**
   * Get employee count for a tenant
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Number} Employee count
   */
  static async getEmployeeCount(tenantId) {
    // MongoDB will use the composite index (tenantId, role, isActive) automatically
    return await Candidate.countDocuments({
      tenantId: tenantId,
      role: 'employee',
      isActive: true
    });
  }

  /**
   * Check if tenant can add more employees
   * 
   * @param {String} tenantId - Tenant ID
   * @returns {Object} { canAdd, current, max }
   */
  static async checkEmployeeQuota(tenantId) {
    // Optimize: Fetch tenant and count in parallel
    const [tenant, current] = await Promise.all([
      Tenant.findById(tenantId).select('maxUsers').lean(),
      this.getEmployeeCount(tenantId)
    ]);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const max = tenant.maxUsers || 0;

    return {
      canAdd: current < max,
      current,
      max,
      remaining: Math.max(0, max - current)
    };
  }
}

module.exports = EmployeeService;

