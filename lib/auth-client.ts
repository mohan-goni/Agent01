import { createAuthClient } from "better-auth/react";

// Ensure NEXT_PUBLIC_APP_URL is set in your .env.local file
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: appUrl,
});

// You can also export specific methods if you prefer, for cleaner imports in components
export const { signIn, signUp, signOut, useSession, sendPasswordResetEmail, resetPassword } = authClient;
