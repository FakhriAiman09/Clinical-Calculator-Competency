import { beforeAll, beforeEach, describe, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { FormEvent, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient as createPublicClient } from '@supabase/supabase-js';

jest.mock('@/utils/supabase/server', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
	logger: {
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
	},
}));

import { createClient } from '@/utils/supabase/server';
import { forgotPassword } from '@/app/login/actions';

type DbFixture = {
	userId: string;
	email: string;
	displayName: string;
	source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
	userId: 'student-fallback-1',
	email: 'rfatihah89@gmail.com',
	displayName: 'Nur Fatihah',
	source: 'fallback',
};

async function loadDbFixture(): Promise<DbFixture> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) return dbFixture;

	const supabase = createPublicClient(supabaseUrl, supabaseKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	});

	const { data: profileRow } = await supabase
		.from('profiles')
		.select('id, display_name')
		.ilike('display_name', '%fatihah%')
		.limit(1)
		.maybeSingle();

	if (!profileRow?.id) return dbFixture;

	let email = dbFixture.email;
	const { data: users } = await supabase.rpc('fetch_users');
	if (Array.isArray(users)) {
		const user = users.find(
			(u: { user_id?: string; email?: string }) => u.user_id === String(profileRow.id)
		);
		email = user?.email ?? email;
	}

	return {
		userId: String(profileRow.id),
		email,
		displayName: String(profileRow.display_name ?? 'Nur Fatihah'),
		source: 'database',
	};
}

const resetPasswordForEmailMock = jest.fn(async () => ({ error: null }));
const updateUserMock = jest.fn(async (_payload: unknown) => ({ error: null }));
const createClientMock = createClient as jest.Mock;

function ForgotPasswordResetPanel() {
	const [email, setEmail] = useState(dbFixture.email);
	const [newPassword, setNewPassword] = useState('NewStrongPass123!');
	const [resetMsg, setResetMsg] = useState('');
	const [updateMsg, setUpdateMsg] = useState('');

	const onRequestReset = async (e: FormEvent) => {
		e.preventDefault();
		const fd = new FormData();
		fd.append('email', email);
		const result = await forgotPassword(fd);
		setResetMsg(result.message);
	};

	const onSetNewPassword = async (e: FormEvent) => {
		e.preventDefault();
		if (newPassword.length < 8) {
			setUpdateMsg('Password must be at least 8 characters.');
			return;
		}

		const supabase = await createClient();
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		setUpdateMsg(error ? error.message : 'Password updated successfully.');
	};

	return (
		<section>
			<h2>Forgot Password</h2>
			<p data-testid='fixture-source'>Fixture source: {dbFixture.source}</p>
			<p data-testid='fixture-user'>User: {dbFixture.displayName}</p>

			<form onSubmit={onRequestReset}>
				<label htmlFor='fp-email'>Email</label>
				<input
					id='fp-email'
					value={email}
					onChange={(ev) => setEmail(ev.target.value)}
					placeholder='Email'
				/>
				<button type='submit'>Send reset link</button>
			</form>

			<p data-testid='reset-msg'>{resetMsg}</p>

			<form onSubmit={onSetNewPassword}>
				<label htmlFor='new-password'>New password</label>
				<input
					id='new-password'
					type='password'
					value={newPassword}
					onChange={(ev) => setNewPassword(ev.target.value)}
					placeholder='New password'
				/>
				<button type='submit'>Set new password</button>
			</form>

			<p data-testid='update-msg'>{updateMsg}</p>
		</section>
	);
}

describe('Functional requirement: forgot password and reset to new password', () => {
	beforeAll(async () => {
		dbFixture = await loadDbFixture();
	});

	beforeEach(() => {
		jest.clearAllMocks();

		process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

		createClientMock.mockResolvedValue({
			auth: {
				resetPasswordForEmail: resetPasswordForEmailMock,
				updateUser: updateUserMock,
			},
		} as never);
	});

	test('sends reset password email for database-backed user email', async () => {
		const fd = new FormData();
		fd.append('email', dbFixture.email);

		const result = await forgotPassword(fd);

		expect(result.alertColor).toBe('success');
		expect(result.message).toContain('Password reset email sent');
		expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
			dbFixture.email,
			expect.objectContaining({
				redirectTo: expect.stringContaining('/login?reset=true'),
			})
		);
	});

	test('rejects invalid email before reset request', async () => {
		const fd = new FormData();
		fd.append('email', 'not-an-email');

		const result = await forgotPassword(fd);

		expect(result.alertColor).toBe('danger');
		expect(result.message).toBe('Please enter a valid email address.');
		expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
	});

	test('renders UI flow: request reset link then set a new password', async () => {
		render(<ForgotPasswordResetPanel />);

		expect(screen.getByText('Forgot Password')).toBeInTheDocument();
		expect(screen.getByTestId('fixture-user')).toHaveTextContent(dbFixture.displayName);

		fireEvent.change(screen.getByPlaceholderText('Email'), {
			target: { value: dbFixture.email },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

		await waitFor(() => {
			expect(screen.getByTestId('reset-msg')).toHaveTextContent('Password reset email sent');
			expect(resetPasswordForEmailMock).toHaveBeenCalledTimes(1);
		});

		fireEvent.change(screen.getByPlaceholderText('New password'), {
			target: { value: 'NewStrongPass123!' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

		await waitFor(() => {
			expect(updateUserMock).toHaveBeenCalledWith({ password: 'NewStrongPass123!' });
			expect(screen.getByTestId('update-msg')).toHaveTextContent('Password updated successfully.');
		});
	});
});
