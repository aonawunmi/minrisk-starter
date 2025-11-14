import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthScreen from './AuthScreen';
import { SetPasswordPage } from './SetPasswordPage';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔐 AuthGate: Checking session...');

    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('🔐 AuthGate: Session check error:', error);
        setError('Failed to check authentication status. Please refresh the page.');
        setLoading(false);
        return;
      }

      console.log('🔐 AuthGate: Session result:', session ? 'Logged in' : 'Not logged in');

      if (session) {
        // Check if this is an invitation flow (user has metadata but may need password)
        const isInvitation = checkIfInvitationFlow();
        const hasPasswordSet = checkIfPasswordSet(session);

        console.log('🔐 AuthGate: Invitation flow:', isInvitation);
        console.log('🔐 AuthGate: Has password:', hasPasswordSet);

        // If it's an invitation and user hasn't set password yet, show password setup
        if (isInvitation && !hasPasswordSet) {
          setNeedsPasswordSetup(true);
        }
      }

      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 AuthGate: Auth state changed:', _event, session ? 'Logged in' : 'Not logged in');

      if (session && _event === 'INITIAL_SESSION') {
        // Check for invitation flow on initial session
        const isInvitation = checkIfInvitationFlow();
        const hasPasswordSet = checkIfPasswordSet(session);

        if (isInvitation && !hasPasswordSet) {
          setNeedsPasswordSetup(true);
        }
      }

      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if URL contains invitation-specific parameters
  const checkIfInvitationFlow = (): boolean => {
    const hash = window.location.hash;
    // Supabase invitation links contain type=invite in the hash
    return hash.includes('type=invite') || hash.includes('type=signup');
  };

  // Check if user has already set a password
  // In Supabase, users authenticated via magic link initially don't have a password
  // We detect this by checking if they're coming from an invite link
  const checkIfPasswordSet = (session: any): boolean => {
    // If user has user_metadata with invitation info, they need to set password
    const metadata = session?.user?.user_metadata;

    // For now, we assume if they have organization_id in metadata (from invitation),
    // they haven't set a password yet on first login
    // This will only be true on the FIRST time they click the invitation link
    if (metadata?.organization_id && !sessionStorage.getItem('password_setup_complete')) {
      return false;
    }

    return true;
  };

  const handlePasswordSet = () => {
    console.log('✅ Password set successfully, marking as complete');
    sessionStorage.setItem('password_setup_complete', 'true');
    setNeedsPasswordSetup(false);
    // Reload to trigger full app initialization
    window.location.href = '/';
  };

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // Show password setup page if needed
  if (needsPasswordSetup) {
    return (
      <SetPasswordPage
        onPasswordSet={handlePasswordSet}
        userEmail={session.user?.email || null}
        organizationName={session.user?.user_metadata?.organization_name || null}
      />
    );
  }

  return <>{children}</>;
}
