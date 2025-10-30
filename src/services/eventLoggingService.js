const Application = require('../modules/application/application.model');
const { Admin } = require('../modules/auth/auth.model');

/**
 * Event Logging Service
 * Handles logging for event-related actions
 */
class EventLoggingService {
  /**
   * Log event creation
   */
  async logEventCreation(applicationId, event, creatorId) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) {
        console.error('Application not found for logging');
        return;
      }

      const creator = await Admin.findById(creatorId);
      
      application.logs.push({
        action: `Event created: ${event.title}`,
        userId: creatorId,
        userRole: 'Admin',
        metadata: {
          eventId: event._id,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: `${event.startTime} - ${event.endTime}`,
          location: event.location || 'Not specified',
          attendeeCount: event.attendees?.length || 0,
          candidateEmails: event.candidateEmails || [],
          createdBy: creator?.name || creator?.email || 'Unknown',
          privacyEnabled: event.privacyEnabled,
          emailTemplateId: event.emailTemplateId || null
        }
      });

      await application.save();
    } catch (error) {
      console.error('Error logging event creation:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log event update
   */
  async logEventUpdate(applicationId, event, updatedEvent, changes, updaterId) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) {
        console.error('Application not found for logging');
        return;
      }

      const updater = await Admin.findById(updaterId);
      
      // Identify what changed
      const changedFields = [];
      if (changes.title && changes.title !== event.title) {
        changedFields.push(`Title: "${event.title}" → "${changes.title}"`);
      }
      if (changes.date && changes.date.toString() !== event.date.toString()) {
        changedFields.push(`Date: ${event.date} → ${changes.date}`);
      }
      if (changes.startTime && changes.startTime !== event.startTime) {
        changedFields.push(`Start Time: ${event.startTime} → ${changes.startTime}`);
      }
      if (changes.endTime && changes.endTime !== event.endTime) {
        changedFields.push(`End Time: ${event.endTime} → ${changes.endTime}`);
      }
      if (changes.location !== undefined && changes.location !== event.location) {
        changedFields.push(`Location: "${event.location || 'Not set'}" → "${changes.location || 'Not set'}"`);
      }

      const details = changedFields.length > 0 
        ? changedFields.join('; ') 
        : 'Event details updated';

      application.logs.push({
        action: `Event updated: ${updatedEvent.title}`,
        userId: updaterId,
        userRole: 'Admin',
        metadata: {
          eventId: updatedEvent._id,
          eventTitle: updatedEvent.title,
          changedBy: updater?.name || updater?.email || 'Unknown',
          changes: details,
          allChanges: changes
        }
      });

      await application.save();
    } catch (error) {
      console.error('Error logging event update:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log event deletion
   */
  async logEventDeletion(applicationId, event, deleterId) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) {
        console.error('Application not found for logging');
        return;
      }

      const deleter = await Admin.findById(deleterId);
      
      application.logs.push({
        action: `Event deleted: ${event.title}`,
        userId: deleterId,
        userRole: 'Admin',
        metadata: {
          eventId: event._id,
          eventTitle: event.title,
          deletedBy: deleter?.name || deleter?.email || 'Unknown',
          eventDate: event.date,
          eventTime: `${event.startTime} - ${event.endTime}`
        }
      });

      await application.save();
    } catch (error) {
      console.error('Error logging event deletion:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
}

module.exports = new EventLoggingService();

