"use server";

import nodemailer from 'nodemailer';

export interface SendResubmissionEmailPayload {
  to: string;
  raterName?: string;
  studentName: string;
  requestId: string;
  responseId?: string;
  flaggedReasons?: string[];
}

/**
 * Sends email to rater requesting form resubmission due to flagged content
 */
export async function sendResubmissionEmail({
  to,
  raterName,
  studentName,
  requestId,
  responseId,
  flaggedReasons,
}: SendResubmissionEmailPayload): Promise<{ message: string; id: string }> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const formParams = responseId ? `id=${requestId}&responseId=${responseId}` : `id=${requestId}`;
    const formPath = `/dashboard/rater/form?${formParams}`;
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL}/login?redirectTo=${formPath}`;

    const greeting = raterName ? `Dear ${raterName},` : 'Dear Rater,';
    const reasonsText = flaggedReasons && flaggedReasons.length > 0 
      ? `<ul>${flaggedReasons.map(r => `<li>${r}</li>`).join('')}</ul>` 
      : '';

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to,
      subject: `Resubmission Request: Assessment Form for ${studentName}`,
      html: `
        <p>${greeting}</p>
        <p>During our quality review of the assessment form you submitted for <strong>${studentName}</strong>, 
        we detected some issues with the evaluation comments that require attention.</p>
        ${reasonsText ? `<p><strong>Issues detected:</strong></p>${reasonsText}` : ''}
        <p>Please click the link below to review your evaluation and resubmit with more detailed and specific feedback:</p>
        <p>
        <a href="${loginLink}">Review and Resubmit Form</a>
        </p>
        <p>Thank you for your cooperation in maintaining the quality of our assessment process.</p>
        <p>Best regards,<br/>Clinical Competency Calculator Admin Team</p>
      `,
    });

    return { message: 'Resubmission email sent successfully', id: info.messageId };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || 'Error sending resubmission email');
    }
    throw new Error('Error sending resubmission email');
  }
}
