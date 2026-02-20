"use server";

import nodemailer from 'nodemailer';

export interface SendEmailPayload {
  to: string;
  studentName: string;
  requestId: string; // assessment form ID
}


/**
  @param payload
  @returns
 **/

  //sends email to rater when student submits form request
export async function sendEmail({
  to,
  studentName,
  requestId, // assessment form ID

}: SendEmailPayload): Promise<{ message: string; id: string }> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER ,
      pass: process.env.SMTP_PASS
    },
  });

  try {
    const formPath = `/dashboard/rater/form?id=${requestId}`;
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL}/login?redirectTo=${formPath}`;

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to, 
      subject: 'Form Request',
      html: `
            <p>You have been requested to fill out an assessment form by ${studentName}.</p>
            <p>
            Click here to open the form:<br/>
            <a href="${loginLink}">${process.env.NEXT_PUBLIC_SITE_URL}${formPath}</a>
            </p>
          `,
    });
    return { message: 'Email sent successfully', id: info.messageId };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || 'Error sending email');
    }
    throw new Error('Error sending email');
  }
}
