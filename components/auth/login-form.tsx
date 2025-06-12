"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function LoginForm() {
  const router = useRouter() // Added router
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // Added error state

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => { // Typed event
    e.preventDefault()
    setLoading(true)
    setError(null) // Clear previous errors

    try {
      console.log("Email:", email);
      console.log("Password:", password);
      console.log("Supabase signInWithPassword called with:", { email, password });
      console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error("Supabase sign-in error:", signInError);
        console.error("Supabase sign-in error message:", signInError.message);
      }

      if (signInError) {
        console.error("Login error:", signInError.message)
        if (signInError.message === "Invalid login credentials") {
          setError("Invalid email or password. Please double-check your credentials.");
        } else {
          setError(signInError.message);
        }
      } else if (data.session) {
        router.push("/dashboard") // Use router for navigation
        router.refresh(); // Refresh server components
      } else {
        // Should not happen if signInError is null and session is null, but as a fallback
        setError("An unexpected error occurred. Please try again.")
      }
    } catch (err: any) { // Catch any unexpected errors
      console.error("Unexpected login function error:", err)
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Market Intelligence account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="flex justify-between text-sm">
            <a href="/auth/signup" className="text-blue-500 hover:underline">
              Sign Up
            </a>
            <a href="/auth/forgot-password" className="text-blue-500 hover:underline">
              Forgot Password?
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
