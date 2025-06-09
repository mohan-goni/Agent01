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
// If no JS-based auth is configured here, this file might be largely empty or removed.

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
