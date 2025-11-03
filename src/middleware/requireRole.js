/**
 * requireRole Middleware
 * 
 * Verifies that the authenticated user has one of the required roles.
 * Must be used after the auth middleware.
 * 
 * Usage:
 * router.get('/api/superadmin/tenants', auth, requireRole(['superadmin']), controller.getAllTenants);
 * router.post('/api/tenant/users', auth, requireRole(['admin']), controller.createUser);
 * router.get('/api/employee/jobs', auth, requireRole(['candidate', 'employee']), controller.getJobs);
 * 
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Check if user is authenticated (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required'
      });
    }

    // Get user role
    const userRole = req.user.role;

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
      });
    }

    // User has required role, continue
    next();
  };
}

module.exports = requireRole;

