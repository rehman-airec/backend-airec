/**
 * Tenant Query Helper
 * 
 * Utility functions for building tenant-aware database queries.
 * 
 * When req.tenant exists (tenant context detected), all queries should be
 * filtered by tenantId to ensure data isolation.
 * 
 * If req.tenant is null (no tenant context), queries work normally
 * (backward compatibility with single-tenant mode).
 */

/**
 * Add tenant filter to a query object
 * 
 * @param {Object} query - MongoDB query object
 * @param {Object} req - Express request object (should have req.tenant)
 * @returns {Object} - Query object with tenantId filter added if tenant context exists
 * 
 * @example
 * const query = { status: 'published' };
 * const tenantQuery = addTenantFilter(query, req);
 * // If req.tenant exists: { status: 'published', tenantId: req.tenant._id }
 * // If req.tenant is null: { status: 'published' }
 */
function addTenantFilter(query, req) {
  if (req && req.tenant && req.tenantId) {
    return {
      ...query,
      tenantId: req.tenantId
    };
  }
  return query;
}

/**
 * Add tenant filter to multiple queries (for bulk operations)
 * 
 * @param {Object} queries - Object with multiple query properties
 * @param {Object} req - Express request object
 * @returns {Object} - Queries object with tenantId filter added to each query
 */
function addTenantFilters(queries, req) {
  const result = {};
  for (const [key, query] of Object.entries(queries)) {
    result[key] = addTenantFilter(query, req);
  }
  return result;
}

/**
 * Ensure tenantId is included when creating/updating documents
 * 
 * @param {Object} data - Data object for create/update
 * @param {Object} req - Express request object
 * @returns {Object} - Data object with tenantId added if tenant context exists
 * 
 * @example
 * const jobData = { title: 'Developer', department: 'IT' };
 * const tenantData = ensureTenantId(jobData, req);
 * // If req.tenant exists: { title: 'Developer', department: 'IT', tenantId: req.tenant._id }
 */
function ensureTenantId(data, req) {
  if (req && req.tenant && req.tenantId) {
    return {
      ...data,
      tenantId: req.tenantId
    };
  }
  return data;
}

module.exports = {
  addTenantFilter,
  addTenantFilters,
  ensureTenantId
};

