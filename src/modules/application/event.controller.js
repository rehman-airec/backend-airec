const { validationResult } = require('express-validator');
const Event = require('./event.model');
const Application = require('./application.model');
const authModels = require('../auth/auth.model');
const Admin = authModels.Admin;
const Candidate = authModels.Candidate;
const { upload, handleUploadError } = require('../../middleware/upload');
const EventEmailService = require('../../services/eventEmailService');
const EventLoggingService = require('../../services/eventLoggingService');

// Validate that models are loaded at module level
if (!Admin) {
  console.error('FATAL: Admin model is not loaded at module initialization');
}
if (!Candidate) {
  console.error('FATAL: Candidate model is not loaded at module initialization');
}
if (!Application) {
  console.error('FATAL: Application model is not loaded at module initialization');
}

/**
 * Event Controller
 * Handles HTTP requests for event management
 */

// Create a new event
const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    // Validate args at runtime
    if (!Admin) {
      console.error('ERROR: Admin model is undefined in createEvent');
      throw new Error('Admin model is not loaded');
    }
    if (!Candidate) {
      console.error('ERROR: Candidate model is undefined in createEvent');
      throw new Error('Candidate model is not loaded');
    }
    if (!Application) {
      console.error('ERROR: Application model is undefined in createEvent');
      throw new Error('Application model is not loaded');
    }
    const {
      title,
      attendees, // Array of { userId, userType } objects
      additionalEmails,
      candidateEmails,
      date,
      startTime,
      endTime,
      location,
      notes,
      privacyEnabled = true,
      sendEventDetails = false,
      emailTemplateId
    } = req.body;

    // Validate that the application exists
    // Make sure to populate candidateSnapshot if it exists
    if (!Application || typeof Application.findById !== 'function') {
      console.error('ERROR: Application model is undefined or findById is not a function');
      console.error('Application:', Application);
      throw new Error('Application model is not loaded properly');
    }
    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Ensure we have candidateSnapshot or parsedCVData accessible
    // The application model already has these fields, so they should be available

    // Validate and enrich attendees with user data
    const enrichedAttendees = [];
    if (attendees && Array.isArray(attendees)) {
      for (const attendee of attendees) {
        if (attendee.userId && attendee.userType) {
          if (attendee.userType === 'Admin') {
            if (!Admin || typeof Admin.findById !== 'function') {
              console.error('ERROR: Admin model is undefined or findById is not a function');
              console.error('Admin:', Admin);
              return res.status(500).json({
                success: false,
                message: 'Admin model not loaded properly'
              });
            }
            const user = await Admin.findById(attendee.userId);
            if (!user) {
              return res.status(400).json({
                success: false,
                message: `Admin not found: ${attendee.userId}`
              });
            }
            enrichedAttendees.push({
              userId: user._id,
              userType: attendee.userType,
              email: user.email,
              name: user.name,
              role: user.role
            });
          } else if (attendee.userType === 'Candidate') {
            // Check if this is a guest candidate (guestApplicationId matches)
            if (application.isGuestApplication && 
                application.guestApplicationId && 
                attendee.userId.toString() === application.guestApplicationId.toString()) {
              // Use candidate snapshot data for guest applications
              if (application.candidateSnapshot || application.parsedCVData) {
                const candidateData = application.candidateSnapshot || {
                  email: application.parsedCVData?.email,
                  firstName: application.parsedCVData?.firstName,
                  lastName: application.parsedCVData?.lastName
                };
                enrichedAttendees.push({
                  userId: application.guestApplicationId,
                  userType: attendee.userType,
                  email: candidateData.email || attendee.email,
                  name: attendee.name || `${candidateData.firstName || ''} ${candidateData.lastName || ''}`.trim() || 'Guest Candidate',
                  isGuest: true
                });
              } else {
                // Fallback to attendee data if no snapshot available
                enrichedAttendees.push({
                  userId: attendee.userId,
                  userType: attendee.userType,
                  email: attendee.email,
                  name: attendee.name || 'Guest Candidate',
                  isGuest: true
                });
              }
            } else {
              // Regular candidate - lookup from Candidate collection
              if (!Candidate || typeof Candidate.findById !== 'function') {
                console.error('ERROR: Candidate model is undefined or findById is not a function');
                console.error('Candidate:', Candidate);
                return res.status(500).json({
                  success: false,
                  message: 'Candidate model not loaded properly'
                });
              }
              const user = await Candidate.findById(attendee.userId);
              if (!user) {
                return res.status(400).json({
                  success: false,
                  message: `Candidate not found: ${attendee.userId}`
                });
              }
              enrichedAttendees.push({
                userId: user._id,
                userType: attendee.userType,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`
              });
            }
          }
        }
      }
    }

    // Handle file uploads if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path
        });
      });
    }

    // Create the event
    const event = new Event({
      applicationId: req.params.applicationId,
      title,
      attendees: enrichedAttendees,
      additionalEmails: additionalEmails || [],
      candidateEmails: candidateEmails || [],
      privacyEnabled: privacyEnabled !== false, // Default to true
      sendEventDetails: sendEventDetails || false,
      emailTemplateId: emailTemplateId || null,
      date: new Date(date),
      startTime,
      endTime,
      attachments,
      location,
      notes,
      createdBy: req.user._id
    });

    await event.save();

    // Send response immediately (non-blocking) - don't wait for emails/logging
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });

    // Perform async operations after response is sent (non-blocking)
    // Log event creation using service
    EventLoggingService.logEventCreation(
      req.params.applicationId,
      event,
      req.user._id
    ).catch(err => console.error('Failed to log event creation:', err));

    // Get job and send email notifications (non-blocking)
    const Job = require('../jobs/job.model');
    if (Job && typeof Job.findById === 'function') {
      Job.findById(application.jobId).then(job => {
        if (job) {
          // Send emails to candidates (Email 1: Regular email, Email 2: Calendar invite)
          return EventEmailService.sendCandidateNotifications(event, application, job);
        }
      }).catch(emailError => {
        console.error('Failed to send candidate notifications:', emailError);
        // Don't fail the request if email sending fails
      });
    }
  } catch (error) {
    console.error('Error creating event:', error);
    console.error('Error stack:', error.stack);
    console.error('Models status - Admin:', !!Admin, 'Candidate:', !!Candidate, 'Application:', !!Application);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to filter attendees based on privacy settings
const filterAttendeesForViewer = (event, viewerId, viewerRole) => {
  // If privacy is disabled or viewer is the creator, show all attendees
  if (!event.privacyEnabled || event.createdBy.toString() === viewerId.toString()) {
    return event.attendees;
  }

  // If viewer is an admin/superadmin, they can see all attendees
  if (viewerRole === 'admin' || viewerRole === 'superadmin') {
    return event.attendees;
  }

  // For attendees with privacy enabled, only show themselves in the list
  const viewerAttendee = event.attendees.find(
    att => att.userId.toString() === viewerId.toString()
  );

  return viewerAttendee ? [viewerAttendee] : [];
};

// Get events for an application with privacy filtering
const getApplicationEvents = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, upcoming } = req.query;
    const viewerId = req.user._id;
    const viewerRole = req.user.role || 'admin'; // Default to admin for existing auth

    let query = { applicationId };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      const now = new Date();
      query.date = { $gte: now };
      query.status = 'scheduled';
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: 1, startTime: 1 });

    // Apply privacy filtering to each event
    const filteredEvents = events.map(event => {
      const eventObj = event.toObject();
      eventObj.attendees = filterAttendeesForViewer(event, viewerId, viewerRole);
      return eventObj;
    });

    res.json({
      success: true,
      events: filteredEvents
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { eventId } = req.params;
    const updateData = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path
      }));
      updateData.attachments = [...event.attachments, ...newAttachments];
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    );

    // Log event update using service
    await EventLoggingService.logEventUpdate(
      event.applicationId,
      event,
      updatedEvent,
      updateData,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await Event.findByIdAndDelete(eventId);

    // Log event deletion using service
    await EventLoggingService.logEventDeletion(
      event.applicationId,
      event,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get available users for attendee selection
const getAvailableAttendees = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    // Get application to find candidate
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const availableUsers = {
      admins: [],
      candidates: []
    };

    // Get all active admins
    if (!Admin) {
      return res.status(500).json({
        success: false,
        message: 'Admin model not loaded'
      });
    }
    const admins = await Admin.find({ isActive: true })
      .select('_id name email role')
      .sort({ name: 1 });

    availableUsers.admins = admins.map(admin => ({
      userId: admin._id,
      userType: 'Admin',
      email: admin.email,
      name: admin.name,
      role: admin.role
    }));

    // Get the candidate for this application
    if (application.isGuestApplication) {
      // For guest applications, use snapshot data
      if (application.candidateSnapshot) {
        availableUsers.candidates.push({
          userId: application.guestApplicationId,
          userType: 'Candidate',
          email: application.candidateSnapshot.email,
          name: `${application.candidateSnapshot.firstName} ${application.candidateSnapshot.lastName}`,
          isGuest: true
        });
      }
    } else if (application.candidateId) {
      // For regular applications, get candidate data
      if (!Candidate) {
        return res.status(500).json({
          success: false,
          message: 'Candidate model not loaded'
        });
      }
      const candidate = await Candidate.findById(application.candidateId)
        .select('_id firstName lastName email');
      
      if (candidate) {
        availableUsers.candidates.push({
          userId: candidate._id,
          userType: 'Candidate',
          email: candidate.email,
          name: `${candidate.firstName} ${candidate.lastName}`
        });
      }
    }

    res.json({
      success: true,
      availableAttendees: availableUsers
    });
  } catch (error) {
    console.error('Error fetching available attendees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to create Google Calendar event with privacy
const createGoogleCalendarEvent = async (event, application) => {
  // This function will be implemented when Google Calendar integration is added
  // For now, it's a placeholder that respects privacy settings
  
  try {
    // When implementing Google Calendar:
    // 1. If privacyEnabled is true, create separate calendar events for each attendee
    // 2. Each attendee only sees themselves as an attendee
    // 3. The organizer (event creator) sees all attendees
    
    if (event.privacyEnabled) {
      // For privacy-enabled events, create individual events for each attendee
      const calendarEvents = [];
      
      for (const attendee of event.attendees) {
        // Create event with only this attendee visible
        // Store event ID in a mapping structure
        calendarEvents.push({
          attendeeId: attendee.userId.toString(),
          calendarEventId: null, // Will be set when Google Calendar API is integrated
          attendees: [attendee] // Only this attendee visible
        });
      }
      
      // Store the mapping in event metadata or separate collection
      return {
        success: true,
        calendarEvents,
        privacyEnabled: true
      };
    } else {
      // For non-private events, create one event with all attendees
      return {
        success: true,
        calendarEventId: null, // Will be set when Google Calendar API is integrated
        attendees: event.attendees
      };
    }
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
};

module.exports = {
  createEvent,
  getApplicationEvents,
  updateEvent,
  deleteEvent,
  getAvailableAttendees,
  filterAttendeesForViewer,
  createGoogleCalendarEvent
};
