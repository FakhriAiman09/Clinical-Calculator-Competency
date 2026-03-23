"use server";

import nodemailer from 'nodemailer';

export interface SendReminderEmailPayload {
  to: string;
  studentName: string;
  requestId: string;
  thresholdHours: number;
  facultyName?: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendReminderEmail({
  to,
  studentName,
  requestId,
  thresholdHours,
  facultyName,
}: SendReminderEmailPayload): Promise<{ message: string; id: string }> {
  const transporter = createTransporter();

  try {
    const formPath = `/dashboard/rater/form?id=${requestId}`;
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL}/login?redirectTo=${formPath}`;
    const greetingName = facultyName?.trim() ? facultyName : 'Faculty';

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to,
      subject: 'Reminder: Pending Assessment',
      html: `
        <p>Hi ${greetingName},</p>
        <p>This is a reminder that an assessment request for ${studentName} is still pending.</p>
        <p>
          The assessment has not been completed within ${thresholdHours} hours.<br/>
          Please complete the form here:<br/>
          <a href="${loginLink}">${process.env.NEXT_PUBLIC_SITE_URL}${formPath}</a>
        </p>
        <p>Regards,<br/>Clinical Competency Calculator</p>
      `,
    });

    return { message: 'Faculty reminder email sent', id: info.messageId };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || 'Error sending faculty reminder email');
    }
    throw new Error('Error sending faculty reminder email');
  }
}
