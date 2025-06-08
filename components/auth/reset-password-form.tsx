"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation"; // Or get token via props
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { resetPassword as resetPasswordClient } from "@/lib/auth-client"; // Assuming exported from auth-client

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string || ""; // Extract token from URL

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await resetPasswordClient({ token, password });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Password has been reset successfully! You can now login with your new password.");
        // Optional: redirect to login after a delay
        setTimeout(() => router.push("/auth/login"), 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error && !success) { // Check if token is not available early, and no success/error message is already set
    setError("No reset token found. Please ensure you clicked the link from your email correctly.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" className="w-full" disabled={loading || !token || !!success}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
