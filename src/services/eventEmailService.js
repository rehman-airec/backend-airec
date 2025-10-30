const EmailService = require('./emailService');
const EmailTemplate = require('../modules/events/emailTemplate.model');

/**
 * Event Email Service
 * Handles sending emails and calendar invites for events
 */
class EventEmailService {
  /**
   * Get candidate emails from application and event
   */
  async getCandidateEmails(application, event) {
    const candidateEmails = [];
    
    // Get candidate email from application
    if (application.isGuestApplication) {
      if (application.candidateSnapshot?.email) {
        candidateEmails.push(application.candidateSnapshot.email);
      }
    } else if (application.candidateId) {
      const { Candidate } = require('../modules/auth/auth.model');
      const candidate = await Candidate.findById(application.candidateId);
      if (candidate?.email) {
        candidateEmails.push(candidate.email);
      }
    }
    
    // Add candidate emails from event
    if (event.candidateEmails && event.candidateEmails.length > 0) {
      event.candidateEmails.forEach(email => {
        if (!candidateEmails.includes(email)) {
          candidateEmails.push(email);
        }
      });
    }
    
    return candidateEmails;
  }

  /**
   * Process email template with variables
   */
  processEmailTemplate(template, event, job) {
    let subject = template.subject;
    let body = template.body;
    
    const variables = {
      eventTitle: event.title,
      jobTitle: job.title,
      date: event.formattedDateTime || `${event.date} ${event.startTime}`,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || 'TBD',
      notes: event.notes || '',
      meetingLink: event.meetingLink || ''
    };
    
    // Replace all template variables
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, variables[key]);
      body = body.replace(regex, variables[key]);
    });
    
    return { subject, body };
  }

  /**
   * Send email to candidate with template
   * Email 1: Regular email with configurable template
   */
  async sendCandidateEmail(event, application, job) {
    try {
      const candidateEmails = await this.getCandidateEmails(application, event);
      if (candidateEmails.length === 0) {
        console.log('No candidate emails found for event');
        return;
      }

      // Get default email template (category: 'event', isActive: true)
      // Or use the one specified in event
      let template = null;
      if (event.emailTemplateId) {
        template = await EmailTemplate.findById(event.emailTemplateId);
      }
      
      // If no template specified or not found, get default active event template
      if (!template || !template.isActive) {
        template = await EmailTemplate.findOne({ 
          category: 'event', 
          isActive: true 
        }).sort({ createdAt: -1 });
      }

      let emailSubject, emailBody;
      
      if (template && template.isActive) {
        const processed = this.processEmailTemplate(template, event, job);
        emailSubject = processed.subject;
        emailBody = processed.body;
      } else {
        // Fallback to default email
        emailSubject = `Event Invitation: ${event.title}`;
        emailBody = `
          <h2>Event Details</h2>
          <p><strong>Title:</strong> ${event.title}</p>
          <p><strong>Date & Time:</strong> ${event.formattedDateTime || `${event.date} ${event.startTime} - ${event.endTime}`}</p>
          <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
          ${event.notes ? `<p><strong>Notes:</strong> ${event.notes}</p>` : ''}
        `;
      }

      // Send email to all candidate emails
      for (const email of candidateEmails) {
        await EmailService.sendEmail(email, emailSubject, emailBody);
        console.log(`Event email sent to candidate: ${email}`);
      }
    } catch (error) {
      console.error('Error sending candidate email:', error);
      throw error;
    }
  }

  /**
   * Send Google Calendar invite to candidate
   * Email 2: Calendar invite with privacy settings
   */
  async sendCalendarInvite(event, application) {
    try {
      const candidateEmails = await this.getCandidateEmails(application, event);
      if (candidateEmails.length === 0) {
        console.log('No candidate emails found for calendar invite');
        return;
      }

      // Generate calendar invite for each candidate email
      for (const candidateEmail of candidateEmails) {
        const calendarInvite = EmailService.generateCalendarInvite(
          event, 
          candidateEmail, 
          event.privacyEnabled !== false // Default to true
        );
        
        // Create a simple email with calendar attachment
        const emailSubject = `Calendar Invitation: ${event.title}`;
        const emailBody = `
          <p>You have been invited to an event. Please see the calendar invitation attached.</p>
          <p><strong>Event:</strong> ${event.title}</p>
          <p><strong>Date:</strong> ${event.formattedDateTime || `${event.date} ${event.startTime} - ${event.endTime}`}</p>
        `;
        
        await EmailService.sendEmailWithCalendarInvite(
          candidateEmail,
          emailSubject,
          emailBody,
          calendarInvite
        );
        console.log(`Calendar invite sent to candidate: ${candidateEmail}`);
      }
    } catch (error) {
      console.error('Error sending calendar invite:', error);
      throw error;
    }
  }

  /**
   * Send both emails to candidates (Email 1 + Email 2)
   */
  async sendCandidateNotifications(event, application, job) {
    try {
      // Email 1: Regular email with template
      await this.sendCandidateEmail(event, application, job);
      
      // Email 2: Calendar invite
      await this.sendCalendarInvite(event, application);
    } catch (error) {
      console.error('Error sending candidate notifications:', error);
      // Don't throw - we still want the event to be created even if emails fail
    }
  }
}

module.exports = new EventEmailService();

