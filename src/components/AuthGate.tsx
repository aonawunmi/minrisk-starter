import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthScreen from './AuthScreen';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthGate: Checking session...');

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthGate: Session result:', session ? 'Logged in' : 'Not logged in');
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 AuthGate: Auth state changed:', _event, session ? 'Logged in' : 'Not logged in');
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
