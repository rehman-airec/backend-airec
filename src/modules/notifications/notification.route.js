const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('./notification.controller');

// All notification routes require authentication
router.use(auth);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

module.exports = router;

