const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // For development, we'll use a simple console logger
    // In production, you would configure with actual SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.log('Email service not configured:', error.message);
        console.log('Using console logging for email notifications');
      } else {
        console.log('Email service ready to send messages');
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      // If email service is not configured, log to console
      if (!process.env.SMTP_USER) {
        console.log('📧 EMAIL NOTIFICATION:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', text || this.stripHtml(html));
        console.log('---');
        return { success: true, messageId: 'console-log' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Generate Google Calendar invite ICS file
  generateCalendarInvite(event, candidateEmail, privacyEnabled = true) {
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDateTime = new Date(`${event.date.toISOString().split('T')[0]}T${event.startTime}`);
    const endDateTime = new Date(`${event.date.toISOString().split('T')[0]}T${event.endTime}`);
    
    // Adjust for timezone if needed
    const startStr = formatDate(startDateTime);
    const endStr = formatDate(endDateTime);
    const createdStr = formatDate(new Date());

    // Escape special characters for ICS format
    const escapeICS = (str) => {
      return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    };

    // For privacy-enabled events, only show the candidate as attendee
    const attendees = privacyEnabled ? [{ email: candidateEmail }] : event.attendees || [];
    const attendeeList = attendees.map(att => `ATTENDEE;CN="${escapeICS(att.name || att.email)}";RSVP=TRUE:mailto:${att.email || candidateEmail}`).join('\r\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Recruitment System//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event._id}-${Date.now()}@recruitment-system`,
      `DTSTAMP:${createdStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.notes || '')}`,
      `LOCATION:${escapeICS(event.location || 'TBD')}`,
      attendeeList,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeICS(event.title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  // Send email with calendar invite attachment
  async sendEmailWithCalendarInvite(to, subject, html, calendarInvite, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
        attachments: [
          {
            filename: 'invite.ics',
            content: Buffer.from(calendarInvite),
            contentType: 'text/calendar; method=REQUEST; charset=UTF-8'
          }
        ]
      };

      if (!process.env.SMTP_USER) {
        console.log('📧 EMAIL WITH CALENDAR INVITE:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', text || this.stripHtml(html));
        console.log('Calendar Invite:', calendarInvite.substring(0, 200) + '...');
        console.log('---');
        return { success: true, messageId: 'console-log' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email with calendar invite sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email with calendar invite:', error);
      return { success: false, error: error.message };
    }
  }

  generateApplicationConfirmationEmail(candidateName, jobTitle, trackingToken, frontendUrl) {
    const trackingUrl = `${frontendUrl}/guest/track/${trackingToken}`;
    
    return {
      subject: `Application Confirmation - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Application Received</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${candidateName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for your interest in the <strong>${jobTitle}</strong> position. 
              We have successfully received your application and it is now under review.
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Track Your Application</h3>
              <p style="color: #4b5563; margin-bottom: 15px;">
                You can track the status of your application using the link below:
              </p>
              <a href="${trackingUrl}" 
                 style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Track Application Status
              </a>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">💡 Want Full Access?</h4>
              <p style="color: #92400e; margin-bottom: 10px;">
                Create an account to get full visibility into all your applications, 
                save jobs, and receive personalized job recommendations.
              </p>
              <a href="${frontendUrl}/auth/signup" 
                 style="color: #3B82F6; text-decoration: none; font-weight: bold;">
                Create Account →
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              We will review your application and get back to you as soon as possible. 
              If you have any questions, please don't hesitate to contact us.
            </p>
            
            <p style="color: #4b5563; margin-top: 30px;">
              Best regards,<br>
              The Recruitment Team
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };
  }

  generateStatusUpdateEmail(candidateName, jobTitle, newStatus, trackingToken, frontendUrl) {
    const trackingUrl = `${frontendUrl}/guest/track/${trackingToken}`;
    
    const statusMessages = {
      'In Review': 'Your application is now being reviewed by our hiring team.',
      'Interview': 'Congratulations! You have been selected for an interview.',
      'Offer': 'Great news! We would like to extend an offer to you.',
      'Hired': 'Congratulations! You have been hired for this position.',
      'Rejected': 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.'
    };

    const statusColors = {
      'In Review': '#3B82F6',
      'Interview': '#10B981',
      'Offer': '#F59E0B',
      'Hired': '#10B981',
      'Rejected': '#EF4444'
    };

    const statusColor = statusColors[newStatus] || '#3B82F6';
    const statusMessage = statusMessages[newStatus] || 'Your application status has been updated.';

    return {
      subject: `Application Status Update - ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Application Status Update</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${candidateName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              We have an update regarding your application for the <strong>${jobTitle}</strong> position.
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Status: ${newStatus}</h3>
              <p style="color: #4b5563; margin-bottom: 15px;">
                ${statusMessage}
              </p>
              <a href="${trackingUrl}" 
                 style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Full Details
              </a>
            </div>
            
            ${newStatus === 'Interview' ? `
              <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #065f46; margin-top: 0;">📅 Next Steps</h4>
                <p style="color: #065f46; margin-bottom: 0;">
                  Our team will contact you soon to schedule your interview. 
                  Please keep an eye on your email for further communication.
                </p>
              </div>
            ` : ''}
            
            ${newStatus === 'Offer' ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">🎉 Congratulations!</h4>
                <p style="color: #92400e; margin-bottom: 0;">
                  We're excited to extend an offer to you. Our team will contact you 
                  with all the details about the position and next steps.
                </p>
              </div>
            ` : ''}
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-top: 0;">💡 Want Full Access?</h4>
              <p style="color: #92400e; margin-bottom: 10px;">
                Create an account to get full visibility into all your applications, 
                save jobs, and receive personalized job recommendations.
              </p>
              <a href="${frontendUrl}/auth/signup" 
                 style="color: #3B82F6; text-decoration: none; font-weight: bold;">
                Create Account →
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              If you have any questions about this update, please don't hesitate to contact us.
            </p>
            
            <p style="color: #4b5563; margin-top: 30px;">
              Best regards,<br>
              The Recruitment Team
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };
  }
}

module.exports = new EmailService();
