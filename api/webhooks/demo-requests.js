/**
 * Vercel API Route: Handle Supabase webhook for new demo requests
  *
   * This function is triggered when a new row is inserted into the demo_requests table.
    * It sends an email to the admin (vickymartin9191@gmail.com) with the demo request details
     * and optionally sends a confirmation email to the lead.
      *
       * Environment variables required:
        * - RESEND_API_KEY: API key for Resend email service
         */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
          // Extract webhook payload from Supabase
          const { type, record } = req.body;

                // Only process INSERT events
                if (type !== 'INSERT') {
                  return res.status(200).json({ message: 'Ignoring non-INSERT event' });
          }

          // Extract lead information
          const { id, first_name, clinic_name, email, phone, city, created_at } = record;

          // Format the data for the email
          const demoRequestDate = new Date(created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
          });

          // 1. Send notification email to admin
          const adminEmailResult = await resend.emails.send({
                  from: 'Voicely <noreply@voicely.digital>',
                  to: 'vickymartin9191@gmail.com',
                  subject: `🎯 New Demo Request from ${clinic_name || first_name}`,
                  html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
                              <h2 style="color: #0A0F2C; margin-bottom: 24px;">New Demo Request</h2>

                              <div style="background-color: #F8F9FC; border-left: 4px solid #2563EB; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                                <p style="margin: 0 0 12px 0;"><strong>Clinic Name:</strong> ${clinic_name || 'N/A'}</p>
                                              <p style="margin: 0 0 12px 0;"><strong>Contact Name:</strong> ${first_name}</p>
                                                            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email}</a></p>
                                                                          <p style="margin: 0 0 12px 0;"><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                                                                                        <p style="margin: 0 0 0 0;"><strong>Location:</strong> ${city || 'Not provided'}</p>
                                                                                                    </div>

                                                                                                    <p style="color: #6B7280; font-size: 13px; margin: 0;">Submitted on ${demoRequestDate}</p>

                                                                                                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
                                                                                                      <p style="color: #6B7280; font-size: 13px; margin: 0;">
                                                                                                        This is an automated notification from Voicely. <br>
                                                                                                        Reply to ${email} to follow up with this prospect.
                                                                                                      </p>
                                                                                                    </div>
                                                                                                  </div>
                                                                                                `,
                                                                                                text: `New Demo Request\n\nClinic: ${clinic_name || 'N/A'}\nContact: ${first_name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nCity: ${city || 'N/A'}\n\nSubmitted on ${demoRequestDate}`,
          });

          if (adminEmailResult.error) {
                  console.error('Failed to send admin email:', adminEmailResult.error);
                  return res.status(500).json({
                            error: 'Failed to send admin notification',
                            details: adminEmailResult.error
                  });
          }

          // 2. Send confirmation email to the lead (optional)
          const confirmationEmailResult = await resend.emails.send({
                  from: 'Voicely <hello@voicely.digital>',
                  to: email,
                  subject: 'Your Voicely Demo Request is Confirmed ✓',
                  html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
                              <h2 style="color: #0A0F2C; margin-bottom: 24px;">Demo Request Confirmed</h2>

                              <p style="margin-bottom: 16px;">Hi ${first_name},</p>

                              <p style="margin-bottom: 16px; line-height: 1.6;">
                                Thank you for your interest in Voicely! We've received your demo request for <strong>${clinic_name || 'your practice'}</strong>.
                              </p>

                              <p style="margin-bottom: 16px; line-height: 1.6;">
                                Our team will reach out to you within <strong>1 business day</strong> to schedule your personalized demo.
                              </p>

                              <div style="background-color: #F8F9FC; padding: 16px; margin: 24px 0; border-radius: 8px; border-left: 4px solid #2563EB;">
                                <p style="margin: 0; color: #6B7280; font-size: 13px;"><strong>What to expect:</strong></p>
                                <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #6B7280;">
                                  <li style="margin: 8px 0;">Live walkthrough of our AI receptionist</li>
                                  <li style="margin: 8px 0;">Demo of your smart website integration</li>
                                  <li style="margin: 8px 0;">Overview of CRM automation features</li>
                                  <li style="margin: 8px 0;">Answer your questions about implementation</li>
                                </ul>
                              </div>

                              <p style="margin-bottom: 16px; line-height: 1.6;">
                                In the meantime, feel free to <a href="https://voicely.digital" style="color: #2563EB; text-decoration: none;">learn more about Voicely</a> on our website.
                              </p>

                              <p style="margin-bottom: 0; color: #6B7280;">Best regards,<br>The Voicely Team</p>
                            </div>
                          `,
                          text: `Hi ${first_name},\n\nThank you for your interest in Voicely! We've received your demo request for ${clinic_name || 'your practice'}.\n\nOur team will reach out to you within 1 business day to schedule your personalized demo.\n\nBest regards,\nThe Voicely Team`,
          });

          if (confirmationEmailResult.error) {
                  console.error('Failed to send confirmation email:', confirmationEmailResult.error);
                  // Don't fail the webhook if confirmation email fails, but log it
          }

          // Return success response
          res.status(200).json({
                  success: true,
                  message: 'Emails sent successfully',
                  adminEmailId: adminEmailResult.data?.id,
                  confirmationEmailId: confirmationEmailResult.data?.id,
          });
    } catch (error) {
          console.error('Webhook error:', error);
          res.status(500).json({
                  error: 'Internal server error',
                  message: error.message,
          });
    }
}
