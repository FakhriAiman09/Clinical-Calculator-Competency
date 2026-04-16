import { beforeAll, beforeEach, describe, jest, test } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

type SentMail = {
  to: string;
  subject: string;
  html: string;
};

// Shared nodemailer mocks so tests can verify email payloads without sending real emails.
const sendMailMock = jest.fn<(mail: SentMail) => Promise<{ messageId: string }>>();
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: createTransportMock,
  },
}));

import { sendEmail as sendRequestEmail } from '@/app/dashboard/student/form-requests/email-api/send-email.server';
import { sendReminderEmail } from '@/app/dashboard/rater/form/rater-email-api/send-reminder-rater.server';
import { sendEmail as sendStudentCompletionEmail } from '@/app/dashboard/rater/form/rater-email-api/send-email-rater.server';
import { sendResubmissionEmail } from '@/app/dashboard/admin/all-reports/admin-email-api/send-email-admin.server';

type DbFixture = {
  raterEmail: string;
  studentEmail: string;
  studentName: string;
  requestId: string;
  responseId: string;
};

let dbFixture: DbFixture = {
  raterEmail: 'rater@test.com',
  studentEmail: 'student@test.com',
  studentName: 'Student',
  requestId: 'req-test',
  responseId: 'resp-test',
};

async function loadDbFixture(): Promise<DbFixture> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return dbFixture;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: requestRow } = await supabase
    .from('form_requests')
    .select('id, student_id, completed_by')
    .limit(1)
    .maybeSingle();

  if (!requestRow?.id) {
    return dbFixture;
  }

  const requestId = String(requestRow.id);

  const { data: responseRow } = await supabase
    .from('form_responses')
    .select('response_id')
    .eq('request_id', requestId)
    .limit(1)
    .maybeSingle();

  const responseId = responseRow?.response_id ? String(responseRow.response_id) : dbFixture.responseId;

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', String(requestRow.student_id))
    .limit(1)
    .maybeSingle();

  const studentName = (profileRow?.display_name && String(profileRow.display_name).trim()) || dbFixture.studentName;

  let raterEmail = dbFixture.raterEmail;
  let studentEmail = dbFixture.studentEmail;

  const { data: users } = await supabase.rpc('fetch_users');
  if (Array.isArray(users)) {
    const raterUser = users.find((user: { id?: string; email?: string }) => user.id === String(requestRow.completed_by));
    const studentUser = users.find((user: { id?: string; email?: string }) => user.id === String(requestRow.student_id));
    raterEmail = raterUser?.email ?? raterEmail;
    studentEmail = studentUser?.email ?? studentEmail;
  }

  return {
    raterEmail,
    studentEmail,
    studentName,
    requestId,
    responseId,
  };
}

// UI component that renders an email notification summary card from DB-backed fixture data.
// Represents what the admin/student sees in the UI about a pending or completed notification.
function EmailNotificationSummary({ fixture }: { fixture: DbFixture }) {
  return React.createElement(
    'section',
    null,
    React.createElement('h2', null, 'Email Notifications'),
    React.createElement(
      'ul',
      null,
      React.createElement(
        'li',
        { key: 'request' },
        React.createElement('span', { 'data-testid': 'notif-type' }, 'Form Request'),
        React.createElement('span', { 'data-testid': 'notif-to' }, ` → ${fixture.raterEmail}`)
      ),
      React.createElement(
        'li',
        { key: 'reminder' },
        React.createElement('span', { 'data-testid': 'notif-type-reminder' }, 'Reminder'),
        React.createElement('span', null, ` → ${fixture.raterEmail}`)
      ),
      React.createElement(
        'li',
        { key: 'completion' },
        React.createElement('span', { 'data-testid': 'notif-type-completion' }, 'Evaluation Completed'),
        React.createElement('span', null, ` → ${fixture.studentEmail}`)
      ),
      React.createElement(
        'li',
        { key: 'resubmission' },
        React.createElement('span', { 'data-testid': 'notif-type-resubmission' }, 'Resubmission Request'),
        React.createElement('span', null, ` → ${fixture.raterEmail}`)
      )
    ),
    React.createElement('p', { 'data-testid': 'notif-student' }, `Student: ${fixture.studentName}`),
    React.createElement('p', { 'data-testid': 'notif-request-id' }, `Request ID: ${fixture.requestId}`)
  );
}

describe('Functional email notification tests', () => {
  beforeAll(async () => {
    dbFixture = await loadDbFixture();
  });

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
      to: dbFixture.raterEmail,
      studentName: dbFixture.studentName,
      requestId: dbFixture.requestId,
    });

    expect(result).toEqual({ message: 'Email sent successfully', id: 'msg-123' });
    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  // Verifies request email content includes student info and correct links.
  test('request email contains the student name and rater form link', async () => {
    await sendRequestEmail({
      to: dbFixture.raterEmail,
      studentName: dbFixture.studentName,
      requestId: dbFixture.requestId,
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe(dbFixture.raterEmail);
    expect(mail.subject).toBe('Form Request');
    expect(mail.html).toContain(dbFixture.studentName);
    expect(mail.html).toContain(`/dashboard/rater/form?id=${dbFixture.requestId}`);
    expect(mail.html).toContain(`/login?redirectTo=/dashboard/rater/form?id=${dbFixture.requestId}`);
  });

  // Verifies reminder email is sent for incomplete assessments.
  test('sends reminder email for incomplete assessment', async () => {
    const result = await sendReminderEmail({
      to: dbFixture.raterEmail,
      studentName: dbFixture.studentName,
      requestId: dbFixture.requestId,
      thresholdHours: 48,
      facultyName: 'Dr. Tan',
    });

    expect(result).toEqual({ message: 'Faculty reminder email sent', id: 'msg-123' });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  // Verifies default greeting and threshold-hour details are included in reminder email.
  test('reminder email uses default Faculty greeting and includes threshold hours', async () => {
    await sendReminderEmail({
      to: dbFixture.raterEmail,
      studentName: dbFixture.studentName,
      requestId: dbFixture.requestId,
      thresholdHours: 72,
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.subject).toBe('Reminder: Pending Assessment');
    expect(mail.html).toContain('Dear Rater,');
    expect(mail.html).toContain('3 days');
    expect(mail.html).toContain(`/dashboard/rater/form?id=${dbFixture.requestId}`);
  });

  // Verifies completion email is sent to student with report page link.
  test('sends completion email to student with report link', async () => {
    const result = await sendStudentCompletionEmail({
      to: dbFixture.studentEmail,
      studentName: dbFixture.studentName,
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(result).toEqual({ message: 'Rater notification email sent', id: 'msg-123' });
    expect(mail.subject).toBe('Evaluation Completed');
    expect(mail.html).toContain(dbFixture.studentName);
    expect(mail.html).toContain('/dashboard/student/report');
  });

  // Verifies admin resubmission email includes flagged reasons and response-specific form link.
  test('sends admin resubmission email with flagged reasons and response-specific link', async () => {
    const result = await sendResubmissionEmail({
      to: dbFixture.raterEmail,
      studentName: dbFixture.studentName,
      requestId: dbFixture.requestId,
      responseId: dbFixture.responseId,
      flaggedReasons: ['Too vague', 'No clinical specifics'],
    });

    const mail = sendMailMock.mock.calls[0][0];
    expect(result).toEqual({ message: 'Resubmission email sent successfully', id: 'msg-123' });
    expect(mail.subject).toContain(dbFixture.studentName);
    expect(mail.html).toContain('Dear Rater,');
    expect(mail.html).toContain('<li>Too vague</li>');
    expect(mail.html).toContain('<li>No clinical specifics</li>');
    expect(mail.html).toContain(`/dashboard/rater/form?id=${dbFixture.requestId}&responseId=${dbFixture.responseId}`);
  });

  // Verifies the notification summary UI renders correctly with DB-backed fixture data.
  test('renders email notification summary UI with database-backed recipient and request data', () => {
    render(React.createElement(EmailNotificationSummary, { fixture: dbFixture }));

    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByTestId('notif-student')).toHaveTextContent(dbFixture.studentName);
    expect(screen.getByTestId('notif-request-id')).toHaveTextContent(dbFixture.requestId);
    expect(screen.getByTestId('notif-type')).toHaveTextContent('Form Request');
    expect(screen.getByTestId('notif-type-reminder')).toHaveTextContent('Reminder');
    expect(screen.getByTestId('notif-type-completion')).toHaveTextContent('Evaluation Completed');
    expect(screen.getByTestId('notif-type-resubmission')).toHaveTextContent('Resubmission Request');
    expect(screen.getAllByText(new RegExp(dbFixture.raterEmail)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(dbFixture.studentEmail)).length).toBeGreaterThan(0);
  });
});
