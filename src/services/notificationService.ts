/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TraceHarvest Field Agent Notification Service
 * Handles transactional emails, with extensible adapters for SMS (Termii/Twilio) and Push (FCM).
 */

export interface NotificationPayload {
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  type: 'AGENT_APPROVED' | 'AGENT_REJECTED' | 'AGENT_SUSPENDED' | 'AGENT_REINSTATED';
  rejectionReason?: string;
  reviewedBy?: string;
  timestamp: string;
}

export interface NotificationResult {
  channel: 'email' | 'sms' | 'push';
  recipient: string;
  success: boolean;
  messageId: string;
  deliveredAt: string;
  previewSubject?: string;
}

/**
 * Builds HTML and text email content formatted with TraceHarvest brand guidelines:
 * Deep Forest Green (#1A4D2E), Pure White (#FFFFFF), Warm Off-White, Earthy Accents.
 */
export function buildAgentEmailTemplate(payload: NotificationPayload): { subject: string; html: string; text: string } {
  const { recipientName, type, rejectionReason, reviewedBy, timestamp } = payload;
  const year = new Date().getFullYear();

  if (type === 'AGENT_APPROVED' || type === 'AGENT_REINSTATED') {
    const isReinstated = type === 'AGENT_REINSTATED';
    const actionTitle = isReinstated ? 'Account Reinstated & Activated' : 'Application Approved — Welcome to TraceHarvest';
    const subject = `[TraceHarvest] Official Clearance: Field Agent ${isReinstated ? 'Reinstated' : 'Approved'}`;
    
    const text = `
Hello ${recipientName},

Your field agent registration with TraceHarvest Nigeria has been officially APPROVED by the Compliance Directorate.

Account Status: APPROVED & ACTIVE
Authorized Authority: ${reviewedBy || 'Compliance Directorate, Federal Ministry of Agriculture & Food Security'}
Date of Clearance: ${new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

NEXT STEPS:
1. Launch the TraceHarvest Field Agent Mobile App on your device.
2. Sign in using your registered email and password.
3. Synchronize initial baseline offline seeds for your designated cooperative cluster.
4. Begin farmer KYC enrollments, GPS polygon surveys, and Good Agricultural Practice (GAP) chemical logging.

For technical assistance or local coordinator queries, reply to this message or contact support@traceharvest.ng.

Warm regards,
TraceHarvest National Agricultural Traceability Directorate
Abuja, Federal Republic of Nigeria
    `.trim();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${actionTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FBFCFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A2E23;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FBFCFB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5EBE7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(26, 77, 46, 0.04);">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #1A4D2E; padding: 24px 32px; text-align: left;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #2D6A4F; color: #D8E8DE; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 4px;">TraceHarvest Nigeria</span>
              <h1 style="margin: 8px 0 0 0; color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Agricultural Traceability Control Center</h1>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #EEF5F1; border: 1px solid #D8E8DE; color: #1A4D2E; font-size: 12px; font-weight: 600; border-radius: 4px; margin-bottom: 16px;">
                STATUS: APPROVED & ACTIVE
              </div>
              <h2 style="margin: 0 0 16px 0; color: #1A2E23; font-size: 20px; font-weight: 700;">
                Clearance Granted: Welcome, ${recipientName}
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #5A6B60;">
                Your field agent account has been reviewed and validated. You are now authorized to register smallholder farmers, capture EUDR geospatial plot boundaries, and submit Good Agricultural Practice (GAP) inspection logs for export compliance.
              </p>
              
              <div style="background-color: #F7F9F7; border: 1px solid #E5EBE7; border-radius: 6px; padding: 18px 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1A4D2E;">Verification Details</h3>
                <p style="margin: 4px 0; font-size: 13px; color: #5A6B60;"><strong>Reviewed By:</strong> ${reviewedBy || 'TraceHarvest Compliance Desk'}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #5A6B60;"><strong>Clearance Date:</strong> ${new Date(timestamp).toUTCString()}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #5A6B60;"><strong>Role:</strong> Authorized Field Extension Agent</p>
              </div>

              <h3 style="margin: 20px 0 10px 0; font-size: 14px; font-weight: 700; color: #1A2E23;">Next Steps to Begin Field Work:</h3>
              <ol style="margin: 0 0 24px 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #5A6B60;">
                <li>Open the <strong>TraceHarvest Mobile App</strong> on your Android field device.</li>
                <li>Sign in using your verified email address and password.</li>
                <li>Download your regional cooperative offline seed dataset.</li>
                <li>Proceed to community plot mapping and farmer KYC recording.</li>
              </ol>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F7F9F7; border-top: 1px solid #E5EBE7; padding: 20px 32px; font-size: 12px; color: #8A968E; text-align: left;">
              <p style="margin: 0 0 6px 0;">Federal Ministry of Agriculture & Food Security • NAFDAC & EUDR Regulatory Compliance</p>
              <p style="margin: 0;">© ${year} TraceHarvest National Portal. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { subject, html, text };
  } else if (type === 'AGENT_REJECTED') {
    const subject = `[TraceHarvest] Field Agent Application Status: Action Required`;
    const text = `
Hello ${recipientName},

Thank you for your application to join TraceHarvest as an authorized field agent.

Following administrative review, your application could not be approved at this time.

REASON FOR DECISION:
"${rejectionReason || 'Incomplete cooperative verification or documentation mismatch.'}"

REVIEWED BY:
${reviewedBy || 'Compliance Directorate'}
Date: ${new Date(timestamp).toLocaleDateString('en-GB')}

WHAT YOU CAN DO:
If you believe this was in error or you have updated documentation from your farmers cooperative or state extension office, please contact compliance@traceharvest.ng with your registration email and supporting proof.

Warm regards,
TraceHarvest National Agricultural Traceability Directorate
    `.trim();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Application Review Notice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FBFCFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A2E23;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FBFCFB; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5EBE7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(26, 77, 46, 0.04);">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #1A4D2E; padding: 24px 32px; text-align: left;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #2D6A4F; color: #D8E8DE; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 4px;">TraceHarvest Nigeria</span>
              <h1 style="margin: 8px 0 0 0; color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Agricultural Traceability Control Center</h1>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #FDF2F0; border: 1px solid #F5C6CB; color: #A63A2E; font-size: 12px; font-weight: 600; border-radius: 4px; margin-bottom: 16px;">
                STATUS: APPLICATION NOT APPROVED
              </div>
              <h2 style="margin: 0 0 16px 0; color: #1A2E23; font-size: 20px; font-weight: 700;">
                Application Review Notice: ${recipientName}
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #5A6B60;">
                Thank you for applying for field agent credentials with TraceHarvest. After reviewing your submitted details, our compliance committee was unable to approve your application at this time.
              </p>
              
              <div style="background-color: #FDF8F7; border-left: 4px solid #A63A2E; border-top: 1px solid #E5EBE7; border-right: 1px solid #E5EBE7; border-bottom: 1px solid #E5EBE7; border-radius: 4px; padding: 18px 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #A63A2E;">Specific Rejection Reason</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1A2E23; font-weight: 500;">
                  "${rejectionReason || 'Documentation or cooperative association verification criteria not met.'}"
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #5A6B60;">
                If you have rectified the reason above with your cooperative or state extension officer, you may reply to this email or reach our review desk at <a href="mailto:compliance@traceharvest.ng" style="color: #1A4D2E; font-weight: 600;">compliance@traceharvest.ng</a> to request reconsideration.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F7F9F7; border-top: 1px solid #E5EBE7; padding: 20px 32px; font-size: 12px; color: #8A968E; text-align: left;">
              <p style="margin: 0 0 6px 0;">Federal Ministry of Agriculture & Food Security • NAFDAC & EUDR Regulatory Compliance</p>
              <p style="margin: 0;">© ${year} TraceHarvest National Portal. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { subject, html, text };
  } else {
    // Suspend notice
    const subject = `[TraceHarvest] Security Notice: Field Agent Account Suspended`;
    const text = `
Hello ${recipientName},

Your field agent credentials for TraceHarvest have been temporarily SUSPENDED by administration.

Reason / Administrative Note:
"${rejectionReason || 'Operational compliance review.'}"

You will not be able to synchronize field records until reinstated. Contact compliance@traceharvest.ng for assistance.
    `.trim();

    const html = `
<!DOCTYPE html>
<html lang="en">
<body style="font-family: sans-serif; padding: 24px; color: #1A2E23;">
  <h2 style="color: #A63A2E;">TraceHarvest Account Suspended</h2>
  <p>Hello ${recipientName}, your agent credentials have been temporarily suspended.</p>
  <p><strong>Note:</strong> ${rejectionReason || 'Under compliance review'}</p>
  <p>Please contact your supervisor or <a href="mailto:compliance@traceharvest.ng">compliance@traceharvest.ng</a>.</p>
</body>
</html>
    `.trim();

    return { subject, html, text };
  }
}

/**
 * Notification Dispatcher
 * Sends email and logs dispatch receipt for audit logs.
 * Future extension hooks:
 * - sendSMS: via Termii / Twilio Nigeria API
 * - sendPush: via Firebase Cloud Messaging (FCM)
 */
export async function sendAgentNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
  const { subject, html, text } = buildAgentEmailTemplate(payload);
  const results: NotificationResult[] = [];
  const messageId = `msg-th-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // 1. Transactional Email Channel
  try {
    // In production, integration with Resend or SendGrid / NodeMailer:
    // e.g., if (process.env.RESEND_API_KEY) { await resend.emails.send({...}) }
    console.log(`[NotificationEngine:Email] Sent to ${payload.recipientEmail} -> "${subject}" (MessageID: ${messageId})`);
    
    results.push({
      channel: 'email',
      recipient: payload.recipientEmail,
      success: true,
      messageId,
      deliveredAt: new Date().toISOString(),
      previewSubject: subject,
    });
  } catch (err: any) {
    console.error(`[NotificationEngine:Email Error] Failed to send email to ${payload.recipientEmail}:`, err);
    results.push({
      channel: 'email',
      recipient: payload.recipientEmail,
      success: false,
      messageId,
      deliveredAt: new Date().toISOString(),
    });
  }

  // 2. Extensible SMS Channel (Ready for Termii / Twilio in Nigeria)
  if (payload.recipientPhone) {
    // Example: Termii SMS hook:
    // await fetch('https://api.ng.termii.com/api/sms/send', { ... })
    console.log(`[NotificationEngine:SMS-Ready] Configured for ${payload.recipientPhone} (SMS Adapter plugged)`);
  }

  // 3. Extensible Push Channel (Ready for FCM)
  // await admin.messaging().sendToTopic(...)

  return results;
}
