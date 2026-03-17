'use server';

import { createClient } from '@/utils/supabase/server';
import { AuthError } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export async function login(formData: FormData): Promise<{ alertColor: string; error: string }> {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  try {
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) throw error;

    return { alertColor: 'success', error: '' };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.code) {
        case 'invalid_credentials':
          return { alertColor: 'danger', error: 'Invalid email or password.' };
        case 'email_not_confirmed':
          return { alertColor: 'warning', error: 'Please verify your email. Check your spam folder.' };
        default:
          logger.error('[login] Auth error', { code: error.code, message: error.message });
          return { alertColor: 'danger', error: `${error.code}: ${error.message}` };
      }
    }
    return { alertColor: 'warning', error: 'Something went wrong.' };
  }
}

export async function signup(formData: FormData): Promise<{ alertColor: string; error: string }> {
  const supabase = await createClient();

  const signupData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  try {
    const { error } = await supabase.auth.signUp(signupData);
    if (error) throw error;

    return { alertColor: 'success', error: '' };
  } catch (error) {
    if (error instanceof AuthError) {
      return { alertColor: 'danger', error: `${error.code}: ${error.message}` };
    }
    return { alertColor: 'warning', error: 'Something went wrong.' };
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function forgotPassword(formData: FormData): Promise<{ alertColor: string; message: string }> {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return { alertColor: 'danger', message: 'Please enter a valid email address.' };
  }

  try {
    const redirectTo =
      (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/login?reset=true';

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;

    return {
      alertColor: 'success',
      message: 'Password reset email sent! Check your inbox (and spam folder).',
    };
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error('[forgotPassword] Auth error', { code: error.code, message: error.message });
      return { alertColor: 'danger', message: error.message };
    }
    return { alertColor: 'warning', message: 'Something went wrong. Please try again.' };
  }
}