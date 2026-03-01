"use server";

import nodemailer from 'nodemailer';

export interface SendEmailPayload {
  to: string;
  studentName: string;
}

//sends email to student when rater completes evaluation
export async function sendEmail({ to, studentName }: SendEmailPayload): Promise<{ message: string; id: string }> {
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
    const reportPath = '/dashboard/student/report';
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL}/login?redirectTo=${reportPath}`;

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to,
      subject: 'Evaluation Completed',
      html: `
        <p>Hi ${studentName},</p>
        <p>The rater has completed the evaluation for you.</p>
        <p>
          You can view the results and generated reports here:<br/>
          <a href="${loginLink}">${process.env.NEXT_PUBLIC_SITE_URL}${reportPath}</a>
        </p>
        <p>Regards,<br/>Clinical Competency Calculator</p>
      `,
    });

    return { message: 'Rater notification email sent', id: info.messageId };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || 'Error sending rater notification email');
    }
    throw new Error('Error sending rater notification email');
  }
}
