"use client";

import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser extends User {
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    provider?: string;
  };
}

export interface AuthSession extends Session {
  user: AuthUser;
}

// Sign up with email and password
export async function signUp(email: string, password: string, fullName?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error('Sign up error:', error.message);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected sign up error:', error);
    return { error: 'An unexpected error occurred during sign up.' };
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error.message);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected sign in error:', error);
    return { error: 'An unexpected error occurred during sign in.' };
  }
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google sign in error:', error.message);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected Google sign in error:', error);
    return { error: 'An unexpected error occurred during Google sign in.' };
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected sign out error:', error);
    return { error: 'An unexpected error occurred during sign out.' };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected password reset error:', error);
    return { error: 'An unexpected error occurred while sending reset email.' };
  }
}

// Reset password
export async function resetPassword(password: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Password update error:', error.message);
      return { error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected password update error:', error);
    return { error: 'An unexpected error occurred while updating password.' };
  }
}

// Get current session
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Get session error:', error.message);
      return null;
    }

    return session as AuthSession;
  } catch (error) {
    console.error('Unexpected get session error:', error);
    return null;
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Get user error:', error.message);
      return null;
    }

    return user as AuthUser;
  } catch (error) {
    console.error('Unexpected get user error:', error);
    return null;
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session as AuthSession);
  });
}