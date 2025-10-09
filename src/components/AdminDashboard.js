import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, FileText, Shield, AlertTriangle, X, Archive, BookOpen, TrendingUp } from 'lucide-react';
import ArchiveManagement from './ArchiveManagement';
import AuditTrail from './AuditTrail';
import HelpTab from './HelpTab';
import { VarScaleConfig } from './VarScaleConfig';
export default function AdminDashboard({ config, showToast }) {
    const [users, setUsers] = useState([]);
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
            const userData = adminUsers?.map(user => ({
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
        }
        catch (error) {
            console.error('❌ Failed to load admin data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const approveUser = async (userId, role) => {
        try {
            const { error } = await supabase.rpc('approve_user', {
                target_user_id: userId,
                new_role: role,
            });
            if (error)
                throw error;
            console.log('✅ User approved:', userId);
            await loadAdminData();
        }
        catch (error) {
            console.error('❌ Failed to approve user:', error);
            alert('Failed to approve user: ' + error.message);
        }
    };
    const rejectUser = async (userId) => {
        try {
            const { error } = await supabase.rpc('reject_user', {
                target_user_id: userId,
            });
            if (error)
                throw error;
            console.log('✅ User rejected:', userId);
            await loadAdminData();
        }
        catch (error) {
            console.error('❌ Failed to reject user:', error);
            alert('Failed to reject user: ' + error.message);
        }
    };
    const changeUserRole = async (userId, newRole) => {
        try {
            const { error } = await supabase.rpc('change_user_role', {
                target_user_id: userId,
                new_role: newRole,
            });
            if (error)
                throw error;
            console.log('✅ User role changed:', userId, 'to', newRole);
            await loadAdminData();
        }
        catch (error) {
            console.error('❌ Failed to change user role:', error);
            alert('Failed to change user role: ' + error.message);
        }
    };
    const deleteUser = async (userId, userEmail) => {
        if (!confirm(`Are you sure you want to delete user ${userEmail}? This will delete all their risks and controls. This action cannot be undone.`)) {
            return;
        }
        try {
            const { error } = await supabase.rpc('delete_user', {
                target_user_id: userId,
            });
            if (error)
                throw error;
            console.log('✅ User deleted:', userId);
            await loadAdminData();
        }
        catch (error) {
            console.error('❌ Failed to delete user:', error);
            alert('Failed to delete user: ' + error.message);
        }
    };
    useEffect(() => {
        loadAdminData();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx(RefreshCw, { className: "h-8 w-8 animate-spin text-gray-400" }) }));
    }
    return (_jsxs(Tabs, { defaultValue: "users", className: "space-y-6", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-5 max-w-3xl", children: [_jsxs(TabsTrigger, { value: "users", children: [_jsx(Users, { className: "h-4 w-4 mr-2" }), "Users"] }), _jsxs(TabsTrigger, { value: "var_config", children: [_jsx(TrendingUp, { className: "h-4 w-4 mr-2" }), "VaR Config"] }), _jsxs(TabsTrigger, { value: "archive", children: [_jsx(Archive, { className: "h-4 w-4 mr-2" }), "Archive"] }), _jsxs(TabsTrigger, { value: "audit", children: [_jsx(FileText, { className: "h-4 w-4 mr-2" }), "Audit Trail"] }), _jsxs(TabsTrigger, { value: "help", children: [_jsx(BookOpen, { className: "h-4 w-4 mr-2" }), "Help"] })] }), _jsxs(TabsContent, { value: "users", className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-medium", children: "Total Users" }), _jsx(Users, { className: "h-4 w-4 text-gray-500" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalUsers }), _jsxs("p", { className: "text-xs text-gray-500", children: [stats.pendingUsers, " pending approval"] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-medium", children: "Total Risks" }), _jsx(AlertTriangle, { className: "h-4 w-4 text-gray-500" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalRisks }), _jsx("p", { className: "text-xs text-gray-500", children: "Across all users" })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-medium", children: "Total Controls" }), _jsx(Shield, { className: "h-4 w-4 text-gray-500" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalControls }), _jsx("p", { className: "text-xs text-gray-500", children: "Control measures" })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-medium", children: "Avg per User" }), _jsx(FileText, { className: "h-4 w-4 text-gray-500" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalUsers > 0 ? Math.round(stats.totalRisks / stats.totalUsers) : 0 }), _jsx("p", { className: "text-xs text-gray-500", children: "Risks per user" })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "All Users" }), _jsx(CardDescription, { children: "Manage and view all registered users" })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: loadAdminData, children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Refresh"] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left p-2 font-medium", children: "User" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Email" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Status" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Role" }), _jsx("th", { className: "text-right p-2 font-medium", children: "Risks" }), _jsx("th", { className: "text-right p-2 font-medium", children: "Controls" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Created" }), _jsx("th", { className: "text-center p-2 font-medium", children: "Actions" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "p-2", children: _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: user.full_name || user.email?.split('@')[0] || 'Anonymous' }), _jsxs("div", { className: "text-xs text-gray-500 font-mono", children: [user.id.slice(0, 8), "..."] })] }) }), _jsx("td", { className: "p-2 text-gray-600", children: user.email || _jsx("span", { className: "text-gray-400 italic", children: "No email" }) }), _jsx("td", { className: "p-2", children: _jsxs("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.status === 'pending'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : user.status === 'approved'
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : 'bg-red-100 text-red-800'}`, children: [user.status === 'pending' && '⏳ ', user.status === 'approved' && '✓ ', user.status === 'rejected' && '✗ ', user.status.charAt(0).toUpperCase() + user.status.slice(1)] }) }), _jsx("td", { className: "p-2", children: _jsx("span", { className: `text-xs font-medium px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                                        user.role === 'edit' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-gray-100 text-gray-800'}`, children: user.role === 'view_only' ? 'View Only' : user.role.toUpperCase() }) }), _jsx("td", { className: "p-2 text-right font-medium", children: user.risk_count }), _jsx("td", { className: "p-2 text-right font-medium", children: user.control_count }), _jsx("td", { className: "p-2 text-gray-600 text-xs", children: new Date(user.created_at).toLocaleDateString() }), _jsx("td", { className: "p-2", children: user.status === 'pending' ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsxs(Select, { onValueChange: (role) => approveUser(user.id, role), children: [_jsx(SelectTrigger, { className: "w-32 h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Approve as..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "view_only", children: "View Only" }), _jsx(SelectItem, { value: "edit", children: "Edit" }), _jsx(SelectItem, { value: "admin", children: "Admin" })] })] }), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => rejectUser(user.id), className: "h-8", children: _jsx(X, { className: "h-3 w-3" }) })] })) : user.status === 'approved' ? (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsxs(Select, { value: user.role, onValueChange: (role) => changeUserRole(user.id, role), children: [_jsx(SelectTrigger, { className: "w-32 h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Change role..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "view_only", children: "View Only" }), _jsx(SelectItem, { value: "edit", children: "Edit" }), _jsx(SelectItem, { value: "admin", children: "Admin" })] })] }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => deleteUser(user.id, user.email || 'Unknown'), className: "h-8 text-red-600 hover:text-red-700 hover:bg-red-50", title: "Delete user", children: _jsx(X, { className: "h-4 w-4" }) })] })) : (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500", children: "\u2717 Rejected" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => deleteUser(user.id, user.email || 'Unknown'), className: "h-8 text-red-600 hover:text-red-700 hover:bg-red-50", title: "Delete user", children: _jsx(X, { className: "h-4 w-4" }) })] })) })] }, user.id))) })] }), users.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No users found" }))] }) })] })] }), _jsx(TabsContent, { value: "archive", children: _jsx(ArchiveManagement, {}) }), _jsx(TabsContent, { value: "audit", children: _jsx(AuditTrail, {}) }), _jsx(TabsContent, { value: "var_config", children: _jsx(VarScaleConfig, { showToast: showToast, matrixSize: config.matrixSize }) }), _jsx(TabsContent, { value: "help", children: _jsx(HelpTab, {}) })] }));
}
