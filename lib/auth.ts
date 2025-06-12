import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export async function auth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Auth error:', error.message);
    return null;
  }

  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Get user error:', error.message);
    return null;
  }

  return user;
}

export async function getUserSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  
  return session;
}

export async function sendPasswordResetEmail({ email }: { email: string }) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      console.error('Error sending password reset email:', error.message);
      return { error: error.message };
    }

    return { data: { message: "Password reset email sent successfully." } };
  } catch (error) {
    console.error("Unexpected error sending password reset email:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function resetPasswordClient({ token, password }: { token: string; password: string }) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    
    if (error) {
      console.error("Error resetting password:", error);
      return { error: error.message };
    }
    
    return { data: { message: "Password reset successfully." } };
  } catch (error) {
    console.error("Unexpected error resetting password:", error);
    return { error: "An unexpected error occurred." };
  }
}