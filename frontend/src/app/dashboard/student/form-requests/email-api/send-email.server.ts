"use server";

import nodemailer from 'nodemailer';

export interface SendEmailPayload {
  to: string;
  studentName: string;
}


/**
  @param payload
  @returns
 **/
export async function sendEmail({
  to,
  studentName,
}: SendEmailPayload): Promise<{ message: string; id: string }> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  });

  try {
    console.log("Sending email to:", to);
    console.log("Using SMTP user:", process.env.SMTP_USER);

    const info = await transporter.sendMail({
      from: '"Clinical Competency Calculator" <clinicalcompetencycalculator@gmail.com>',
      to, 
      subject: 'Form Request',
      text: `You have been requested to fill out a form by ${studentName}`,
    });
    return { message: 'Email sent successfully', id: info.messageId };
  } 
  /*
  catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || 'Error sending email');
    }
    throw new Error('Error sending email');
  }*/

  catch (error: unknown) {
  console.error("EMAIL ERROR FULL:", error);

  if (error instanceof Error) {
    console.error("EMAIL ERROR MESSAGE:", error.message);
    console.error("EMAIL ERROR STACK:", error.stack);
    throw new Error(`Email failed: ${error.message}`);
  }

  throw new Error('Email failed: unknown error');
}

}
