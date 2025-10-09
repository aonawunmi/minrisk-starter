import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/ArchiveManagement.tsx
// Archive Management component for ADMIN
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Archive, Trash2, RefreshCw, AlertTriangle, Eye } from 'lucide-react';
import { loadArchivedRisks, loadArchivedControls, permanentDeleteArchivedRisk, } from '@/lib/archive';
import { supabase } from '@/lib/supabase';
export default function ArchiveManagement() {
    const [archivedRisks, setArchivedRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRisk, setSelectedRisk] = useState(null);
    const [controls, setControls] = useState([]);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [historyCount, setHistoryCount] = useState(0);
    const loadData = async () => {
        setLoading(true);
        try {
            const risks = await loadArchivedRisks();
            setArchivedRisks(risks);
            // Load risk_history count
            const { data: history } = await supabase.from('risk_history').select('id');
            setHistoryCount(history?.length || 0);
        }
        catch (error) {
            console.error('Error loading archived risks:', error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    const handleViewDetails = async (risk) => {
        setSelectedRisk(risk);
        const riskControls = await loadArchivedControls(risk.id);
        setControls(riskControls);
        setShowDetailsDialog(true);
    };
    const handleDeleteClick = (risk) => {
        setSelectedRisk(risk);
        setDeletePassword('');
        setDeleteError('');
        setShowDeleteDialog(true);
    };
    const handlePermanentDelete = async () => {
        if (!selectedRisk)
            return;
        if (!deletePassword) {
            setDeleteError('Password is required');
            return;
        }
        setDeleting(true);
        setDeleteError('');
        try {
            // Verify password
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                setDeleteError('User not authenticated');
                setDeleting(false);
                return;
            }
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: deletePassword,
            });
            if (signInError) {
                setDeleteError('Invalid password');
                setDeleting(false);
                return;
            }
            // Password verified, proceed with deletion
            const result = await permanentDeleteArchivedRisk(selectedRisk.id);
            if (!result.success) {
                setDeleteError(result.error || 'Failed to delete archived risk');
                setDeleting(false);
                return;
            }
            // Success
            setShowDeleteDialog(false);
            setDeletePassword('');
            await loadData();
        }
        catch (error) {
            setDeleteError(error.message || 'An error occurred');
        }
        finally {
            setDeleting(false);
        }
    };
    const handleBulkDeleteAllHistory = async () => {
        if (!confirm(`⚠️ ADMIN BULK DELETE - DELETE ALL COMMITTED PERIOD HISTORY?\n\nThis will PERMANENTLY DELETE ALL committed periods from ALL users in risk_history. This action CANNOT be undone!\n\nAre you absolutely sure?`)) {
            return;
        }
        if (!confirm(`FINAL CONFIRMATION: This will delete ${historyCount} history records. Click OK to proceed.`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('risk_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            if (error)
                throw error;
            alert(`✅ Successfully deleted all ${historyCount} history records.`);
            await loadData();
        }
        catch (error) {
            console.error('Error bulk deleting history:', error);
            alert('Failed to delete history: ' + error.message);
        }
    };
    const handleBulkDeleteAllArchived = async () => {
        if (!confirm(`⚠️ ADMIN BULK DELETE - DELETE ALL ARCHIVED RISKS?\n\nThis will PERMANENTLY DELETE ALL ${archivedRisks.length} archived risks and their controls. This action CANNOT be undone!\n\nAre you absolutely sure?`)) {
            return;
        }
        if (!confirm(`FINAL CONFIRMATION: This will delete ${archivedRisks.length} archived risks. Click OK to proceed.`)) {
            return;
        }
        try {
            // Delete all archived risks (controls will cascade)
            const { error } = await supabase
                .from('archived_risks')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            if (error)
                throw error;
            alert(`✅ Successfully deleted all ${archivedRisks.length} archived risks.`);
            await loadData();
        }
        catch (error) {
            console.error('Error bulk deleting archived risks:', error);
            alert('Failed to delete archived risks: ' + error.message);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx(RefreshCw, { className: "h-8 w-8 animate-spin text-gray-400" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Archive, { className: "h-5 w-5" }), "Archive Management"] }), _jsx(CardDescription, { children: "View and manage archived risks. Archived risks are preserved for audit purposes." })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: loadData, children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Refresh"] })] }) }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: archivedRisks.length }), _jsx("p", { className: "text-xs text-gray-500", children: "Total Archived Risks" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: archivedRisks.filter(r => r.archive_reason === 'user_deleted').length }), _jsx("p", { className: "text-xs text-gray-500", children: "From User Deletions" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: archivedRisks.filter(r => r.archive_reason === 'config_change').length }), _jsx("p", { className: "text-xs text-gray-500", children: "From Config Changes" })] }) }), _jsx(Card, { className: "border-red-200", children: _jsxs(CardContent, { className: "pt-6 space-y-2", children: [_jsx("div", { className: "text-2xl font-bold text-red-600", children: historyCount }), _jsx("p", { className: "text-xs text-gray-500", children: "Committed Period History" }), _jsxs(Button, { variant: "destructive", size: "sm", className: "w-full", onClick: handleBulkDeleteAllHistory, disabled: historyCount === 0, children: [_jsx(Trash2, { className: "h-3 w-3 mr-2" }), "Delete All History"] })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Archived Risks" }), _jsx(CardDescription, { children: "All archived risks are preserved here. Use caution when permanently deleting." })] }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: handleBulkDeleteAllArchived, disabled: archivedRisks.length === 0, children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), "Delete All Archived"] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left p-2 font-medium", children: "Risk Code" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Risk Title" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Division" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Archived Date" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Reason" }), _jsx("th", { className: "text-center p-2 font-medium", children: "Actions" })] }) }), _jsx("tbody", { children: archivedRisks.map((risk) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "p-2 font-mono text-xs", children: risk.risk_code }), _jsx("td", { className: "p-2", children: risk.risk_title }), _jsx("td", { className: "p-2 text-gray-600", children: risk.division }), _jsx("td", { className: "p-2 text-xs text-gray-600", children: new Date(risk.archived_at).toLocaleString() }), _jsx("td", { className: "p-2", children: _jsx("span", { className: `text-xs px-2 py-1 rounded ${risk.archive_reason === 'user_deleted' ? 'bg-blue-100 text-blue-800' :
                                                                risk.archive_reason === 'config_change' ? 'bg-orange-100 text-orange-800' :
                                                                    risk.archive_reason === 'admin_archived' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-gray-100 text-gray-800'}`, children: risk.archive_reason.replace(/_/g, ' ') }) }), _jsx("td", { className: "p-2", children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleViewDetails(risk), title: "View details", children: _jsx(Eye, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDeleteClick(risk), className: "text-red-600 hover:text-red-700 hover:bg-red-50", title: "Permanently delete", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }) })] }, risk.id))) })] }), archivedRisks.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No archived risks found" }))] }) })] }), _jsx(Dialog, { open: showDetailsDialog, onOpenChange: setShowDetailsDialog, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[80vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Archived Risk Details" }), _jsxs(DialogDescription, { children: ["Risk Code: ", selectedRisk?.risk_code] })] }), selectedRisk && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Risk Title" }), _jsx("p", { className: "font-medium", children: selectedRisk.risk_title })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Status" }), _jsx("p", { children: selectedRisk.status })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Division" }), _jsx("p", { children: selectedRisk.division })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Department" }), _jsx("p", { children: selectedRisk.department })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Category" }), _jsx("p", { children: selectedRisk.category })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Owner" }), _jsx("p", { children: selectedRisk.owner })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Risk Description" }), _jsx("p", { className: "text-sm", children: selectedRisk.risk_description })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Likelihood (Inherent)" }), _jsx("p", { children: selectedRisk.likelihood_inherent })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Impact (Inherent)" }), _jsx("p", { children: selectedRisk.impact_inherent })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Archive Reason" }), _jsx("p", { children: selectedRisk.archive_reason.replace(/_/g, ' ') })] }), selectedRisk.archive_notes && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Archive Notes" }), _jsx("p", { className: "text-sm", children: selectedRisk.archive_notes })] })), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Archived At" }), _jsx("p", { className: "text-sm", children: new Date(selectedRisk.archived_at).toLocaleString() })] }), _jsxs("div", { children: [_jsxs(Label, { className: "font-semibold", children: ["Controls (", controls.length, ")"] }), controls.length > 0 ? (_jsx("div", { className: "mt-2 space-y-2", children: controls.map((control, idx) => (_jsxs("div", { className: "p-3 border rounded text-sm", children: [_jsxs("div", { className: "font-medium", children: ["Control ", idx + 1] }), _jsx("p", { className: "text-gray-600", children: control.description }), _jsxs("div", { className: "mt-2 grid grid-cols-4 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Design:" }), " ", control.design] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Implementation:" }), " ", control.implementation] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Monitoring:" }), " ", control.monitoring] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Effectiveness:" }), " ", control.effectiveness_evaluation] })] })] }, control.id))) })) : (_jsx("p", { className: "text-sm text-gray-500 mt-2", children: "No controls" }))] })] })), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => setShowDetailsDialog(false), children: "Close" }) })] }) }), _jsx(Dialog, { open: showDeleteDialog, onOpenChange: setShowDeleteDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 text-red-600", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), "Permanent Deletion Warning"] }), _jsx(DialogDescription, { children: "This action cannot be undone. The archived risk and all its controls will be permanently deleted from the database." })] }), selectedRisk && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-4 bg-red-50 border border-red-200 rounded", children: [_jsxs("p", { className: "font-medium", children: ["Risk Code: ", selectedRisk.risk_code] }), _jsx("p", { className: "text-sm text-gray-600", children: selectedRisk.risk_title })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "delete-password", children: "Confirm your password to proceed" }), _jsx(Input, { id: "delete-password", type: "password", value: deletePassword, onChange: (e) => setDeletePassword(e.target.value), placeholder: "Enter your password", disabled: deleting }), deleteError && (_jsx("p", { className: "text-sm text-red-600", children: deleteError }))] })] })), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowDeleteDialog(false), disabled: deleting, children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handlePermanentDelete, disabled: deleting || !deletePassword, children: deleting ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2 animate-spin" }), "Deleting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), "Permanently Delete"] })) })] })] }) })] }));
}
