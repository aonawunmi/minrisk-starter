import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Users, FileText, Shield, AlertTriangle, Check, X, UserCheck, UserX } from 'lucide-react';

type UserData = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'edit' | 'view_only';
  status: 'pending' | 'approved' | 'rejected';
  organization_id: string;
  risk_count: number;
  control_count: number;
  created_at: string;
  approved_at: string | null;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRisks: 0,
    totalControls: 0,
    pendingUsers: 0,
  });

  const loadAdminData = async () => {
    setLoading(true);
    console.log('📊 Loading admin dashboard data...');

    try {
      // Get all users from the admin view (includes emails)
      const { data: adminUsers, error: usersError } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        return;
      }

      const userData: UserData[] = adminUsers?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        organization_id: user.organization_id,
        risk_count: user.risk_count || 0,
        control_count: user.control_count || 0,
        created_at: user.created_at,
        approved_at: user.approved_at,
      })) || [];

      setUsers(userData);

      // Calculate stats
      const { data: risks } = await supabase.from('risks').select('id');
      const { data: controls } = await supabase.from('controls').select('id');

      setStats({
        totalUsers: userData.length,
        totalRisks: risks?.length || 0,
        totalControls: controls?.length || 0,
        pendingUsers: userData.filter(u => u.status === 'pending').length,
      });

      console.log('✅ Admin data loaded:', userData.length, 'users');
    } catch (error) {
      console.error('❌ Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, role: 'admin' | 'edit' | 'view_only') => {
    try {
      const { error } = await supabase.rpc('approve_user', {
        target_user_id: userId,
        new_role: role,
      });

      if (error) throw error;

      console.log('✅ User approved:', userId);
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Failed to approve user:', error);
      alert('Failed to approve user: ' + error.message);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('reject_user', {
        target_user_id: userId,
      });

      if (error) throw error;

      console.log('✅ User rejected:', userId);
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Failed to reject user:', error);
      alert('Failed to reject user: ' + error.message);
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
              {stats.pendingUsers} pending approval
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
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Role</th>
                  <th className="text-right p-2 font-medium">Risks</th>
                  <th className="text-right p-2 font-medium">Controls</th>
                  <th className="text-left p-2 font-medium">Created</th>
                  <th className="text-center p-2 font-medium">Actions</th>
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
                          user.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status === 'pending' && '⏳ '}
                        {user.status === 'approved' && '✓ '}
                        {user.status === 'rejected' && '✗ '}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'edit' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'view_only' ? 'View Only' : user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-right font-medium">{user.risk_count}</td>
                    <td className="p-2 text-right font-medium">{user.control_count}</td>
                    <td className="p-2 text-gray-600 text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      {user.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <Select
                            onValueChange={(role) => approveUser(user.id, role as any)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Approve as..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view_only">View Only</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectUser(user.id)}
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-500">
                          {user.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                        </div>
                      )}
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
