const NotificationService = require('./notification.service');
const { logger } = require('../../config/database');

/**
 * Get all notifications for the current user
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userType = req.userType || (req.user?.role === 'candidate' || req.user?.role === 'employee' ? 'candidate' : 'admin');
    const tenantId = req.tenantId || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { page = 1, limit = 50, read } = req.query;

    const result = await NotificationService.getNotifications(userId, userType, tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      read: read !== undefined ? read === 'true' : undefined,
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userType = req.userType || (req.user?.role === 'candidate' || req.user?.role === 'employee' ? 'candidate' : 'admin');
    const tenantId = req.tenantId || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await NotificationService.getUnreadCount(userId, userType, tenantId);

    res.json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const notification = await NotificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to mark notification as read',
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userType = req.userType || (req.user?.role === 'candidate' || req.user?.role === 'employee' ? 'candidate' : 'admin');
    const tenantId = req.tenantId || null;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const result = await NotificationService.markAllAsRead(userId, userType, tenantId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await NotificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete notification',
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

