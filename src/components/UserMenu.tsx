import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { User, LogOut, Mail } from 'lucide-react';

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    console.log('🔓 Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    } else {
      console.log('✅ Logged out successfully');
    }
    setLoading(false);
  };

  if (!user) return null;

  const isAnonymous = user.is_anonymous;
  const userEmail = user.email || 'Guest User';
  const userName = user.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{userName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">User Profile</h4>
            <div className="space-y-1">
              {!isAnonymous && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{userName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{userEmail}</span>
                  </div>
                </>
              )}
              {isAnonymous && (
                <div className="text-sm text-gray-500">
                  <p className="font-medium">Anonymous User</p>
                  <p className="text-xs mt-1">Your data is stored temporarily</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-gray-500 space-y-1">
              <p>User ID: <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span></p>
              <p>Session: {isAnonymous ? 'Guest' : 'Authenticated'}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={loading}
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
