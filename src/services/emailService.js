const dotenv = require('dotenv');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
dotenv.config();

class EmailService {
  constructor() {
    this.mailgunClient = null;
    this.initializeMailgun();
  }

  initializeMailgun() {
    const driver = (process.env.MAIL_DRIVER || '').toLowerCase();
  
    if (driver !== 'mailgun') {
      console.warn('⚠️ MAIL_DRIVER is not set to mailgun — emails will log to console only.');
      return;
    }
  
    if (!process.env.MAILGUN_SECRET || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️ Mailgun credentials not found — emails will log to console only.');
      return;
    }
  
    const mg = new Mailgun(formData);
    this.mailgunClient = mg.client({
      username: 'api',
      key: process.env.MAILGUN_SECRET,
      url: process.env.MAILGUN_API_BASE
    });
  
    console.log('✅ Mailgun API initialized');
  }
  

  async sendEmail(to, subject, html, text = null) {
    try {
      const companyName = process.env.COMPANY_NAME;
      const platformUrl = process.env.FRONTEND_URL;
      const finalHtml = this.buildEmailHtml(html, companyName, platformUrl);
      const from = process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM;

      // MAILGUN via API
      if ((process.env.MAIL_DRIVER || '').toLowerCase() === 'mailgun' && this.mailgunClient) {
        if (!process.env.MAILGUN_DOMAIN) {
          console.log('Mailgun domain not set, falling back to console log');
        } else {
          const result = await this.mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
            from: `${process.env.MAIL_FROM_NAME} <${from}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: finalHtml,
            text: text || this.stripHtml(finalHtml),
          });
          console.log('Mailgun email sent:', result?.id || 'ok');
          return { success: true, messageId: result?.id || 'mailgun' };
        }
      }

      console.log('📧 EMAIL LOG (Mailgun not configured)');
console.log('To:', to);
console.log('Subject:', subject);
console.log('Message:', text || this.stripHtml(finalHtml));
console.log('---');
return { success: true, messageId: 'console-log' };
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
      const companyName = process.env.COMPANY_NAME || 'Company';
      const platformUrl = process.env.FRONTEND_URL || '#';
      const finalHtml = this.buildEmailHtml(html, companyName, platformUrl);
      const from = process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM;

      // MAILGUN with attachment
      if ((process.env.MAIL_DRIVER || '').toLowerCase() === 'mailgun' && this.mailgunClient) {
        if (!process.env.MAILGUN_DOMAIN) {
          console.log('Mailgun domain not set, falling back to console log');
        } else {
          const result = await this.mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, {
            from: `${process.env.MAIL_FROM_NAME || 'Notifications'} <${from}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: finalHtml,
            text: text || this.stripHtml(finalHtml),
            attachment: [{
              filename: 'invite.ics',
              data: Buffer.from(calendarInvite),
              contentType: 'text/calendar; method=REQUEST; charset=UTF-8'
            }]
          });
          console.log('Mailgun email with invite sent:', result?.id || 'ok');
          return { success: true, messageId: result?.id || 'mailgun' };
        }
      }

      console.log('📧 EMAIL WITH CALENDAR INVITE (Mailgun not configured):');
console.log('To:', to);
console.log('Subject:', subject);
console.log('Content:', text || this.stripHtml(html));
console.log('Calendar Invite:', calendarInvite.substring(0, 200) + '...');
console.log('---');
return { success: true, messageId: 'console-log' };

      
    } catch (error) {
      console.error('Failed to send email with calendar invite:', error);
      return { success: false, error: error.message };
    }
  }

  // Append standardized footer (auto-generated disclaimer, platform link, signature and delivered via)
  buildEmailHtml(originalHtml, companyName, platformUrl) {
    const footer = `
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px; line-height:1.6;">
        <p style="margin:0 0 8px 0;">
          This is an <strong>AUTO-GENERATED</strong> message. <strong>PLEASE DO NOT RESPOND (REPLY)</strong> as your response will not reach the desired individual.
        </p>
        <p style="margin:0 0 8px 0;">
          For queries, please visit the platform: <a href="${platformUrl}" style="color:#2563eb; text-decoration:none;">${platformUrl}</a>
        </p>
        <p style="margin:0 0 8px 0;">— Team ${companyName}</p>
        <p style="margin:8px 0 0 0; font-size:11px; color:#9ca3af;">Delivered via airec.io</p>
      </div>
    `;

    // If original HTML already contains closing container, just append footer before end
    try {
      if (typeof originalHtml === 'string' && originalHtml.includes('</div>')) {
        return originalHtml.replace(/<\/div>\s*<\/div>\s*$/i, (match) => `${footer}${match}`);
      }
    } catch {}

    return `${originalHtml}\n${footer}`;
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

  // Status update email for registered candidates (links to authenticated portal)
  generateStatusUpdateEmailForRegistered(candidateName, jobTitle, newStatus, applicationId, frontendUrl) {
    const linkUrl = `${frontendUrl}/candidate/applications/${applicationId}`;
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
              <a href="${linkUrl}" 
                 style="display: inline-block; background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View in Platform
              </a>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin-top: 30px;">
              You may be asked to log in to view the details.
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
