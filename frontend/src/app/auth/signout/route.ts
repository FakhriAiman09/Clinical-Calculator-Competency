import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'; // prod: https://ccc.v9ys52xnm4vvw.us-east-1.cs.amazonlightsail.com

export async function POST() {
  const supabase = await createClient();

  // revoke the user’s session (scope:'global' logs them out of every device)
  await supabase.auth.signOut({ scope: 'global' });

  // revalidate cache if you need it
  revalidatePath('/', 'layout');

  // build an absolute redirect URL
  const redirectURL = `${BASE_URL}/login`;
  return NextResponse.redirect(redirectURL, { status: 302 });
}
