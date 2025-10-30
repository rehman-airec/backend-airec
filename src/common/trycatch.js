/**
 * Async Error Handler Wrapper
 * Wraps async functions to automatically catch errors and pass them to error handling middleware
 */

/**
 * Wraps an async controller/handler function to catch errors
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Wrapped function that catches errors
 * 
 * @example
 * const getUser = trycatch(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   res.json({ success: true, user });
 * });
 */
const trycatch = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wraps multiple async controller/handler functions at once
 * @param {Object} handlers - Object containing handler functions
 * @returns {Object} - Object with wrapped handler functions
 * 
 * @example
 * const handlers = wrapHandlers({
 *   getUser: async (req, res) => { ... },
 *   createUser: async (req, res) => { ... }
 * });
 */
const wrapHandlers = (handlers) => {
  const wrapped = {};
  for (const [key, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrapped[key] = trycatch(handler);
    } else {
      wrapped[key] = handler;
    }
  }
  return wrapped;
};

module.exports = {
  trycatch,
  wrapHandlers
};
