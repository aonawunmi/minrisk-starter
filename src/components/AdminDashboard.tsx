import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { RefreshCw, Users, FileText, Shield, AlertTriangle } from 'lucide-react';

type UserData = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  organization_id: string;
  is_anonymous: boolean;
  risk_count: number;
  control_count: number;
  created_at: string;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRisks: 0,
    totalControls: 0,
    anonymousUsers: 0,
  });

  const loadAdminData = async () => {
    setLoading(true);
    console.log('📊 Loading admin dashboard data...');

    try {
      // Get all user profiles with their risk counts
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      // Note: We can't use admin.listUsers() without service role key
      // Instead, we'll query the auth.users view if accessible, or just show profile data

      // Get all risks with counts per user
      const { data: risks } = await supabase
        .from('risks')
        .select('user_id, id');

      // Get all controls count
      const { data: controls } = await supabase
        .from('controls')
        .select('id');

      // Count risks per user
      const riskCounts = new Map<string, number>();
      risks?.forEach(risk => {
        riskCounts.set(risk.user_id, (riskCounts.get(risk.user_id) || 0) + 1);
      });

      // Count controls per user (via risks)
      const controlCountsPerUser = new Map<string, number>();
      const { data: risksWithControls } = await supabase
        .from('risks')
        .select('user_id, controls(id)');

      risksWithControls?.forEach((risk: any) => {
        const count = risk.controls?.length || 0;
        controlCountsPerUser.set(
          risk.user_id,
          (controlCountsPerUser.get(risk.user_id) || 0) + count
        );
      });

      // Combine data - for now we'll just show profile data
      // To get emails, you'd need to set up a server-side function with service role key
      const userData: UserData[] = profiles?.map(profile => {
        return {
          id: profile.id,
          email: null, // Would need admin API access
          full_name: profile.full_name,
          role: profile.role,
          organization_id: profile.organization_id,
          is_anonymous: false, // Would need to check auth.users
          risk_count: riskCounts.get(profile.id) || 0,
          control_count: controlCountsPerUser.get(profile.id) || 0,
          created_at: profile.created_at,
        };
      }) || [];

      setUsers(userData);

      // Calculate stats
      setStats({
        totalUsers: userData.length,
        totalRisks: risks?.length || 0,
        totalControls: controls?.length || 0,
        anonymousUsers: userData.filter(u => u.is_anonymous).length,
      });

      console.log('✅ Admin data loaded:', userData.length, 'users');
    } catch (error) {
      console.error('❌ Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500">
              {stats.anonymousUsers} anonymous
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRisks}</div>
            <p className="text-xs text-gray-500">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalControls}</div>
            <p className="text-xs text-gray-500">
              Control measures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? Math.round(stats.totalRisks / stats.totalUsers) : 0}
            </div>
            <p className="text-xs text-gray-500">
              Risks per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage and view all registered users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAdminData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">User</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-right p-2 font-medium">Risks</th>
                  <th className="text-right p-2 font-medium">Controls</th>
                  <th className="text-left p-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">
                          {user.full_name || user.email?.split('@')[0] || 'Anonymous'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-gray-600">
                      {user.email || <span className="text-gray-400 italic">No email</span>}
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_anonymous
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.is_anonymous ? 'Guest' : 'Registered'}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600 capitalize">{user.role}</td>
                    <td className="p-2 text-right font-medium">{user.risk_count}</td>
                    <td className="p-2 text-right font-medium">{user.control_count}</td>
                    <td className="p-2 text-gray-600 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
