import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RefreshCw, Users, FileText, Shield, AlertTriangle, Check, X, UserCheck, UserX, Archive, BookOpen, TrendingUp, Trash2, Loader2 } from 'lucide-react';
import { clearAllOrganizationData, clearRiskRegisterData } from '@/lib/admin';
import ArchiveManagement from './ArchiveManagement';
import AuditTrail from './AuditTrail';
import HelpTab from './HelpTab';
import { VarScaleConfig } from './VarScaleConfig';
import AppetiteConfigManager from './risk-appetite/AppetiteConfigManager';
import AppetiteDashboard from './risk-appetite/AppetiteDashboard';
import type { AppConfig } from '../App';

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

type AdminDashboardProps = {
  config: AppConfig;
  showToast: (message: string, type?: 'success' | 'error') => void;
};

export default function AdminDashboard({ config, showToast }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRisks: 0,
    totalControls: 0,
    pendingUsers: 0,
  });
  const [clearingAll, setClearingAll] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [clearingRisks, setClearingRisks] = useState(false);
  const [clearRisksMessage, setClearRisksMessage] = useState('');
  const [showClearRisksDialog, setShowClearRisksDialog] = useState(false);
  const [confirmRisksText, setConfirmRisksText] = useState('');

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

  const changeUserRole = async (userId: string, newRole: 'admin' | 'edit' | 'view_only') => {
    try {
      const { error } = await supabase.rpc('change_user_role', {
        target_user_id: userId,
        new_role: newRole,
      });

      if (error) throw error;

      console.log('✅ User role changed:', userId, 'to', newRole);
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Failed to change user role:', error);
      alert('Failed to change user role: ' + error.message);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will delete all their risks and controls. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user', {
        target_user_id: userId,
      });

      if (error) throw error;

      console.log('✅ User deleted:', userId);
      await loadAdminData();
    } catch (error: any) {
      console.error('❌ Failed to delete user:', error);
      alert('Failed to delete user: ' + error.message);
    }
  };

  const handleClearAllData = async () => {
    if (confirmText !== 'DELETE') {
      return; // Button should be disabled anyway
    }

    setShowClearDialog(false);
    setClearingAll(true);
    setClearMessage('Clearing all data...');

    const { success, deleted, error } = await clearAllOrganizationData();

    if (success) {
      setClearMessage(
        `Successfully cleared:\n• ${deleted.alerts} intelligence alerts\n• ${deleted.events} external events`
      );
      showToast(`Cleared ${deleted.alerts} alerts and ${deleted.events} events`, 'success');
    } else {
      const errorMsg = `Failed to clear data: ${error}`;
      setClearMessage(errorMsg);
      showToast(errorMsg, 'error');
    }

    setTimeout(() => {
      setClearMessage('');
      setConfirmText('');
    }, 10000); // Show message for 10 seconds

    setClearingAll(false);
  };

  const handleClearRiskRegister = async () => {
    if (confirmRisksText !== 'DELETE RISKS') {
      return;
    }

    setShowClearRisksDialog(false);
    setClearingRisks(true);
    setClearRisksMessage('Clearing risk register...');

    const { success, deleted, error } = await clearRiskRegisterData();

    if (success) {
      setClearRisksMessage(
        `Successfully cleared:\n• ${deleted.risks} risks\n• ${deleted.controls} controls\n• ${deleted.incidents} incidents\n• ${deleted.history} history records`
      );
      showToast(`Cleared ${deleted.risks} risks and ${deleted.history} history records`, 'success');
      await loadAdminData(); // Refresh stats
    } else {
      const errorMsg = `Failed to clear risk register: ${error}`;
      setClearRisksMessage(errorMsg);
      showToast(errorMsg, 'error');
    }

    setTimeout(() => {
      setClearRisksMessage('');
      setConfirmRisksText('');
    }, 10000);

    setClearingRisks(false);
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
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6 max-w-4xl">
        <TabsTrigger value="users">
          <Users className="h-4 w-4 mr-2" />
          Users
        </TabsTrigger>
        <TabsTrigger value="appetite">
          <Shield className="h-4 w-4 mr-2" />
          Risk Appetite
        </TabsTrigger>
        <TabsTrigger value="var_config">
          <TrendingUp className="h-4 w-4 mr-2" />
          VaR Config
        </TabsTrigger>
        <TabsTrigger value="archive">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </TabsTrigger>
        <TabsTrigger value="audit">
          <FileText className="h-4 w-4 mr-2" />
          Audit Trail
        </TabsTrigger>
        <TabsTrigger value="help">
          <BookOpen className="h-4 w-4 mr-2" />
          Help
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-6">
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

      {/* Danger Zone - Clear All Data */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Danger Zone - Intelligence Data</CardTitle>
          <CardDescription className="text-red-800">
            Clear all intelligence alerts and external events for your organization. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowClearDialog(true)}
            disabled={clearingAll}
          >
            {clearingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                CLEAR INTELLIGENCE DATA
              </>
            )}
          </Button>

          {clearMessage && (
            <div className="mt-4 p-3 bg-white border border-red-200 rounded-lg text-sm whitespace-pre-line">
              {clearMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Clear Risk Register */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Danger Zone - Risk Register</CardTitle>
          <CardDescription className="text-red-800">
            Clear all risks, controls, incidents, and My Risk History for your organization. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowClearRisksDialog(true)}
            disabled={clearingRisks}
          >
            {clearingRisks ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                CLEAR RISK REGISTER
              </>
            )}
          </Button>

          {clearRisksMessage && (
            <div className="mt-4 p-3 bg-white border border-red-200 rounded-lg text-sm whitespace-pre-line">
              {clearRisksMessage}
            </div>
          )}
        </CardContent>
      </Card>

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
                      ) : user.status === 'approved' ? (
                        <div className="flex items-center justify-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(role) => changeUserRole(user.id, role as any)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Change role..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view_only">View Only</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteUser(user.id, user.email || 'Unknown')}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete user"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-gray-500">✗ Rejected</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteUser(user.id, user.email || 'Unknown')}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete user"
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
      </TabsContent>

      <TabsContent value="appetite" className="space-y-6">
        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <AppetiteConfigManager config={config} showToast={showToast} />
          </TabsContent>

          <TabsContent value="dashboard">
            <AppetiteDashboard showToast={showToast} />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="archive">
        <ArchiveManagement />
      </TabsContent>

      <TabsContent value="audit">
        <AuditTrail />
      </TabsContent>

      <TabsContent value="var_config">
        <VarScaleConfig showToast={showToast} matrixSize={config.matrixSize} />
      </TabsContent>

      <TabsContent value="help">
        <HelpTab />
      </TabsContent>

      {/* Confirmation Dialog for Clear All */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ WARNING: Clear Intelligence Data</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside text-sm">
                <li>All intelligence alerts (pending, accepted, rejected)</li>
                <li>All external events</li>
              </ul>
              <p className="font-semibold text-red-600">
                This action CANNOT be undone and only affects data for your organization.
              </p>
              <p>Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm:</p>
            </DialogDescription>
          </DialogHeader>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="font-mono"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowClearDialog(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              disabled={confirmText !== 'DELETE'}
            >
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Clear Risk Register */}
      <Dialog open={showClearRisksDialog} onOpenChange={setShowClearRisksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ WARNING: Clear Risk Register</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>This will permanently delete:</p>
              <ul className="list-disc list-inside text-sm">
                <li>All risks</li>
                <li>All controls</li>
                <li>All incidents</li>
                <li>All My Risk History records</li>
              </ul>
              <p className="font-semibold text-red-600">
                This action CANNOT be undone and only affects data for your organization.
              </p>
              <p>Type <code className="bg-gray-100 px-1 rounded">DELETE RISKS</code> to confirm:</p>
            </DialogDescription>
          </DialogHeader>

          <Input
            value={confirmRisksText}
            onChange={(e) => setConfirmRisksText(e.target.value)}
            placeholder="Type DELETE RISKS to confirm"
            className="font-mono"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowClearRisksDialog(false);
                setConfirmRisksText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearRiskRegister}
              disabled={confirmRisksText !== 'DELETE RISKS'}
            >
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
