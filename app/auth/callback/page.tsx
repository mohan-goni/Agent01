"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error.message);
          router.push('/auth/login?error=Authentication+failed');
          return;
        }

        if (data.session) {
          // Successfully authenticated
          router.push('/dashboard');
        } else {
          // No session found
          router.push('/auth/login?error=No+session+found');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        router.push('/auth/login?error=Unexpected+error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Completing sign in...</h2>
        <p className="text-gray-300">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}