"use server";

import nodemailer from 'nodemailer';

export interface SendReminderEmailPayload {
  to: string;
  studentName?: string;
  requestId?: string;
  thresholdHours?: number;
  facultyName?: string;
}

export async function sendReminderEmail({
  to,
  studentName,
  requestId,
  thresholdHours = 96,
  facultyName,
}: SendReminderEmailPayload): Promise<{ message: string; id: string }> {
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
    const formPath = requestId ? `/dashboard/rater/form?id=${requestId}` : `/dashboard/rater`;
    const formLink = `${process.env.NEXT_PUBLIC_SITE_URL}${formPath}`;
    const greeting = facultyName ? `Dear ${facultyName},` : 'Dear Rater,';
    const ageInDays = Math.round(thresholdHours / 24);
    const forWhom = studentName
      ? `for <strong>${studentName}</strong>`
      : 'for one or more students';

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to,
      subject: 'Reminder: Pending Assessment',
      html: `
        <p>${greeting}</p>
        <p>This is a reminder that an assessment request ${forWhom} is still pending and has been open for more than ${ageInDays} days.</p>
        <p>
          Please complete the evaluation here:<br/>
          <a href="${formLink}">${formLink}</a>
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
