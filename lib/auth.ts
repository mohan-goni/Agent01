// import { betterAuth } from "better-auth"
// import { prismaAdapter } from "better-auth/adapters/prisma"
// import { PrismaClient } from "@prisma/client"

// const prisma = new PrismaClient()

// export const auth = betterAuth({
//   database: prismaAdapter(prisma, {
//     provider: "postgresql",
//   }),
//   socialProviders: {
//     google: {
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//       redirectURI: process.env.GOOGLE_REDIRECT_URI!,
//     },
//   },
//   emailAndPassword: {
//     enabled: true,
//   },
//   session: {
//     expiresIn: 60 * 60 * 24 * 7, // 7 days
//   },
// })

// export type Session = typeof auth.$Infer.Session

// placeholder for auth if another auth system is intended
// For example, if using NextAuth.js, configuration would go here.
// If no JS-based auth is configured here.

import { supabase } from './supabaseClient'; // Assuming supabaseClient.ts is created

export async function getUserSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getUserSession();
  return session?.user ?? null;
}

export async function sendPasswordResetEmail({ email }: { email: string }) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      emailRedirectTo: `${window.location.origin}/auth/reset-password`,
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
    }, {
      redirectTo: `${window.location.origin}/auth/login`
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
