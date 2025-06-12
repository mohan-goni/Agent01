import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error.message);
      return NextResponse.redirect(new URL('/auth/login?error=Sign+out+failed', request.url));
    }

    return NextResponse.redirect(new URL('/auth/login?message=Signed+out+successfully', request.url));
  } catch (error) {
    console.error('Unexpected sign out error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=Unexpected+error', request.url));
  }
}