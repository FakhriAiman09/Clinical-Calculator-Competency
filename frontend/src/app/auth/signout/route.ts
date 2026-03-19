import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Revoke the user's session (scope:'global' logs them out of every device)
  await supabase.auth.signOut({ scope: 'global' });

  // Revalidate cache
  revalidatePath('/', 'layout');

  // Use the incoming request's origin so this works on localhost, Vercel,
  // and any custom domain — no env var needed.
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/login`, { status: 302 });
}