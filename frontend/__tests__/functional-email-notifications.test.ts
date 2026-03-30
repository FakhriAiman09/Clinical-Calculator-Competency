import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Shared nodemailer mocks so tests can verify email payloads without sending real emails.
const sendMailMock = jest.fn();
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: createTransportMock,
  },
}));

import { sendEmail as sendRequestEmail } from '../src/app/dashboard/student/form-requests/email-api/send-email.server';
import { sendReminderEmail } from '../src/app/dashboard/rater/form/rater-email-api/send-reminder-rater.server';
import { sendEmail as sendStudentCompletionEmail } from '../src/app/dashboard/rater/form/rater-email-api/send-email-rater.server';
import { sendResubmissionEmail } from '../src/app/dashboard/admin/all-reports/admin-email-api/send-email-admin.server';

describe('Functional email notification tests', () => {
  // Reset mocks and provide required env vars before every test.
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_USER = 'smtp-user@test.com';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    sendMailMock.mockResolvedValue({ messageId: 'msg-123' });
  });

  // Verifies request email is sent when a student creates a form request.
  test('sends request email to rater after student creates a request', async () => {
    const result = await sendRequestEmail({
      to: 'rater@test.com',
      studentName: 'John Student',
      requestId: 'req-123',
    });

    expect(result).toEqual({ message: 'Email sent successfully', id: 'msg-123' });
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  // Verifies request email content includes student info and correct links.
  test('request email contains the student name and rater form link', async () => {
    await sendRequestEmail({
      to: 'rater@test.com',
      studentName: 'Jane Student',
      requestId: 'req-456',
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('rater@test.com');
    expect(mail.subject).toBe('Form Request');
    expect(mail.html).toContain('Jane Student');
    expect(mail.html).toContain('/dashboard/rater/form?id=req-456');
    expect(mail.html).toContain('/login?redirectTo=/dashboard/rater/form?id=req-456');
  });

  // Verifies reminder email is sent for incomplete assessments.
  test('sends reminder email for incomplete assessment', async () => {
    const result = await sendReminderEmail({
      to: 'faculty@test.com',
      studentName: 'Ali Student',
      requestId: 'req-789',
      thresholdHours: 48,
      facultyName: 'Dr. Tan',
    });

    expect(result).toEqual({ message: 'Faculty reminder email sent', id: 'msg-123' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  // Verifies default greeting and threshold-hour details are included in reminder email.
  test('reminder email uses default Faculty greeting and includes threshold hours', async () => {
    await sendReminderEmail({
      to: 'faculty@test.com',
      studentName: 'Ali Student',
      requestId: 'req-789',
      thresholdHours: 72,
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.subject).toBe('Reminder: Pending Assessment');
    expect(mail.html).toContain('Hi Faculty,');
    expect(mail.html).toContain('72 hours');
    expect(mail.html).toContain('/dashboard/rater/form?id=req-789');
  });

  // Verifies completion email is sent to student with report page link.
  test('sends completion email to student with report link', async () => {
    const result = await sendStudentCompletionEmail({
      to: 'student@test.com',
      studentName: 'Nur Student',
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(result).toEqual({ message: 'Rater notification email sent', id: 'msg-123' });
    expect(mail.subject).toBe('Evaluation Completed');
    expect(mail.html).toContain('Nur Student');
    expect(mail.html).toContain('/dashboard/student/report');
  });

  // Verifies admin resubmission email includes flagged reasons and response-specific form link.
  test('sends admin resubmission email with flagged reasons and response-specific link', async () => {
    const result = await sendResubmissionEmail({
      to: 'rater@test.com',
      studentName: 'Aina Student',
      requestId: 'req-200',
      responseId: 'resp-300',
      flaggedReasons: ['Too vague', 'No clinical specifics'],
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(result).toEqual({ message: 'Resubmission email sent successfully', id: 'msg-123' });
    expect(mail.subject).toContain('Aina Student');
    expect(mail.html).toContain('Dear Rater,');
    expect(mail.html).toContain('<li>Too vague</li>');
    expect(mail.html).toContain('<li>No clinical specifics</li>');
    expect(mail.html).toContain('/dashboard/rater/form?id=req-200&responseId=resp-300');
  });
});
