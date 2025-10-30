/**
 * Middleware to parse JSON strings in FormData body
 * When sending FormData, arrays and objects are stringified
 * This middleware parses them back into their original format
 */
const parseFormDataArrays = (req, res, next) => {
  // Fields that might be sent as JSON strings in FormData
  const jsonFields = ['attendees', 'additionalEmails', 'candidateEmails', 'screeningAnswers'];
  
  // Fields that might be sent as boolean strings
  const booleanFields = ['privacyEnabled', 'sendEventDetails'];
  
  if (req.body) {
    // Parse JSON string fields
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          const parsed = JSON.parse(req.body[field]);
          req.body[field] = parsed;
        } catch (error) {
          // If parsing fails, leave it as is - validation will catch it
          // This handles cases where the field is already an array or object
        }
      }
    });
    
    // Parse boolean string fields
    booleanFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = req.body[field] === 'true';
      }
    });
  }
  
  next();
};

module.exports = { parseFormDataArrays };

