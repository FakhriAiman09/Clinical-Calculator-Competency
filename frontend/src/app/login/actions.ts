'use server';

import { createClient } from '@/utils/supabase/server';
import { AuthError } from '@supabase/supabase-js';

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
