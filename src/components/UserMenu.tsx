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
  const [userRole, setUserRole] = useState<string>('user');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);

      if (user) {
        // Check if Super Admin
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_super_admin, role')
          .eq('id', user.id)
          .single();

        if (profile?.is_super_admin) {
          setIsSuperAdmin(true);
          setUserRole('super_admin');
        } else if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);

      if (session?.user) {
        // Check if Super Admin
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_super_admin, role')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_super_admin) {
          setIsSuperAdmin(true);
          setUserRole('super_admin');
        } else if (profile?.role) {
          setUserRole(profile.role);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    console.log('🔓 Logging out...');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Failed to logout: ' + error.message);
        setLoading(false);
      } else {
        console.log('✅ Logged out successfully');
        // Force reload after successful logout to clear all state
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch (err) {
      console.error('Logout exception:', err);
      alert('Failed to logout');
      setLoading(false);
    }
  };

  if (!user) return null;

  const isAnonymous = user.is_anonymous;
  const userEmail = user.email || 'Guest User';
  const userName = user.user_metadata?.full_name || userEmail.split('@')[0];

  // Format role for display
  const getRoleDisplay = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (userRole === 'primary_admin') return 'Primary Admin';
    if (userRole === 'secondary_admin') return 'Secondary Admin';
    if (userRole === 'user') return 'User';
    return 'User';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{userName} - {getRoleDisplay()}</span>
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
