const Notification = require('./notification.model');

class NotificationService {
  /**
   * Get all notifications for a user
   * 
   * @param {String} userId - User ID
   * @param {String} userType - User type ('admin' or 'candidate')
   * @param {String} tenantId - Optional tenant ID for filtering
   * @param {Object} options - Query options { page, limit, read }
   */
  static async getNotifications(userId, userType, tenantId = null, options = {}) {
    const { page = 1, limit = 50, read } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      userId: userId,
      userType: userType,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    if (read !== undefined) {
      query.read = read;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get unread notification count for a user
   * 
   * @param {String} userId - User ID
   * @param {String} userType - User type ('admin' or 'candidate')
   * @param {String} tenantId - Optional tenant ID for filtering
   */
  static async getUnreadCount(userId, userType, tenantId = null) {
    const query = {
      userId: userId,
      userType: userType,
      read: false,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    return await Notification.countDocuments(query);
  }

  /**
   * Create a new notification
   * 
   * @param {Object} notificationData - Notification data
   */
  static async createNotification(notificationData) {
    const {
      userId,
      userType,
      tenantId,
      title,
      message,
      type = 'info',
      link,
      metadata = {},
    } = notificationData;

    const notification = await Notification.create({
      userId,
      userType,
      tenantId,
      title,
      message,
      type,
      link,
      metadata,
    });

    return notification;
  }

  /**
   * Mark notification as read
   * 
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID (for verification)
   */
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: userId,
      },
      {
        read: true,
        readAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   * 
   * @param {String} userId - User ID
   * @param {String} userType - User type ('admin' or 'candidate')
   * @param {String} tenantId - Optional tenant ID for filtering
   */
  static async markAllAsRead(userId, userType, tenantId = null) {
    const query = {
      userId: userId,
      userType: userType,
      read: false,
    };

    if (tenantId) {
      query.tenantId = tenantId;
    }

    const result = await Notification.updateMany(
      query,
      {
        read: true,
        readAt: new Date(),
      }
    );

    return {
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Delete a notification
   * 
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID (for verification)
   */
  static async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: userId,
    });

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    return notification;
  }
}

module.exports = NotificationService;

