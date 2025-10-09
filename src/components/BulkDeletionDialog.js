import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Trash2, Archive, AlertTriangle } from 'lucide-react';
import { archiveRisk } from '@/lib/archive';
import { supabase } from '@/lib/supabase';
export default function BulkDeletionDialog({ open, onOpenChange, selectedRisks, onComplete, }) {
    const [action, setAction] = useState('archive');
    const [reason, setReason] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const handleSubmit = async () => {
        setLoading(true);
        setProgress({ current: 0, total: selectedRisks.length });
        try {
            for (let i = 0; i < selectedRisks.length; i++) {
                const risk = selectedRisks[i];
                setProgress({ current: i + 1, total: selectedRisks.length });
                if (action === 'archive') {
                    // Archive the risk
                    const result = await archiveRisk(risk.risk_code, 'user_requested', reason || 'Bulk archive operation');
                    if (!result.success) {
                        console.error(`Failed to archive risk ${risk.risk_code}:`, result.error);
                        // Continue with other risks
                    }
                }
                else {
                    // Permanent deletion - delete from database directly
                    const { error } = await supabase
                        .from('risks')
                        .delete()
                        .eq('risk_code', risk.risk_code);
                    if (error) {
                        console.error(`Failed to delete risk ${risk.risk_code}:`, error);
                        // Continue with other risks
                    }
                }
            }
            alert(`Successfully processed ${selectedRisks.length} risks`);
            onComplete();
            onOpenChange(false);
            // Reset form
            setAction('archive');
            setReason('');
            setConfirmText('');
        }
        catch (error) {
            console.error('Bulk deletion error:', error);
            alert(`Error: ${error.message}`);
        }
        finally {
            setLoading(false);
            setProgress({ current: 0, total: 0 });
        }
    };
    const handleClose = () => {
        if (!loading) {
            setAction('archive');
            setReason('');
            setConfirmText('');
            onOpenChange(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Trash2, { className: "h-5 w-5" }), "Bulk Delete Risks (", selectedRisks.length, " selected)"] }), _jsx(DialogDescription, { children: "Choose whether to archive or permanently delete the selected risks." })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50", children: [_jsx("div", { className: "text-sm font-medium mb-2", children: "Selected Risks:" }), _jsx("ul", { className: "space-y-1", children: selectedRisks.map((risk) => (_jsxs("li", { className: "text-sm", children: [_jsx("span", { className: "font-mono font-medium", children: risk.risk_code }), " - ", risk.risk_title] }, risk.risk_code))) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Label, { children: "Action" }), _jsxs(RadioGroup, { value: action, onValueChange: (v) => setAction(v), children: [_jsxs("div", { className: "flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer", children: [_jsx(RadioGroupItem, { value: "archive", id: "archive" }), _jsxs("div", { className: "flex-1", children: [_jsxs(Label, { htmlFor: "archive", className: "cursor-pointer font-medium flex items-center gap-2", children: [_jsx(Archive, { className: "h-4 w-4" }), "Archive (Recommended)"] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Risks will be moved to archive and can be restored later. This is the safe option." })] })] }), _jsxs("div", { className: "flex items-start space-x-2 p-3 border rounded-lg hover:bg-red-50 cursor-pointer", children: [_jsx(RadioGroupItem, { value: "permanent", id: "permanent" }), _jsxs("div", { className: "flex-1", children: [_jsxs(Label, { htmlFor: "permanent", className: "cursor-pointer font-medium flex items-center gap-2 text-red-600", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), "Permanent Delete"] }), _jsx("p", { className: "text-sm text-red-600 mt-1", children: "\u26A0\uFE0F Risks will be permanently deleted from the database. This cannot be undone!" })] })] })] })] }), action === 'archive' && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "reason", children: "Reason (Optional)" }), _jsx(Textarea, { id: "reason", value: reason, onChange: (e) => setReason(e.target.value), placeholder: "e.g., End of quarter cleanup, outdated risks, etc.", rows: 3 })] })), action === 'permanent' && (_jsxs("div", { className: "space-y-2 bg-red-50 p-4 rounded-lg border border-red-200", children: [_jsx(Label, { htmlFor: "confirmText", className: "text-red-700 font-medium", children: "Type DELETE to Confirm" }), _jsx(Input, { id: "confirmText", type: "text", value: confirmText, onChange: (e) => setConfirmText(e.target.value), placeholder: "Type DELETE in capital letters", className: "border-red-300" }), _jsxs("p", { className: "text-xs text-red-600", children: ["\u26A0\uFE0F This will permanently delete ", selectedRisks.length, " risks and all their controls. This action cannot be undone!"] })] })), loading && (_jsxs("div", { className: "p-4 bg-blue-50 border border-blue-200 rounded-lg", children: [_jsxs("div", { className: "text-sm font-medium mb-2", children: ["Processing: ", progress.current, " of ", progress.total, " risks"] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all", style: { width: `${(progress.current / progress.total) * 100}%` } }) })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleClose, disabled: loading, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, disabled: loading || (action === 'permanent' && confirmText.toUpperCase() !== 'DELETE'), variant: action === 'permanent' ? 'destructive' : 'default', children: loading ? (_jsx(_Fragment, { children: "Processing..." })) : action === 'archive' ? (_jsxs(_Fragment, { children: [_jsx(Archive, { className: "mr-2 h-4 w-4" }), "Archive ", selectedRisks.length, " Risks"] })) : (_jsxs(_Fragment, { children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Permanently Delete ", selectedRisks.length, " Risks"] })) })] })] }) }));
}
