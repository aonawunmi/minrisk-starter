import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/AuditTrail.tsx
// Audit Trail component for ADMIN
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, RefreshCw, Filter, Eye, Download } from 'lucide-react';
import { loadAuditTrail } from '@/lib/archive';
// Helper component to display risk details in a formatted way
function RiskDetailsCard({ title, data }) {
    if (!data)
        return null;
    return (_jsxs("div", { className: "p-4 border rounded-lg bg-white", children: [_jsx("h4", { className: "font-medium mb-3", children: title }), _jsxs("div", { className: "space-y-2 text-sm", children: [data.risk_code && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Risk Code" }), _jsx("p", { className: "font-mono font-medium", children: data.risk_code })] })), data.risk_title && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Title" }), _jsx("p", { className: "font-medium", children: data.risk_title })] })), data.risk_description && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Description" }), _jsx("p", { className: "text-gray-700", children: data.risk_description })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [data.division && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Division" }), _jsx("p", { children: data.division })] })), data.department && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Department" }), _jsx("p", { children: data.department })] })), data.category && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Category" }), _jsx("p", { children: data.category })] })), data.owner && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Owner" }), _jsx("p", { children: data.owner })] })), data.likelihood_inherent && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Likelihood (Inherent)" }), _jsx("p", { className: "font-medium", children: data.likelihood_inherent })] })), data.impact_inherent && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Impact (Inherent)" }), _jsx("p", { className: "font-medium", children: data.impact_inherent })] })), data.status && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Status" }), _jsx("p", { children: data.status })] })), data.is_priority !== undefined && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Priority" }), _jsx("p", { children: data.is_priority ? 'Yes' : 'No' })] }))] })] })] }));
}
// Helper component to display control details in a formatted way
function ControlDetailsCard({ title, data }) {
    if (!data)
        return null;
    return (_jsxs("div", { className: "p-4 border rounded-lg bg-white", children: [_jsx("h4", { className: "font-medium mb-3", children: title }), _jsxs("div", { className: "space-y-2 text-sm", children: [data.description && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Description" }), _jsx("p", { className: "text-gray-700", children: data.description })] })), data.target && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Target" }), _jsx("p", { className: "font-medium", children: data.target })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [data.design !== undefined && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Design" }), _jsxs("p", { className: "font-medium", children: [data.design, "/3"] })] })), data.implementation !== undefined && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Implementation" }), _jsxs("p", { className: "font-medium", children: [data.implementation, "/3"] })] })), data.monitoring !== undefined && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Monitoring" }), _jsxs("p", { className: "font-medium", children: [data.monitoring, "/3"] })] })), data.effectiveness_evaluation !== undefined && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Effectiveness Evaluation" }), _jsxs("p", { className: "font-medium", children: [data.effectiveness_evaluation, "/3"] })] }))] })] })] }));
}
export default function AuditTrail() {
    const [entries, setEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [actionTypeFilter, setActionTypeFilter] = useState('all');
    const [entityTypeFilter, setEntityTypeFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [riskCodeFilter, setRiskCodeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [limit, setLimit] = useState(100);
    const loadData = async () => {
        setLoading(true);
        try {
            const auditEntries = await loadAuditTrail(limit);
            setEntries(auditEntries);
            setFilteredEntries(auditEntries);
        }
        catch (error) {
            console.error('Error loading audit trail:', error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [limit]);
    // Apply filters
    useEffect(() => {
        let filtered = entries;
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e => e.entity_code?.toLowerCase().includes(query) ||
                e.user_email?.toLowerCase().includes(query) ||
                e.action_type.toLowerCase().includes(query) ||
                e.entity_type.toLowerCase().includes(query));
        }
        // Risk code filter
        if (riskCodeFilter) {
            const query = riskCodeFilter.toLowerCase();
            filtered = filtered.filter(e => e.entity_code?.toLowerCase().includes(query));
        }
        // User filter
        if (userFilter !== 'all') {
            filtered = filtered.filter(e => e.user_email === userFilter);
        }
        // Action type filter
        if (actionTypeFilter !== 'all') {
            filtered = filtered.filter(e => e.action_type === actionTypeFilter);
        }
        // Entity type filter
        if (entityTypeFilter !== 'all') {
            filtered = filtered.filter(e => e.entity_type === entityTypeFilter);
        }
        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(e => new Date(e.performed_at) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date
            filtered = filtered.filter(e => new Date(e.performed_at) <= end);
        }
        setFilteredEntries(filtered);
    }, [entries, searchQuery, riskCodeFilter, userFilter, actionTypeFilter, entityTypeFilter, startDate, endDate]);
    const handleViewDetails = (entry) => {
        setSelectedEntry(entry);
        setShowDetailsDialog(true);
    };
    // CSV Export function
    const handleExportCSV = () => {
        const csvRows = [];
        const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity Code', 'User Email', 'Details'];
        csvRows.push(headers.join(','));
        filteredEntries.forEach(entry => {
            const row = [
                new Date(entry.performed_at).toLocaleString(),
                entry.action_type,
                entry.entity_type,
                entry.entity_code || '',
                entry.user_email || '',
                JSON.stringify(entry.new_values || entry.old_values || {}).replace(/"/g, '""') // Escape quotes
            ];
            csvRows.push(row.map(cell => `"${cell}"`).join(','));
        });
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // Get unique action types, entity types, and users
    const actionTypes = ['all', ...Array.from(new Set(entries.map(e => e.action_type)))];
    const entityTypes = ['all', ...Array.from(new Set(entries.map(e => e.entity_type)))];
    const uniqueUsers = ['all', ...Array.from(new Set(entries.map(e => e.user_email).filter((email) => Boolean(email))))];
    // Get action color
    const getActionColor = (actionType) => {
        switch (actionType) {
            case 'create': return 'bg-green-100 text-green-800';
            case 'update': return 'bg-blue-100 text-blue-800';
            case 'delete': return 'bg-red-100 text-red-800';
            case 'archive': return 'bg-orange-100 text-orange-800';
            case 'restore': return 'bg-purple-100 text-purple-800';
            case 'config_change': return 'bg-yellow-100 text-yellow-800';
            case 'user_approved': return 'bg-green-100 text-green-800';
            case 'user_rejected': return 'bg-red-100 text-red-800';
            case 'user_deleted': return 'bg-red-100 text-red-800';
            case 'request_deletion': return 'bg-orange-100 text-orange-800';
            case 'permanent_delete': return 'bg-red-200 text-red-900';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx(RefreshCw, { className: "h-8 w-8 animate-spin text-gray-400" }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(FileText, { className: "h-5 w-5" }), "Audit Trail"] }), _jsx(CardDescription, { children: "Complete log of all system actions and changes" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: handleExportCSV, children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "Export CSV"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: loadData, children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Refresh"] })] })] }) }) }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-sm flex items-center gap-2", children: [_jsx(Filter, { className: "h-4 w-4" }), "Filters"] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "search", className: "text-xs", children: "Search" }), _jsx(Input, { id: "search", placeholder: "Search by user, code, action...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "risk-code", className: "text-xs", children: "Risk Code" }), _jsx(Input, { id: "risk-code", placeholder: "Filter by risk code...", value: riskCodeFilter, onChange: (e) => setRiskCodeFilter(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "user-filter", className: "text-xs", children: "User" }), _jsxs(Select, { value: userFilter, onValueChange: setUserFilter, children: [_jsx(SelectTrigger, { id: "user-filter", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: uniqueUsers.map(user => (_jsx(SelectItem, { value: user, children: user === 'all' ? 'All Users' : user }, user))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "action-type", className: "text-xs", children: "Action Type" }), _jsxs(Select, { value: actionTypeFilter, onValueChange: setActionTypeFilter, children: [_jsx(SelectTrigger, { id: "action-type", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: actionTypes.map(type => (_jsx(SelectItem, { value: type, children: type === 'all' ? 'All Actions' : type.replace(/_/g, ' ') }, type))) })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "entity-type", className: "text-xs", children: "Entity Type" }), _jsxs(Select, { value: entityTypeFilter, onValueChange: setEntityTypeFilter, children: [_jsx(SelectTrigger, { id: "entity-type", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: entityTypes.map(type => (_jsx(SelectItem, { value: type, children: type === 'all' ? 'All Entities' : type }, type))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "start-date", className: "text-xs", children: "Start Date" }), _jsx(Input, { id: "start-date", type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "end-date", className: "text-xs", children: "End Date" }), _jsx(Input, { id: "end-date", type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "limit", className: "text-xs", children: "Load Limit" }), _jsxs(Select, { value: limit.toString(), onValueChange: (v) => setLimit(parseInt(v)), children: [_jsx(SelectTrigger, { id: "limit", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "50", children: "Last 50" }), _jsx(SelectItem, { value: "100", children: "Last 100" }), _jsx(SelectItem, { value: "200", children: "Last 200" }), _jsx(SelectItem, { value: "500", children: "Last 500" })] })] })] })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: filteredEntries.length }), _jsx("p", { className: "text-xs text-gray-500", children: "Total Entries" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: filteredEntries.filter(e => e.action_type === 'create').length }), _jsx("p", { className: "text-xs text-gray-500", children: "Created" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: filteredEntries.filter(e => e.action_type === 'update').length }), _jsx("p", { className: "text-xs text-gray-500", children: "Updated" })] }) }), _jsx(Card, { children: _jsxs(CardContent, { className: "pt-6", children: [_jsx("div", { className: "text-2xl font-bold", children: filteredEntries.filter(e => ['delete', 'archive', 'permanent_delete'].includes(e.action_type)).length }), _jsx("p", { className: "text-xs text-gray-500", children: "Deleted/Archived" })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Activity Log" }), _jsxs(CardDescription, { children: ["Showing ", filteredEntries.length, " of ", entries.length, " entries"] })] }), _jsx(CardContent, { children: _jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b", children: [_jsx("th", { className: "text-left p-2 font-medium", children: "Timestamp" }), _jsx("th", { className: "text-left p-2 font-medium", children: "User" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Action" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Entity" }), _jsx("th", { className: "text-left p-2 font-medium", children: "Entity Code" }), _jsx("th", { className: "text-center p-2 font-medium", children: "Details" })] }) }), _jsx("tbody", { children: filteredEntries.map((entry) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "p-2 text-xs text-gray-600", children: new Date(entry.performed_at).toLocaleString() }), _jsx("td", { className: "p-2", children: _jsxs("div", { children: [_jsx("div", { className: "font-medium text-xs", children: entry.user_email || 'Unknown' }), _jsxs("div", { className: "text-xs text-gray-500 font-mono", children: [entry.user_id.slice(0, 8), "..."] })] }) }), _jsx("td", { className: "p-2", children: _jsx("span", { className: `text-xs px-2 py-1 rounded ${getActionColor(entry.action_type)}`, children: entry.action_type.replace(/_/g, ' ') }) }), _jsx("td", { className: "p-2", children: _jsx("span", { className: "text-xs font-medium", children: entry.entity_type }) }), _jsx("td", { className: "p-2 font-mono text-xs", children: entry.entity_code || entry.entity_id?.slice(0, 8) || 'N/A' }), _jsx("td", { className: "p-2", children: _jsx("div", { className: "flex justify-center", children: _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleViewDetails(entry), title: "View details", children: _jsx(Eye, { className: "h-4 w-4" }) }) }) })] }, entry.id))) })] }), filteredEntries.length === 0 && (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No audit entries found" }))] }) })] }), _jsx(Dialog, { open: showDetailsDialog, onOpenChange: setShowDetailsDialog, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[85vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Audit Entry Details" }), _jsx(DialogDescription, { children: selectedEntry && new Date(selectedEntry.performed_at).toLocaleString() })] }), selectedEntry && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "User" }), _jsx("p", { className: "font-medium", children: selectedEntry.user_email || 'Unknown' }), _jsx("p", { className: "text-xs font-mono text-gray-500", children: selectedEntry.user_id })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Action Type" }), _jsx("p", { children: _jsx("span", { className: `text-xs px-2 py-1 rounded ${getActionColor(selectedEntry.action_type)}`, children: selectedEntry.action_type.replace(/_/g, ' ') }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Entity Type" }), _jsx("p", { className: "font-medium", children: selectedEntry.entity_type })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Entity Code/ID" }), _jsx("p", { className: "font-mono text-sm", children: selectedEntry.entity_code || selectedEntry.entity_id?.slice(0, 8) || 'N/A' })] })] }), selectedEntry.entity_type === 'risk' && (selectedEntry.old_values || selectedEntry.new_values) && (_jsx("div", { className: "space-y-4", children: selectedEntry.action_type === 'update' && selectedEntry.old_values && selectedEntry.new_values ? (
                                    // Show before/after comparison for updates
                                    _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(RiskDetailsCard, { title: "Previous Values", data: selectedEntry.old_values }), _jsx(RiskDetailsCard, { title: "New Values", data: selectedEntry.new_values })] })) : (
                                    // Show single view for create/delete
                                    _jsx(RiskDetailsCard, { title: selectedEntry.action_type === 'create' ? 'Created Risk' : selectedEntry.action_type === 'delete' ? 'Deleted Risk' : 'Risk Details', data: selectedEntry.new_values || selectedEntry.old_values })) })), selectedEntry.entity_type === 'control' && (selectedEntry.old_values || selectedEntry.new_values) && (_jsx("div", { className: "space-y-4", children: selectedEntry.action_type === 'update' && selectedEntry.old_values && selectedEntry.new_values ? (_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(ControlDetailsCard, { title: "Previous Values", data: selectedEntry.old_values }), _jsx(ControlDetailsCard, { title: "New Values", data: selectedEntry.new_values })] })) : (_jsx(ControlDetailsCard, { title: selectedEntry.action_type === 'create' ? 'Created Control' : 'Control Details', data: selectedEntry.new_values || selectedEntry.old_values })) })), selectedEntry.entity_type === 'user' && (selectedEntry.new_values || selectedEntry.metadata) && (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h4", { className: "font-medium mb-3", children: "User Details" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [selectedEntry.new_values?.role && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Role" }), _jsx("p", { className: "font-medium capitalize", children: selectedEntry.new_values.role })] })), selectedEntry.new_values?.status && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Status" }), _jsx("p", { className: "font-medium capitalize", children: selectedEntry.new_values.status })] })), selectedEntry.metadata?.approved_by_email && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Approved By" }), _jsx("p", { className: "font-medium", children: selectedEntry.metadata.approved_by_email })] })), selectedEntry.metadata?.rejected_by_email && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: "Rejected By" }), _jsx("p", { className: "font-medium", children: selectedEntry.metadata.rejected_by_email })] }))] })] })), selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 &&
                                    selectedEntry.entity_type !== 'risk' && selectedEntry.entity_type !== 'control' && (_jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h4", { className: "font-medium mb-3", children: "Additional Information" }), _jsx("div", { className: "grid grid-cols-2 gap-3 text-sm", children: Object.entries(selectedEntry.metadata).map(([key, value]) => (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-gray-500", children: key.replace(/_/g, ' ') }), _jsx("p", { className: "font-medium", children: typeof value === 'object' ? JSON.stringify(value) : String(value) })] }, key))) })] }))] })), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => setShowDetailsDialog(false), children: "Close" }) })] }) })] }));
}
