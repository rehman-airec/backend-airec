require('dotenv').config();

const jwt = require('jsonwebtoken');
const { Admin, Candidate } = require('../modules/auth/auth.model');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    console.log('Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
    console.log('Auth middleware - Header value:', authHeader);
    console.log('Auth middleware - URL:', req.originalUrl);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware - Missing or invalid authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided, authorization denied' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Determine user type and fetch user
    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.userId).select('+password');
    } else if (decoded.userType === 'candidate') {
      user = await Candidate.findById(decoded.userId).select('+password');
    } else {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token type' 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Multi-tenant: If tenant context exists, verify user belongs to that tenant
    // Exception: superadmin can access any tenant
    if (req.tenant && req.tenantId) {
      // Superadmin can bypass tenant check
      if (user.role === 'superadmin') {
        // Superadmin allowed - continue
      } else if (!user.tenantId || user.tenantId.toString() !== req.tenantId.toString()) {
        // User doesn't belong to this tenant
        return res.status(403).json({ 
          success: false,
          message: 'Access denied: User does not belong to this tenant' 
        });
      }
    }

    req.user = user;
    req.userType = decoded.userType;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error during authentication' 
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

const candidateAuth = async (req, res, next) => {
  try {
    if (req.userType !== 'candidate') {
      return res.status(403).json({ 
        success: false,
        message: 'Candidate access required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Optional auth - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.userId);
    } else if (decoded.userType === 'candidate') {
      user = await Candidate.findById(decoded.userId);
    }

    if (user && user.isActive) {
      // Multi-tenant: If tenant context exists, verify user belongs to that tenant
      // Exception: superadmin can access any tenant
      if (req.tenant && req.tenantId) {
        if (user.role === 'superadmin' || (user.tenantId && user.tenantId.toString() === req.tenantId.toString())) {
          req.user = user;
          req.userType = decoded.userType;
          req.userId = decoded.userId;
        }
      } else {
        // No tenant context, proceed normally
        req.user = user;
        req.userType = decoded.userType;
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = { auth, adminAuth, candidateAuth, optionalAuth };
