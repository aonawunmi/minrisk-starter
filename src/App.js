import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, RefreshCw, Settings, Table, Pencil, Trash2, ChevronsUpDown, FileUp, AlertTriangle, ArrowUpDown, Sparkles, Calendar, Archive, Download } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import html2canvas from 'html2canvas';
import { askClaude } from '@/lib/ai';
import SupaPing from "@/components/SupaPing";
import UserMenu from "@/components/UserMenu";
import AdminDashboard from "@/components/AdminDashboard";
import BulkDeletionDialog from "@/components/BulkDeletionDialog";
import { VarSandboxTab } from "@/components/VarSandboxTab";
import { RiskReportTab } from "@/components/RiskReportTab";
import { loadRisks, createRisk, updateRisk, deleteRisk, loadConfig, saveConfig as saveConfigToDb } from '@/lib/database';
// Make the endpoint visible in DevTools:
;
window.__MINRISK_AI_PATH = import.meta.env.VITE_AI_PATH ?? '/api/gemini';
console.log('AI endpoint:', window.__MINRISK_AI_PATH);
// ===== CONSTANTS =====
const DEFAULT_APP_CONFIG = {
    matrixSize: 5,
    likelihoodLabels: ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"],
    impactLabels: ["Minimal", "Low", "Moderate", "High", "Severe"],
    divisions: ["Clearing", "Operations", "Finance"],
    departments: ["Risk Management", "IT Ops", "Quant/Risk", "Treasury", "Trading"],
    categories: ["Strategic", "Credit", "Market", "Liquidity", "Operational", "Legal/Compliance", "Technology", "ESG", "Reputational"],
    owners: ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams", "David Brown"],
};
const CONTROL_DESIGN_OPTIONS = [{ value: 3, label: "Reduces risks entirely" }, { value: 2, label: "Reduces most aspects of risk" }, { value: 1, label: "Reduces some areas of risk" }, { value: 0, label: "Badly designed or no protection" }];
const CONTROL_IMPLEMENTATION_OPTIONS = [{ value: 3, label: "Always applied as intended" }, { value: 2, label: "Generally operational" }, { value: 1, label: "Sometimes applied correctly" }, { value: 0, "label": "Not applied or applied incorrectly" }];
const CONTROL_MONITORING_OPTIONS = [{ value: 3, label: "Always monitored" }, { value: 2, label: "Usually monitored" }, { value: 1, label: "Monitored on an ad-hoc basis" }, { value: 0, label: "Not monitored at all" }];
const CONTROL_EFFECTIVENESS_OPTIONS = [{ value: 3, label: "Regularly evaluated" }, { value: 2, label: "Occasionally evaluated" }, { value: 1, label: "Infrequently evaluated" }, { value: 0, label: "Never evaluated" }];
const SEED = [{ risk_code: "CRD-001", risk_title: "Counterparty default", risk_description: "Clearing member fails to meet obligations; default waterfall.", division: "Clearing", department: "Risk Management", category: "Credit", owner: "Head, Risk", relevant_period: null, likelihood_inherent: 4, impact_inherent: 5, status: "In Progress", controls: [{ id: "c1", description: "Daily Margin Calls", target: "Impact", design: 3, implementation: 3, monitoring: 3, effectiveness_evaluation: 3 }, { id: "c2", description: "Member Default Fund", target: "Impact", design: 2, implementation: 3, monitoring: 2, effectiveness_evaluation: 2 }] }, { risk_code: "OPR-003", risk_title: "Settlement system outage", risk_description: "Platform unavailable during settlement window.", division: "Operations", department: "IT Ops", category: "Operational", owner: "CTO", relevant_period: null, likelihood_inherent: 3, impact_inherent: 5, status: "Open", controls: [{ id: "c3", description: "System Redundancy/Failover", target: "Likelihood", design: 3, implementation: 2, monitoring: 3, effectiveness_evaluation: 2 }] }];
// ===== LOGIC & HELPERS =====
const bucket = (l, i, size) => {
    const s = l * i;
    if (size === 5) {
        return s >= 20 ? "Severe" : s >= 12 ? "High" : s >= 6 ? "Moderate" : s >= 3 ? "Low" : "Minimal";
    }
    // Scale thresholds for 6x6 matrix
    return s >= 30 ? "Catastrophic" : s >= 20 ? "Severe" : s >= 12 ? "High" : s >= 6 ? "Moderate" : "Low";
};
const scoreColor = (t) => {
    switch (t) {
        case "Catastrophic": return "#991b1b";
        case "Severe": return "#dc2626";
        case "High": return "#f97316";
        case "Moderate": return "#facc15";
        case "Low": return "#84cc16";
        default: return "#22c55e"; // Minimal
    }
};
const scoreColorClass = (t) => {
    switch (t) {
        case "Catastrophic": return "bg-red-800";
        case "Severe": return "bg-red-600";
        case "High": return "bg-orange-500";
        case "Moderate": return "bg-yellow-400";
        case "Low": return "bg-lime-400";
        default: return "bg-emerald-400"; // Minimal
    }
};
const scoreColorText = (t) => (t === "Catastrophic" || t === "Severe" || t === "High") ? "text-white" : "text-black";
const cap3 = (s) => (s || "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "NEW";
const nextRiskCode = (rows, div, cat) => { const pre = `${cap3(div)}-${cap3(cat)}`; const nums = rows.filter(r => r && r.risk_code && r.risk_code.startsWith(pre)).map(r => Number((r.risk_code.split("-")[2] || "0").replace(/[^0-9]/g, ""))).filter(Number.isFinite).sort((a, b) => a - b); const n = (nums.length > 0 ? nums[nums.length - 1] : 0) + 1; return `${pre}-${String(n).padStart(3, '0')}`; };
const calculateControlEffectiveness = (control) => { if (control.design === 0 || control.implementation === 0)
    return 0; const totalScore = control.design + control.implementation + control.monitoring + control.effectiveness_evaluation; return totalScore / 12; };
const calculateResidualRisk = (risk) => { const likelihoodControls = risk.controls.filter(c => c.target === 'Likelihood'); const impactControls = risk.controls.filter(c => c.target === 'Impact'); const maxLikelihoodReduction = likelihoodControls.length > 0 ? Math.max(...likelihoodControls.map(calculateControlEffectiveness)) : 0; const maxImpactReduction = impactControls.length > 0 ? Math.max(...impactControls.map(calculateControlEffectiveness)) : 0; const residualLikelihood = risk.likelihood_inherent - (risk.likelihood_inherent - 1) * maxLikelihoodReduction; const residualImpact = risk.impact_inherent - (risk.impact_inherent - 1) * maxImpactReduction; return { likelihood: Math.max(1, residualLikelihood), impact: Math.max(1, residualImpact) }; };
// ===== PRIORITY RISK KEY HELPERS =====
// Create composite key to uniquely identify a risk by user_id and risk_code
const makePriorityKey = (userId, riskCode) => {
    return `${userId || 'unknown'}::${riskCode}`;
};
// Check if a risk is in the priority set
const isPriorityRisk = (priorityRisks, userId, riskCode) => {
    return priorityRisks.has(makePriorityKey(userId, riskCode));
};
// ===== CSV PARSING LOGIC =====
const parseCsvToJson = (csvText) => {
    const lines = csvText.trim().split('\n');
    // Function to split CSV line while respecting quotes
    const splitCsvLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            if (char === '"' && inQuotes && nextChar === '"') {
                // Escaped quote - add one quote and skip next
                current += '"';
                i++;
            }
            else if (char === '"') {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                // Comma outside quotes - field separator
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    const headers = splitCsvLine(lines[0]).map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = splitCsvLine(lines[i]);
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j]?.trim() || '';
        }
        data.push(obj);
    }
    return data;
};
const unparseJsonToCsv = (data) => {
    if (data.length === 0)
        return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            let value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            if (/[",\n]/.test(value)) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ];
    return csvRows.join('\n');
};
function exportToCsv(filename, rows) {
    if (!rows || rows.length === 0) {
        alert("No data to export.");
        return;
    }
    const csv = unparseJsonToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
// ===== GEMINI API HELPER =====
// NEW: routes all AI calls through our Vercel endpoint,
// and auto-injects a "return JSON only" instruction based on the schema.
const callGeminiAPI = async (prompt, schema) => {
    // Build a concise instruction from the caller's schema
    function schemaInstruction(s) {
        try {
            const isArray = s?.type?.toUpperCase?.() === 'ARRAY';
            const propsObj = s?.items?.properties ?? {};
            const required = Array.isArray(s?.items?.required) ? s.items.required : [];
            const props = Object.keys(propsObj);
            const propsLine = props.length
                ? `Fields: ${props.map((k) => `"${k}" (${String(propsObj[k]?.type || 'STRING').toLowerCase()})`).join(', ')}.`
                : '';
            const reqLine = required.length ? `Required: ${required.map((k) => `"${k}"`).join(', ')}.` : '';
            return [
                'You are a senior enterprise risk & controls expert.',
                isArray ? 'Return a JSON array of objects.' : 'Return a single JSON object.',
                propsLine,
                reqLine,
                'Output must be JSON only — no commentary, no markdown fences.',
            ]
                .filter(Boolean)
                .join('\n');
        }
        catch {
            return 'Return JSON only — no commentary, no markdown fences.';
        }
    }
    // Prepend instruction (when schema provided) so model returns parseable JSON
    const fullPrompt = schema ? `${schemaInstruction(schema)}\n\n${prompt}` : prompt;
    const text = await askClaude(fullPrompt); // calls Claude API
    // Robust JSON parsing (handles ```json fences and extra prose)
    const tryParse = (s) => {
        try {
            return JSON.parse(s);
        }
        catch {
            return null;
        }
    };
    let parsed = tryParse(text);
    if (parsed !== null)
        return parsed;
    // If model wrapped JSON in ```json … ```
    parsed = tryParse(text.replace(/```json|```/g, '').trim());
    if (parsed !== null)
        return parsed;
    // Extract array/object if surrounded by text
    const a0 = text.indexOf('['), a1 = text.lastIndexOf(']');
    if (a0 !== -1 && a1 !== -1) {
        parsed = tryParse(text.slice(a0, a1 + 1));
        if (parsed !== null)
            return parsed;
    }
    const o0 = text.indexOf('{'), o1 = text.lastIndexOf('}');
    if (o0 !== -1 && o1 !== -1) {
        parsed = tryParse(text.slice(o0, o1 + 1));
        if (parsed !== null)
            return parsed;
    }
    // Last resort — callers already handle "no suggestions"
    return [];
};
// ===== MAIN APP COMPONENT =====
export default function MinRiskLatest() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
    const [filters, setFilters] = useState({ divisions: [], departments: [], categories: [], statuses: [], users: [], periods: [] });
    const [heatMapView, setHeatMapView] = useState({ inherent: true, residual: true });
    const [sortConfig, setSortConfig] = useState(null);
    const [priorityRisks, setPriorityRisks] = useState(new Set());
    const [activeTab, setActiveTab] = useState("register");
    const [editingRisk, setEditingRisk] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userStatus, setUserStatus] = useState(null);
    const [activePeriod, setActivePeriod] = useState(null);
    const [toast, setToast] = useState(null);
    const [showChangePeriodDialog, setShowChangePeriodDialog] = useState(false);
    const [newPeriod, setNewPeriod] = useState("");
    const [showCommitDialog, setShowCommitDialog] = useState(false);
    // Toast notification function
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };
    // Change active period handler
    const handleChangePeriod = async () => {
        if (!newPeriod)
            return;
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('change_active_period', { new_period: newPeriod });
            if (error)
                throw error;
            if (data?.success) {
                setActivePeriod(newPeriod);
                showToast(`Active period changed to ${newPeriod}. ${data.updated_count} risk(s) updated.`);
                setShowChangePeriodDialog(false);
                setNewPeriod("");
                // Reload risks to reflect the change
                const risks = await loadRisks();
                setRows(risks);
            }
            else {
                showToast(data?.error || 'Failed to change period', 'error');
            }
        }
        catch (error) {
            console.error('Error changing period:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            showToast(error.message || error.hint || 'Failed to change period', 'error');
        }
    };
    // Commit period handler
    const handleCommitPeriod = async () => {
        if (!activePeriod)
            return;
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('commit_user_period', { target_period: activePeriod });
            if (error)
                throw error;
            if (data?.success) {
                showToast(`Period ${activePeriod} committed. ${data.risk_count} risk(s) moved to history.`);
                setShowCommitDialog(false);
                // Reload risks to reflect the change
                const risks = await loadRisks();
                setRows(risks);
            }
            else {
                showToast(data?.error || 'Failed to commit period', 'error');
            }
        }
        catch (error) {
            console.error('Error committing period:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            showToast(error.message || error.hint || error.details || 'Failed to commit period', 'error');
        }
    };
    // Load data from database on mount
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            console.log('🚀 Starting data load...');
            try {
                // Import dynamically to avoid circular dependency
                const { getOrCreateUserProfile } = await import('@/lib/database');
                const { supabase } = await import('@/lib/supabase');
                // Get current user
                console.log('👤 Getting current user...');
                const { data: { user } } = await supabase.auth.getUser();
                console.log('👤 User:', user?.id || 'No user');
                if (user) {
                    // Ensure user profile exists (creates if doesn't exist)
                    console.log('📝 Creating/checking user profile...');
                    const profileResult = await getOrCreateUserProfile(user.id);
                    console.log('📝 Profile result:', profileResult);
                    // Load user role, status, and active period
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('role, status, active_period')
                        .eq('id', user.id)
                        .single();
                    if (profile) {
                        setUserRole(profile.role);
                        setUserStatus(profile.status);
                        setActivePeriod(profile.active_period || null);
                        console.log('👤 User role:', profile.role, 'Status:', profile.status, 'Active Period:', profile.active_period);
                    }
                }
                console.log('⚠️  Loading risks...');
                const risks = await loadRisks();
                console.log('⚠️  Loaded risks:', risks.length);
                setRows(risks);
                console.log('⚙️  Loading config...');
                const dbConfig = await loadConfig();
                console.log('⚙️  Config loaded:', dbConfig);
                if (dbConfig) {
                    setConfig({
                        matrixSize: dbConfig.matrix_size,
                        likelihoodLabels: dbConfig.likelihood_labels,
                        impactLabels: dbConfig.impact_labels,
                        divisions: dbConfig.divisions,
                        departments: dbConfig.departments,
                        categories: dbConfig.categories,
                        owners: dbConfig.owners || DEFAULT_APP_CONFIG.owners,
                    });
                }
                console.log('✅ Data load complete!');
            }
            catch (error) {
                console.error('❌ Failed to load data:', error);
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);
    const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return rows.filter(r => { const m = !q || [r.risk_code, r.risk_title, r.risk_description, r.owner, r.category, r.division, r.department].join(" ").toLowerCase().includes(q); const d = filters.divisions.length === 0 || filters.divisions.includes(r.division); const de = filters.departments.length === 0 || filters.departments.includes(r.department); const c = filters.categories.length === 0 || filters.categories.includes(r.category); const s = filters.statuses.length === 0 || filters.statuses.includes(r.status); const u = filters.users.length === 0 || (r.user_email && filters.users.includes(r.user_email)); const p = filters.periods.length === 0 || (r.relevant_period && filters.periods.includes(r.relevant_period)); return m && d && de && c && s && u && p; }); }, [rows, query, filters]);
    const uniquePeriods = useMemo(() => {
        const periods = rows.map(r => r.relevant_period).filter((p) => Boolean(p));
        return Array.from(new Set(periods)).sort();
    }, [rows]);
    const processedData = useMemo(() => { return filtered.map(r => { const residual = calculateResidualRisk(r); return { ...r, likelihood_residual: residual.likelihood, impact_residual: residual.impact, inherent_score: r.likelihood_inherent * r.impact_inherent, residual_score: residual.likelihood * residual.impact }; }); }, [filtered]);
    const sortedData = useMemo(() => {
        let sortableItems = [...processedData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === undefined || bVal === undefined || aVal === null || bVal === null)
                    return 0;
                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [processedData, sortConfig]);
    const addMultipleRisks = async (risksToAdd) => {
        for (const risk of risksToAdd) {
            const riskCode = nextRiskCode(rows, risk.division, risk.category);
            console.log('Attempting to create risk:', riskCode);
            const result = await createRisk({ ...risk, risk_code: riskCode });
            console.log('Create risk result:', result);
            if (result.success && result.data) {
                setRows(prev => [...prev, result.data]);
                console.log('Risk added to state successfully');
                showToast(`✓ Risk ${riskCode} created successfully!`, 'success');
            }
            else {
                console.error('Failed to create risk:', result.error);
                alert(`Failed to create risk: ${result.error || 'Unknown error'}`);
            }
        }
    };
    const add = (payload) => addMultipleRisks([payload]);
    const save = async (code, payload) => {
        const result = await updateRisk(code, payload);
        if (result.success) {
            setRows(p => p.map(r => r.risk_code === code ? { ...payload, risk_code: code } : r));
            showToast(`✓ Risk ${code} updated successfully!`, 'success');
        }
        else {
            console.error('Failed to update risk:', result.error);
            alert(`Failed to update risk: ${result.error}`);
        }
    };
    const remove = async (code) => {
        const result = await deleteRisk(code);
        if (result.success) {
            setRows(p => p.filter(r => r.risk_code !== code));
            setPriorityRisks(prev => {
                const newSet = new Set(prev);
                newSet.delete(code);
                return newSet;
            });
        }
        else {
            console.error('Failed to delete risk:', result.error);
            alert(`Failed to delete risk: ${result.error}`);
        }
    };
    const handleRiskBulkImport = async (newRisks, discoveredConfig) => {
        console.log('🔄 Bulk importing', newRisks.length, 'risks...');
        // Update config with new divisions/departments/categories
        setConfig(prevConfig => ({
            ...prevConfig,
            divisions: [...new Set([...prevConfig.divisions, ...discoveredConfig.divisions])],
            departments: [...new Set([...prevConfig.departments, ...discoveredConfig.departments])],
            categories: [...new Set([...prevConfig.categories, ...discoveredConfig.categories])],
        }));
        // Generate risk codes and prepare for bulk insert
        let tempRowsForCodeGeneration = [...rows];
        const risksWithCodes = newRisks.map(riskWithoutCode => {
            const newRiskWithCode = {
                ...riskWithoutCode,
                risk_code: nextRiskCode(tempRowsForCodeGeneration, riskWithoutCode.division, riskWithoutCode.category)
            };
            tempRowsForCodeGeneration.push(newRiskWithCode);
            return newRiskWithCode;
        });
        // Import to database using bulkImportRisks
        const { bulkImportRisks } = await import('@/lib/database');
        const result = await bulkImportRisks(risksWithCodes);
        if (result.success) {
            console.log('✅ Bulk import successful:', result.count, 'risks saved');
            // Reload all risks from database to get the complete data with IDs
            const allRisks = await loadRisks();
            setRows(allRisks);
        }
        else {
            console.error('❌ Bulk import failed:', result.error);
            alert(`Failed to import risks: ${result.error}`);
        }
    };
    const handleControlBulkImport = async (newControls) => {
        console.log('🔄 Bulk importing', newControls.length, 'controls...');
        // Add controls to existing risks in state
        const rowsMap = new Map(rows.map(r => [r.risk_code, { ...r, controls: [...r.controls] }]));
        newControls.forEach(controlData => {
            const risk = rowsMap.get(controlData.risk_code);
            if (risk) {
                const newControl = {
                    id: crypto.randomUUID(),
                    description: controlData.description,
                    target: controlData.target,
                    design: controlData.design,
                    implementation: controlData.implementation,
                    monitoring: controlData.monitoring,
                    effectiveness_evaluation: controlData.effectiveness_evaluation,
                };
                risk.controls.push(newControl);
            }
        });
        const updatedRisks = Array.from(rowsMap.values());
        // Save each updated risk to database
        let successCount = 0;
        let errorCount = 0;
        for (const risk of updatedRisks) {
            // Only update risks that had controls added
            const originalRisk = rows.find(r => r.risk_code === risk.risk_code);
            if (originalRisk && risk.controls.length !== originalRisk.controls.length) {
                const result = await updateRisk(risk.risk_code, risk);
                if (result.success) {
                    successCount++;
                }
                else {
                    errorCount++;
                    console.error('Failed to update risk', risk.risk_code, ':', result.error);
                }
            }
        }
        console.log(`✅ Control import complete: ${successCount} risks updated, ${errorCount} errors`);
        if (errorCount > 0) {
            alert(`Some controls failed to save: ${errorCount} errors. Check console for details.`);
        }
        // Reload all risks from database to get fresh data
        const allRisks = await loadRisks();
        setRows(allRisks);
    };
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    const handleSaveRisk = (payload) => {
        if (editingRisk) {
            save(editingRisk.risk_code, payload);
            setEditingRisk(null);
        }
    };
    const handleResetDemo = async () => {
        if (!confirm('⚠️ This will DELETE ALL your data and reset to demo data. This cannot be undone. Continue?'))
            return;
        setLoading(true);
        console.log('🗑️ Clearing all database data...');
        try {
            // Delete all existing risks (controls will be deleted automatically via CASCADE)
            const existingRisks = await loadRisks();
            console.log(`Found ${existingRisks.length} risks to delete`);
            for (const risk of existingRisks) {
                const result = await deleteRisk(risk.risk_code);
                if (!result.success) {
                    console.error('Failed to delete risk:', risk.risk_code, result.error);
                }
            }
            console.log('✅ All data cleared');
            // Load demo data into database
            console.log('📦 Loading demo data...');
            const { bulkImportRisks } = await import('@/lib/database');
            const result = await bulkImportRisks(SEED);
            if (result.success) {
                console.log('✅ Demo data loaded:', result.count, 'risks');
                // Reload from database
                const allRisks = await loadRisks();
                setRows(allRisks);
            }
            else {
                console.error('❌ Failed to load demo data:', result.error);
                alert(`Failed to load demo data: ${result.error}`);
            }
            // Reset config to defaults
            setConfig(DEFAULT_APP_CONFIG);
            console.log('🎉 Reset complete!');
        }
        catch (error) {
            console.error('❌ Reset failed:', error);
            alert('Failed to reset data. Check console for details.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClearAllData = async () => {
        if (!confirm('⚠️ This will DELETE ALL your risks and controls from the database. This cannot be undone. Continue?'))
            return;
        setLoading(true);
        console.log('🗑️ Clearing all database data...');
        try {
            // Delete all existing risks (controls will be deleted automatically via CASCADE)
            const existingRisks = await loadRisks();
            console.log(`Found ${existingRisks.length} risks to delete`);
            for (const risk of existingRisks) {
                const result = await deleteRisk(risk.risk_code);
                if (!result.success) {
                    console.error('Failed to delete risk:', risk.risk_code, result.error);
                }
            }
            console.log('✅ All data cleared');
            setRows([]);
            console.log('🎉 Clear complete!');
        }
        catch (error) {
            console.error('❌ Clear failed:', error);
            alert('Failed to clear data. Check console for details.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSaveConfig = async (newConfig) => {
        const result = await saveConfigToDb({
            matrix_size: newConfig.matrixSize,
            likelihood_labels: newConfig.likelihoodLabels,
            impact_labels: newConfig.impactLabels,
            divisions: newConfig.divisions,
            departments: newConfig.departments,
            categories: newConfig.categories,
            owners: newConfig.owners,
        });
        if (result.success) {
            setConfig(newConfig);
        }
        else {
            console.error('Failed to save config:', result.error);
            alert(`Failed to save configuration: ${result.error}`);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen w-full bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(RefreshCw, { className: "h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" }), _jsx("p", { className: "text-gray-600", children: "Loading..." })] }) }));
    }
    // Check if user needs approval
    const needsApproval = userStatus === 'pending' || userStatus === 'rejected';
    const canEdit = userRole === 'edit'; // Only 'edit' role can modify data
    const isAdmin = userRole === 'admin'; // Admin can view all but not edit data
    if (needsApproval) {
        return _jsx("div", { className: "min-h-screen w-full bg-gray-50 p-6 flex items-center justify-center", children: _jsxs(Card, { className: "max-w-md", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: userStatus === 'pending' ? '⏳ Awaiting Approval' : '❌ Access Denied' }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-gray-600 mb-4", children: userStatus === 'pending'
                                    ? 'Your account is pending approval from an administrator. You will receive access once approved.'
                                    : 'Your account access has been rejected. Please contact an administrator for more information.' }), _jsx(UserMenu, {})] })] }) });
    }
    return _jsxs("div", { className: "min-h-screen w-full bg-gray-50 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl md:text-3xl font-bold", children: "MinRisk" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Version 1.6.1 (Final) \u2022 Role: ", _jsx("span", { className: "font-semibold capitalize", children: userRole === 'view_only' ? 'View Only' : userRole })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [isAdmin && _jsxs(Button, { variant: "outline", onClick: handleClearAllData, children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Clear All"] }), isAdmin && _jsxs(Button, { variant: "outline", onClick: handleResetDemo, children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Reset Demo"] }), isAdmin && _jsx(ConfigDialog, { config: config, onSave: handleSaveConfig }), _jsx(UserMenu, {})] })] }), userStatus === 'approved' && (_jsx("div", { className: "mb-4 p-4 rounded-xl border bg-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-gray-700 block mb-1", children: "Active Period" }), _jsx("div", { className: "text-lg font-bold text-blue-600", children: activePeriod || 'No period set' })] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [canEdit && _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setShowChangePeriodDialog(true), children: [_jsx(Calendar, { className: "mr-2 h-4 w-4" }), "Change Period"] }), canEdit && activePeriod && _jsxs(Button, { variant: "default", size: "sm", onClick: () => setShowCommitDialog(true), children: [_jsx(Archive, { className: "mr-2 h-4 w-4" }), "Commit Period"] })] })] }) })), import.meta.env.DEV && (_jsxs("div", { className: "mb-4 p-3 rounded-xl border bg-white", children: [_jsx("strong", { children: "Supabase check" }), _jsx(SupaPing, {})] })), _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: [_jsxs(TabsList, { className: "mb-4", children: [_jsx(TabsTrigger, { value: "register", children: "Risk Register" }), _jsx(TabsTrigger, { value: "control_register", children: "Control Register" }), _jsx(TabsTrigger, { value: "heatmap", children: "Heat Map" }), _jsx(TabsTrigger, { value: "risk_report", children: "\uD83D\uDCCA Risk Report" }), _jsx(TabsTrigger, { value: "var_sandbox", children: "\uD83D\uDCCA VaR Sandbox" }), _jsx(TabsTrigger, { value: "history", children: "\uD83D\uDCDC History" }), canEdit && _jsx(TabsTrigger, { value: "import_risks", children: "Risk Import" }), canEdit && _jsx(TabsTrigger, { value: "import_controls", children: "Control Import" }), isAdmin && _jsx(TabsTrigger, { value: "admin", children: "\uD83D\uDC65 Admin" })] }), _jsx(TabsContent, { value: "register", children: _jsx(RiskRegisterTab, { sortedData: sortedData, rowCount: filtered.length, requestSort: requestSort, onAdd: add, onEdit: setEditingRisk, onRemove: remove, config: config, rows: filtered, allRows: rows, priorityRisks: priorityRisks, setPriorityRisks: setPriorityRisks, canEdit: canEdit, filters: filters, setFilters: setFilters, isAdmin: isAdmin }) }), _jsx(TabsContent, { value: "control_register", children: _jsx(ControlRegisterTab, { allRisks: filtered, priorityRisks: priorityRisks, canEdit: canEdit }) }), _jsx(TabsContent, { value: "heatmap", children: _jsx(HeatmapTab, { processedData: processedData, allRows: rows, uniquePeriods: uniquePeriods, heatMapView: heatMapView, setHeatMapView: setHeatMapView, priorityRisks: priorityRisks, config: config, onEditRisk: setEditingRisk, canEdit: canEdit }) }), _jsx(TabsContent, { value: "risk_report", children: _jsx(RiskReportTab, { risks: processedData, config: config }) }), _jsx(TabsContent, { value: "var_sandbox", children: _jsx(VarSandboxTab, { matrixSize: config.matrixSize, showToast: showToast }) }), _jsx(TabsContent, { value: "history", children: _jsx(RiskHistoryTab, { config: config, showToast: showToast, isAdmin: isAdmin }) }), _jsx(TabsContent, { value: "import_risks", children: _jsx(RiskImportTab, { onImport: handleRiskBulkImport, currentConfig: config, canEdit: canEdit }) }), _jsx(TabsContent, { value: "import_controls", children: _jsx(ControlImportTab, { onImport: handleControlBulkImport, allRisks: rows, canEdit: canEdit }) }), isAdmin && _jsx(TabsContent, { value: "admin", children: _jsx(AdminDashboard, { config: config, showToast: showToast }) })] }), editingRisk && (_jsx(EditRiskDialog, { initial: editingRisk, config: config, onSave: handleSaveRisk, open: !!editingRisk, onOpenChange: (isOpen) => !isOpen && setEditingRisk(null) }, editingRisk.risk_code)), _jsx(Dialog, { open: showChangePeriodDialog, onOpenChange: setShowChangePeriodDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Change Active Period" }), _jsx(DialogDescription, { children: "Select a new period. All your active risks will be updated to this period." })] }), _jsx("div", { className: "space-y-4 py-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Select Period" }), _jsxs(Select, { value: newPeriod, onValueChange: setNewPeriod, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Choose a period..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Q1 2025", children: "Q1 2025" }), _jsx(SelectItem, { value: "Q2 2025", children: "Q2 2025" }), _jsx(SelectItem, { value: "Q3 2025", children: "Q3 2025" }), _jsx(SelectItem, { value: "Q4 2025", children: "Q4 2025" }), _jsx(SelectItem, { value: "Q1 2026", children: "Q1 2026" }), _jsx(SelectItem, { value: "Q2 2026", children: "Q2 2026" }), _jsx(SelectItem, { value: "Q3 2026", children: "Q3 2026" }), _jsx(SelectItem, { value: "Q4 2026", children: "Q4 2026" }), _jsx(SelectItem, { value: "FY2025", children: "FY2025" }), _jsx(SelectItem, { value: "FY2026", children: "FY2026" })] })] })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowChangePeriodDialog(false), children: "Cancel" }), _jsx(Button, { onClick: handleChangePeriod, disabled: !newPeriod, children: "Change Period" })] })] }) }), _jsx(Dialog, { open: showCommitDialog, onOpenChange: setShowCommitDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Commit Period" }), _jsxs(DialogDescription, { children: ["Are you sure you want to commit ", activePeriod, "? All your risks for this period will be moved to history and the register will be cleared."] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowCommitDialog(false), children: "Cancel" }), _jsx(Button, { onClick: handleCommitPeriod, variant: "default", children: "Commit" })] })] }) }), toast && (_jsx("div", { className: `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`, children: toast.message }))] });
}
// ===== CHILD COMPONENTS =====
function RiskRegisterTab({ sortedData, rowCount, requestSort, onAdd, onEdit, onRemove, config, rows, allRows, priorityRisks, setPriorityRisks, canEdit, filters, setFilters, isAdmin }) {
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    // Always show all sorted data - priority checkboxes are just for marking/selection
    // Apply search filter
    const searchFilteredData = useMemo(() => {
        if (!searchQuery)
            return sortedData;
        const query = searchQuery.toLowerCase();
        return sortedData.filter(r => r.risk_code.toLowerCase().includes(query) ||
            r.risk_title.toLowerCase().includes(query) ||
            r.risk_description?.toLowerCase().includes(query) ||
            r.category?.toLowerCase().includes(query) ||
            r.owner?.toLowerCase().includes(query));
    }, [sortedData, searchQuery]);
    const displayedData = searchFilteredData;
    // Get unique user emails for filter from ALL rows (not filtered)
    const userEmails = useMemo(() => Array.from(new Set(allRows.map(r => r.user_email).filter((e) => Boolean(e)))), [allRows]);
    const visibleRisks = useMemo(() => displayedData.map(r => ({ userId: r.user_id, riskCode: r.risk_code })), [displayedData]);
    const selectedVisibleCount = useMemo(() => visibleRisks.filter(r => isPriorityRisk(priorityRisks, r.userId, r.riskCode)).length, [visibleRisks, priorityRisks]);
    const isAllSelected = selectedVisibleCount > 0 && selectedVisibleCount === visibleRisks.length;
    const isSomeSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleRisks.length;
    const handleSelectAll = () => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            if (isAllSelected) {
                visibleRisks.forEach(r => newSet.delete(makePriorityKey(r.userId, r.riskCode)));
            }
            else {
                visibleRisks.forEach(r => newSet.add(makePriorityKey(r.userId, r.riskCode)));
            }
            return newSet;
        });
    };
    const handlePriorityChange = (userId, riskCode, checked) => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            const key = makePriorityKey(userId, riskCode);
            if (checked) {
                newSet.add(key);
            }
            else {
                newSet.delete(key);
            }
            return newSet;
        });
    };
    const handleExport = () => {
        if (priorityRisks.size === 0) {
            alert("Please select at least one priority risk to export.");
            return;
        }
        const dataToExport = displayedData
            .filter(r => isPriorityRisk(priorityRisks, r.user_id, r.risk_code))
            .map((r, index) => ({
            "S/N": index + 1,
            "Risk Code": r.risk_code,
            "Title": r.risk_title,
            "Description": r.risk_description,
            "Category": r.category,
            "Owner": r.owner,
            "Inherent Score": r.inherent_score.toFixed(2),
            "Residual Score": r.residual_score.toFixed(2),
            "Residual Bucket": bucket(r.likelihood_residual, r.impact_residual, config.matrixSize),
            "Status": r.status,
        }));
        exportToCsv("priority_risk_register.csv", dataToExport);
    };
    const handleBulkDelete = () => {
        if (priorityRisks.size === 0) {
            alert("Please select at least one risk to delete.");
            return;
        }
        setShowBulkDelete(true);
    };
    const handleBulkDeleteComplete = async () => {
        // Reload risks from database
        const updatedRisks = await loadRisks();
        // This would need to be passed from parent - for now just close dialog
        setShowBulkDelete(false);
        setPriorityRisks(new Set()); // Clear selections
        // Trigger a re-render by updating the parent
        window.location.reload(); // Simple solution - could be improved
    };
    const selectedRisksForBulkDelete = useMemo(() => {
        return displayedData
            .filter(r => isPriorityRisk(priorityRisks, r.user_id, r.risk_code))
            .map(r => ({ risk_code: r.risk_code, risk_title: r.risk_title }));
    }, [displayedData, priorityRisks]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-3 mb-4", children: [_jsx("div", { className: "col-span-1", children: _jsx(Input, { placeholder: "Search risks...", value: searchQuery, onChange: e => setSearchQuery(e.target.value) }) }), _jsx(MultiSelectPopover, { title: "Divisions", options: config.divisions, selected: filters.divisions, setSelected: v => setFilters(f => ({ ...f, divisions: v })) }), _jsx(MultiSelectPopover, { title: "Departments", options: config.departments, selected: filters.departments, setSelected: v => setFilters(f => ({ ...f, departments: v })) }), _jsx(MultiSelectPopover, { title: "Categories", options: config.categories, selected: filters.categories, setSelected: v => setFilters(f => ({ ...f, categories: v })) }), _jsx(MultiSelectPopover, { title: "Status", options: ["Open", "In Progress", "Closed"], selected: filters.statuses, setSelected: v => setFilters(f => ({ ...f, statuses: v })) })] }), _jsx(Card, { className: "rounded-2xl shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "text-sm text-gray-500", children: ["Showing ", displayedData.length, " of ", rowCount, " risks", priorityRisks.size > 0 && (_jsxs("span", { className: "ml-2 text-blue-600 font-medium", children: ["(", priorityRisks.size, " selected)"] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: handleExport, children: [_jsx(Table, { className: "mr-2 h-4 w-4" }), "Export CSV"] }), canEdit && priorityRisks.size > 0 && (_jsxs(Button, { variant: "destructive", size: "sm", onClick: handleBulkDelete, children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Bulk Delete (", priorityRisks.size, ")"] })), canEdit && _jsx(AddRiskDialog, { rows: rows, onAdd: onAdd, config: config })] })] }), _jsx("div", { className: "overflow-auto rounded-xl border bg-white", children: _jsxs("table", { className: "min-w-[980px] w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700 w-12", children: "S/N" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700 w-24", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "select-all", checked: isAllSelected ? true : isSomeSelected ? 'indeterminate' : false, onCheckedChange: handleSelectAll }), _jsx(Label, { htmlFor: "select-all", children: "Priority" })] }) }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Code" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Title" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Category" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Owner" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Period" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => requestSort('inherent_score'), children: ["LxI (Inh) ", _jsx(ArrowUpDown, { className: "ml-2 h-4 w-4" })] }) }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => requestSort('residual_score'), children: ["LxI (Res) ", _jsx(ArrowUpDown, { className: "ml-2 h-4 w-4" })] }) }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Bucket (Res)" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Status" }), isAdmin && (_jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: _jsx(MultiSelectPopover, { title: "User", options: userEmails, selected: filters.users, setSelected: v => setFilters(f => ({ ...f, users: v })) }) })), canEdit && _jsx("th", { className: "px-3 py-2 text-center font-semibold text-gray-700", children: "Actions" })] }) }), _jsx("tbody", { children: displayedData.map((r, index) => {
                                            const tag = bucket(r.likelihood_residual, r.impact_residual, config.matrixSize);
                                            const textColor = scoreColorText(tag);
                                            const bgColorClass = scoreColorClass(tag);
                                            return (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 text-center", children: index + 1 }), _jsx("td", { className: "px-3 py-2 text-center", children: _jsx(Checkbox, { checked: isPriorityRisk(priorityRisks, r.user_id, r.risk_code), onCheckedChange: (checked) => handlePriorityChange(r.user_id, r.risk_code, checked) }) }), _jsx("td", { className: "px-3 py-2 font-medium", children: r.risk_code }), _jsx("td", { className: "px-3 py-2", children: r.risk_title }), _jsx("td", { className: "px-3 py-2", children: r.category }), _jsx("td", { className: "px-3 py-2", children: r.owner }), _jsx("td", { className: "px-3 py-2 text-sm text-gray-600", children: r.relevant_period || '-' }), _jsx("td", { className: "px-3 py-2", children: r.inherent_score.toFixed(1) }), _jsx("td", { className: "px-3 py-2 font-semibold", children: r.residual_score.toFixed(1) }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `px-2 py-1 rounded-full text-xs ${bgColorClass} ${textColor}`, children: tag }) }), _jsx("td", { className: "px-3 py-2", children: r.status }), isAdmin && (_jsx("td", { className: "px-3 py-2 text-xs text-gray-600", children: r.user_email || 'N/A' })), canEdit && (_jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => onEdit(r), children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx(DeleteConfirmationDialog, { onConfirm: () => onRemove(r.risk_code), riskCode: r.risk_code })] }) }))] }, `${r.user_id}-${r.risk_code}`));
                                        }) })] }) })] }) }), _jsx(BulkDeletionDialog, { open: showBulkDelete, onOpenChange: setShowBulkDelete, selectedRisks: selectedRisksForBulkDelete, onComplete: handleBulkDeleteComplete })] }));
}
function ControlRegisterTab({ allRisks, priorityRisks, canEdit }) {
    const allControls = useMemo(() => {
        // Filter risks by priority if any are selected
        const risksToShow = priorityRisks.size === 0
            ? allRisks
            : allRisks.filter(risk => isPriorityRisk(priorityRisks, risk.user_id, risk.risk_code));
        return risksToShow.flatMap(risk => risk.controls.map(control => ({
            risk_code: risk.risk_code,
            ...control
        })));
    }, [allRisks, priorityRisks]);
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Control Register" }) }), _jsx(CardContent, { className: "p-4", children: _jsx("div", { className: "overflow-auto rounded-xl border bg-white", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Risk Code" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: "Control Description" }), _jsx("th", { className: "px-3 py-2 text-center font-semibold text-gray-700", children: "D" }), _jsx("th", { className: "px-3 py-2 text-center font-semibold text-gray-700", children: "I" }), _jsx("th", { className: "px-3 py-2 text-center font-semibold text-gray-700", children: "M" }), _jsx("th", { className: "px-3 py-2 text-center font-semibold text-gray-700", children: "E" })] }) }), _jsx("tbody", { children: allControls.map(control => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-medium", children: control.risk_code }), _jsx("td", { className: "px-3 py-2", children: control.description }), _jsx("td", { className: "px-3 py-2 text-center", children: control.design }), _jsx("td", { className: "px-3 py-2 text-center", children: control.implementation }), _jsx("td", { className: "px-3 py-2 text-center", children: control.monitoring }), _jsx("td", { className: "px-3 py-2 text-center", children: control.effectiveness_evaluation })] }, control.id))) })] }) }) })] }));
}
function HeatmapTab({ processedData, allRows, uniquePeriods, heatMapView, setHeatMapView, priorityRisks, config, onEditRisk, canEdit }) {
    const [selectedPeriods, setSelectedPeriods] = useState([]);
    const [dataSource, setDataSource] = useState('active');
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRisk, setSelectedRisk] = useState(null);
    const [exportingImage, setExportingImage] = useState(false);
    // Period comparison states
    const [comparisonMode, setComparisonMode] = useState(false);
    const [period1, setPeriod1] = useState('');
    const [period2, setPeriod2] = useState('');
    // Filter states
    const [filterDivision, setFilterDivision] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    // Load history data when switching to history view
    useEffect(() => {
        if (dataSource === 'history') {
            loadHistoryData();
        }
    }, [dataSource]);
    const loadHistoryData = async () => {
        setLoadingHistory(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase
                .from('risk_history')
                .select('*')
                .order('committed_date', { ascending: false });
            if (error)
                throw error;
            setHistoryData(data || []);
        }
        catch (error) {
            console.error('Error loading history:', error);
        }
        finally {
            setLoadingHistory(false);
        }
    };
    // Export heatmap as image
    const exportHeatmapAsImage = async () => {
        setExportingImage(true);
        try {
            const element = document.getElementById('heatmap-container');
            if (!element) {
                console.error('Heatmap container not found');
                return;
            }
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            });
            // Convert canvas to blob and download
            canvas.toBlob((blob) => {
                if (!blob)
                    return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().split('T')[0];
                const periodInfo = selectedPeriods.length > 0 ? `_${selectedPeriods.join('-')}` : '';
                link.href = url;
                link.download = `MinRisk-Heatmap_${timestamp}${periodInfo}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        }
        catch (error) {
            console.error('Error exporting heatmap:', error);
            alert('Failed to export heatmap. Please try again.');
        }
        finally {
            setExportingImage(false);
        }
    };
    // Get unique historical periods
    const historicalPeriods = useMemo(() => {
        const periods = new Set(historyData.map(r => r.period));
        return Array.from(periods);
    }, [historyData]);
    // Convert history data to ProcessedRisk format
    const processedHistoryData = useMemo(() => {
        return historyData.map(h => ({
            ...h,
            // Use stored residual values (fallback to inherent if not set for old data)
            likelihood_residual: h.likelihood_residual ?? h.likelihood_inherent,
            impact_residual: h.impact_residual ?? h.impact_inherent,
            controls: h.controls || []
        }));
    }, [historyData]);
    // Select data source and filter by selected periods
    const periodFilteredData = useMemo(() => {
        const sourceData = dataSource === 'active' ? processedData : processedHistoryData;
        if (selectedPeriods.length === 0)
            return sourceData;
        return sourceData.filter(r => {
            const period = r.relevant_period; // Both active and history data use relevant_period
            return period && selectedPeriods.includes(period);
        });
    }, [processedData, processedHistoryData, selectedPeriods, dataSource]);
    // Apply additional filters (Division, Department, Category, Owner, Status) and Search
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return periodFilteredData.filter(r => {
            // Search filter
            if (searchQuery && !(r.risk_code?.toLowerCase().includes(query) ||
                r.risk_title?.toLowerCase().includes(query) ||
                r.risk_description?.toLowerCase().includes(query) ||
                r.category?.toLowerCase().includes(query) ||
                r.owner?.toLowerCase().includes(query)))
                return false;
            // Other filters
            if (filterDivision !== 'all' && r.division !== filterDivision)
                return false;
            if (filterDepartment !== 'all' && r.department !== filterDepartment)
                return false;
            if (filterCategory !== 'all' && r.category !== filterCategory)
                return false;
            if (filterOwner !== 'all' && r.owner !== filterOwner)
                return false;
            if (filterStatus !== 'all' && r.status !== filterStatus)
                return false;
            return true;
        });
    }, [periodFilteredData, searchQuery, filterDivision, filterDepartment, filterCategory, filterOwner, filterStatus]);
    const heatmapData = useMemo(() => {
        const grid = Array(config.matrixSize).fill(0).map(() => Array(config.matrixSize).fill(0).map(() => ({ inherent: [], residual: [] })));
        // For history view, show all risks. For active view, filter by priority
        const dataToPlot = dataSource === 'history'
            ? filteredData
            : filteredData.filter(r => isPriorityRisk(priorityRisks, r.user_id, r.risk_code));
        dataToPlot.forEach(risk => {
            if (heatMapView.inherent) {
                const i = risk.impact_inherent - 1;
                const l = risk.likelihood_inherent - 1;
                if (i >= 0 && i < config.matrixSize && l >= 0 && l < config.matrixSize) {
                    grid[i][l].inherent.push(risk);
                }
            }
            if (heatMapView.residual) {
                const i = Math.round(risk.impact_residual) - 1;
                const l = Math.round(risk.likelihood_residual) - 1;
                if (i >= 0 && i < config.matrixSize && l >= 0 && l < config.matrixSize) {
                    grid[i][l].residual.push(risk);
                }
            }
        });
        return grid;
    }, [filteredData, priorityRisks, heatMapView, config.matrixSize, dataSource]);
    // Get unique values for filters from the current data source
    const uniqueValues = useMemo(() => {
        const sourceData = dataSource === 'active' ? processedData : processedHistoryData;
        return {
            divisions: Array.from(new Set(sourceData.map(r => r.division))).filter(Boolean).sort(),
            departments: Array.from(new Set(sourceData.map(r => r.department))).filter(Boolean).sort(),
            categories: Array.from(new Set(sourceData.map(r => r.category))).filter(Boolean).sort(),
            owners: Array.from(new Set(sourceData.map(r => r.owner))).filter(Boolean).sort(),
            statuses: Array.from(new Set(sourceData.map(r => r.status))).filter(Boolean).sort()
        };
    }, [processedData, processedHistoryData, dataSource]);
    // Period comparison data
    const comparisonData = useMemo(() => {
        if (!comparisonMode || !period1 || !period2)
            return null;
        const sourceData = dataSource === 'active' ? processedData : processedHistoryData;
        const period1Data = sourceData.filter(r => r.relevant_period === period1);
        const period2Data = sourceData.filter(r => r.relevant_period === period2);
        // Calculate risk movements
        const movements = [];
        period1Data.forEach(risk1 => {
            const risk2 = period2Data.find(r => r.risk_code === risk1.risk_code);
            if (risk2) {
                const from = { l: Math.round(risk1.likelihood_residual), i: Math.round(risk1.impact_residual) };
                const to = { l: Math.round(risk2.likelihood_residual), i: Math.round(risk2.impact_residual) };
                const score1 = from.l * from.i;
                const score2 = to.l * to.i;
                if (from.l !== to.l || from.i !== to.i) {
                    movements.push({
                        risk: risk2,
                        from,
                        to,
                        improved: score2 < score1
                    });
                }
            }
        });
        return {
            period1Data,
            period2Data,
            movements,
            stats: {
                improved: movements.filter(m => m.improved).length,
                deteriorated: movements.filter(m => !m.improved).length,
                unchanged: period2Data.length - movements.length,
                new: period2Data.filter(r2 => !period1Data.find(r1 => r1.risk_code === r2.risk_code)).length
            }
        };
    }, [comparisonMode, period1, period2, processedData, processedHistoryData, dataSource]);
    return (_jsx(Card, { className: "rounded-2xl shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "mb-3 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-sm text-gray-500", children: [dataSource === 'active'
                                            ? `Displaying ${filteredData.filter(r => isPriorityRisk(priorityRisks, r.user_id, r.risk_code)).length} priority risk(s)`
                                            : `Displaying ${filteredData.length} historical risk(s)`, selectedPeriods.length > 0 && _jsxs("span", { className: "ml-2 text-blue-600 font-medium", children: ["(", selectedPeriods.join(', '), ")"] }), loadingHistory && _jsx("span", { className: "ml-2 text-gray-400", children: "(Loading history...)" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs(Button, { size: "sm", variant: "outline", onClick: exportHeatmapAsImage, disabled: exportingImage, className: "gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), exportingImage ? 'Exporting...' : 'Export Image'] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "showInherent", checked: heatMapView.inherent, onCheckedChange: c => setHeatMapView(v => ({ ...v, inherent: !!c })) }), _jsx("label", { htmlFor: "showInherent", className: "text-sm", children: "Show Inherent" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "showResidual", checked: heatMapView.residual, onCheckedChange: c => setHeatMapView(v => ({ ...v, residual: !!c })) }), _jsx("label", { htmlFor: "showResidual", className: "text-sm", children: "Show Residual" })] })] })] }), _jsxs("div", { className: "flex items-center gap-4 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Data Source:" }), _jsxs(Select, { value: dataSource, onValueChange: (v) => { setDataSource(v); setSelectedPeriods([]); setComparisonMode(false); }, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "active", children: "Active Risks" }), _jsx(SelectItem, { value: "history", children: "Risk History" })] })] })] }), (dataSource === 'history' || (dataSource === 'active' && uniquePeriods.length >= 2)) && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "comparisonMode", checked: comparisonMode, onCheckedChange: (checked) => {
                                                setComparisonMode(!!checked);
                                                if (!checked) {
                                                    setPeriod1('');
                                                    setPeriod2('');
                                                }
                                            } }), _jsx("label", { htmlFor: "comparisonMode", className: "text-sm font-medium cursor-pointer", children: "Compare Periods" })] })), comparisonMode && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Period 1:" }), _jsxs(Select, { value: period1, onValueChange: setPeriod1, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Select..." }) }), _jsx(SelectContent, { children: (dataSource === 'active' ? uniquePeriods : historicalPeriods).map(p => (_jsx(SelectItem, { value: p, disabled: p === period2, children: p }, p))) })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Period 2:" }), _jsxs(Select, { value: period2, onValueChange: setPeriod2, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Select..." }) }), _jsx(SelectContent, { children: (dataSource === 'active' ? uniquePeriods : historicalPeriods).map(p => (_jsx(SelectItem, { value: p, disabled: p === period1, children: p }, p))) })] })] })] })), !comparisonMode && (dataSource === 'active' ? uniquePeriods.length > 0 : historicalPeriods.length > 0) && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Filter by Period:" }), _jsx(MultiSelectPopover, { title: "Periods", options: dataSource === 'active' ? uniquePeriods : historicalPeriods, selected: selectedPeriods, setSelected: setSelectedPeriods })] }))] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm", children: [_jsx(Input, { placeholder: "Search risks...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "w-64" }), _jsxs(Select, { value: filterDivision, onValueChange: setFilterDivision, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Division" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Divisions" }), uniqueValues.divisions.map(d => _jsx(SelectItem, { value: d, children: d }, d))] })] }), _jsxs(Select, { value: filterDepartment, onValueChange: setFilterDepartment, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Department" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Departments" }), uniqueValues.departments.map(d => _jsx(SelectItem, { value: d, children: d }, d))] })] }), _jsxs(Select, { value: filterCategory, onValueChange: setFilterCategory, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Category" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Categories" }), uniqueValues.categories.map(c => _jsx(SelectItem, { value: c, children: c }, c))] })] }), _jsxs(Select, { value: filterOwner, onValueChange: setFilterOwner, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Owner" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Owners" }), uniqueValues.owners.map(o => _jsx(SelectItem, { value: o, children: o }, o))] })] }), _jsxs(Select, { value: filterStatus, onValueChange: setFilterStatus, children: [_jsx(SelectTrigger, { className: "w-32", children: _jsx(SelectValue, { placeholder: "Status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Statuses" }), uniqueValues.statuses.map(s => _jsx(SelectItem, { value: s, children: s }, s))] })] })] })] }), comparisonMode && comparisonData && (_jsxs("div", { className: "mb-4 grid grid-cols-4 gap-3", children: [_jsx(Card, { className: "bg-green-50", children: _jsxs(CardContent, { className: "p-3", children: [_jsx("div", { className: "text-xs text-gray-600", children: "Improved" }), _jsx("div", { className: "text-2xl font-bold text-green-700", children: comparisonData.stats.improved })] }) }), _jsx(Card, { className: "bg-red-50", children: _jsxs(CardContent, { className: "p-3", children: [_jsx("div", { className: "text-xs text-gray-600", children: "Deteriorated" }), _jsx("div", { className: "text-2xl font-bold text-red-700", children: comparisonData.stats.deteriorated })] }) }), _jsx(Card, { className: "bg-gray-50", children: _jsxs(CardContent, { className: "p-3", children: [_jsx("div", { className: "text-xs text-gray-600", children: "Unchanged" }), _jsx("div", { className: "text-2xl font-bold text-gray-700", children: comparisonData.stats.unchanged })] }) }), _jsx(Card, { className: "bg-blue-50", children: _jsxs(CardContent, { className: "p-3", children: [_jsx("div", { className: "text-xs text-gray-600", children: "New Risks" }), _jsx("div", { className: "text-2xl font-bold text-blue-700", children: comparisonData.stats.new })] }) })] })), (!comparisonMode || !comparisonData) && (_jsxs("div", { id: "heatmap-container", className: "flex", children: [_jsx("div", { className: "flex flex-col justify-start pt-8 pr-2", children: Array.from({ length: config.matrixSize }, (_, i) => config.matrixSize - i).map(imp => (_jsx("div", { className: "h-20 flex items-center justify-center text-xs font-semibold", children: config.impactLabels[imp - 1] }, imp))) }), _jsxs("div", { className: "flex-grow", children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${config.matrixSize}, 1fr)` }, children: heatmapData.slice().reverse().map((row, impIndex) => (row.map((cell, probIndex) => {
                                        const impact = config.matrixSize - impIndex;
                                        const likelihood = probIndex + 1;
                                        const bucketName = bucket(likelihood, impact, config.matrixSize);
                                        const bgColor = scoreColor(bucketName);
                                        const allRisksInCell = [...new Map([...cell.inherent, ...cell.residual].map(item => [item['risk_code'], item])).values()];
                                        // Check if this cell should be highlighted
                                        const isHighlighted = selectedRisk && ((Math.round(selectedRisk.likelihood_inherent) === likelihood && Math.round(selectedRisk.impact_inherent) === impact) ||
                                            (Math.round(selectedRisk.likelihood_residual) === likelihood && Math.round(selectedRisk.impact_residual) === impact));
                                        // Check if this cell is the "target" cell (the opposite position of selected risk)
                                        const isTargetCell = selectedRisk && ((heatMapView.inherent && !heatMapView.residual && Math.round(selectedRisk.likelihood_residual) === likelihood && Math.round(selectedRisk.impact_residual) === impact) ||
                                            (heatMapView.residual && !heatMapView.inherent && Math.round(selectedRisk.likelihood_inherent) === likelihood && Math.round(selectedRisk.impact_inherent) === impact) ||
                                            (heatMapView.inherent && heatMapView.residual && ((Math.round(selectedRisk.likelihood_residual) === likelihood && Math.round(selectedRisk.impact_residual) === impact && Math.round(selectedRisk.likelihood_inherent) !== likelihood) ||
                                                (Math.round(selectedRisk.likelihood_inherent) === likelihood && Math.round(selectedRisk.impact_inherent) === impact && Math.round(selectedRisk.likelihood_residual) !== likelihood))));
                                        return (_jsxs(Popover, { onOpenChange: (open) => { if (!open)
                                                setSelectedRisk(null); }, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: `h-20 border flex items-center justify-center p-1 relative cursor-pointer transition-all ${isTargetCell ? 'border-4 border-amber-500 shadow-lg' :
                                                            isHighlighted ? 'border-2 border-purple-600' :
                                                                'border-gray-200'}`, style: { backgroundColor: `${bgColor}E6` }, children: _jsxs("div", { className: "flex gap-2 text-lg font-bold", children: [heatMapView.inherent && cell.inherent.length > 0 && _jsx("span", { className: "text-blue-700", children: cell.inherent.length }), heatMapView.inherent && heatMapView.residual && cell.inherent.length > 0 && cell.residual.length > 0 && _jsx("span", { className: "text-gray-400", children: "/" }), heatMapView.residual && cell.residual.length > 0 && _jsx("span", { className: "text-rose-700", children: cell.residual.length })] }) }) }), allRisksInCell.length > 0 && (_jsxs(PopoverContent, { className: "w-96", children: [_jsxs("div", { className: "font-bold text-sm mb-2", children: ["Risks in cell (L:", likelihood, ", I:", impact, ")"] }), selectedRisk && (_jsxs("div", { className: "mb-2 text-xs bg-amber-50 border border-amber-300 rounded p-2", children: [_jsx("span", { className: "font-semibold text-amber-800", children: "\uD83D\uDCA1 Tip:" }), " The amber-highlighted cell shows where this risk moved to/from"] })), _jsxs("div", { className: "max-h-60 overflow-y-auto", children: [heatMapView.inherent && cell.inherent.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-blue-700 mt-2", children: "Inherent Position" }), cell.inherent.map(risk => (_jsxs("div", { className: `border-b p-2 text-xs ${selectedRisk?.risk_code === risk.risk_code ? 'bg-purple-100' : ''}`, children: [_jsxs("button", { className: "w-full text-left hover:bg-gray-100 p-1 rounded", onClick: (e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedRisk(risk);
                                                                                    }, children: [_jsxs("p", { className: "font-bold", children: [risk.risk_code, ": ", risk.risk_title] }), _jsxs("p", { className: "text-gray-600 text-xs", children: ["Inherent (L:", risk.likelihood_inherent, ", I:", risk.impact_inherent, ") \u2192 Residual (L:", risk.likelihood_residual.toFixed(1), ", I:", risk.impact_residual.toFixed(1), ")"] })] }), canEdit && (_jsx("button", { className: "text-blue-600 hover:underline text-xs mt-1", onClick: () => onEditRisk(risk), children: "Edit Risk" }))] }, risk.risk_code)))] })), heatMapView.residual && cell.residual.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-rose-700 mt-2", children: "Residual Position" }), cell.residual.map(risk => (_jsxs("div", { className: `border-b p-2 text-xs ${selectedRisk?.risk_code === risk.risk_code ? 'bg-purple-100' : ''}`, children: [_jsxs("button", { className: "w-full text-left hover:bg-gray-100 p-1 rounded", onClick: (e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedRisk(risk);
                                                                                    }, children: [_jsxs("p", { className: "font-bold", children: [risk.risk_code, ": ", risk.risk_title] }), _jsxs("p", { className: "text-gray-600 text-xs", children: ["Inherent (L:", risk.likelihood_inherent, ", I:", risk.impact_inherent, ") \u2192 Residual (L:", risk.likelihood_residual.toFixed(1), ", I:", risk.impact_residual.toFixed(1), ")"] })] }), canEdit && (_jsx("button", { className: "text-blue-600 hover:underline text-xs mt-1", onClick: () => onEditRisk(risk), children: "Edit Risk" }))] }, risk.risk_code)))] }))] })] }))] }, `${likelihood}-${impact}`));
                                    }))) }), _jsx("div", { className: "flex justify-between pl-8 pr-8", children: Array.from({ length: config.matrixSize }, (_, i) => i + 1).map(lik => (_jsx("div", { className: "w-20 text-center text-xs font-semibold", children: config.likelihoodLabels[lik - 1] }, lik))) })] })] })), comparisonMode && comparisonData && (_jsx("div", { id: "heatmap-container", className: "grid grid-cols-2 gap-6", children: [
                        { data: comparisonData.period1Data, period: period1, title: `Period 1: ${period1}` },
                        { data: comparisonData.period2Data, period: period2, title: `Period 2: ${period2}` }
                    ].map(({ data, period, title }, idx) => {
                        // Build heatmap grid for this period
                        const grid = Array(config.matrixSize).fill(0).map(() => Array(config.matrixSize).fill(0).map(() => []));
                        data.forEach(risk => {
                            const i = Math.round(risk.impact_residual) - 1;
                            const l = Math.round(risk.likelihood_residual) - 1;
                            if (i >= 0 && i < config.matrixSize && l >= 0 && l < config.matrixSize) {
                                grid[i][l].push(risk);
                            }
                        });
                        return (_jsxs("div", { className: "border rounded-lg p-3", children: [_jsx("h3", { className: "text-sm font-bold mb-2 text-center", children: title }), _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex flex-col justify-start pt-6 pr-1", children: Array.from({ length: config.matrixSize }, (_, i) => config.matrixSize - i).map(imp => (_jsx("div", { className: "h-16 flex items-center justify-center text-[10px] font-semibold", children: config.impactLabels[imp - 1] }, imp))) }), _jsxs("div", { className: "flex-grow", children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: `repeat(${config.matrixSize}, 1fr)` }, children: grid.slice().reverse().map((row, impIndex) => (row.map((risks, probIndex) => {
                                                        const impact = config.matrixSize - impIndex;
                                                        const likelihood = probIndex + 1;
                                                        const bucketName = bucket(likelihood, impact, config.matrixSize);
                                                        const bgColor = scoreColor(bucketName);
                                                        // Check if risks moved (for highlighting)
                                                        const movedRisks = risks.filter((r) => comparisonData.movements.find(m => m.risk.risk_code === r.risk_code));
                                                        const improvedCount = movedRisks.filter((r) => {
                                                            const movement = comparisonData.movements.find(m => m.risk.risk_code === r.risk_code);
                                                            return movement?.improved && idx === 1; // Only show in period 2
                                                        }).length;
                                                        const deterioratedCount = movedRisks.filter((r) => {
                                                            const movement = comparisonData.movements.find(m => m.risk.risk_code === r.risk_code);
                                                            return movement && !movement.improved && idx === 1; // Only show in period 2
                                                        }).length;
                                                        return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs("div", { className: "h-16 border border-gray-200 flex flex-col items-center justify-center p-1 relative cursor-pointer", style: { backgroundColor: `${bgColor}E6` }, children: [_jsx("div", { className: "text-base font-bold", children: risks.length }), idx === 1 && (improvedCount > 0 || deterioratedCount > 0) && (_jsxs("div", { className: "text-[10px] flex gap-1", children: [improvedCount > 0 && _jsxs("span", { className: "text-green-700", children: ["\u2193", improvedCount] }), deterioratedCount > 0 && _jsxs("span", { className: "text-red-700", children: ["\u2191", deterioratedCount] })] }))] }) }), risks.length > 0 && (_jsxs(PopoverContent, { className: "w-80", children: [_jsxs("div", { className: "font-bold text-xs mb-2", children: [title, " - Cell (L:", likelihood, ", I:", impact, ")"] }), _jsx("div", { className: "max-h-48 overflow-y-auto text-xs space-y-1", children: risks.map((risk) => {
                                                                                const movement = comparisonData.movements.find(m => m.risk.risk_code === risk.risk_code);
                                                                                return (_jsxs("div", { className: "border-b pb-1", children: [_jsxs("div", { className: "font-semibold", children: [risk.risk_code, ": ", risk.risk_title] }), movement && idx === 1 && (_jsxs("div", { className: `text-[10px] ${movement.improved ? 'text-green-600' : 'text-red-600'}`, children: [movement.improved ? '✓ Improved' : '⚠ Deteriorated', " from L:", movement.from.l, ", I:", movement.from.i] }))] }, risk.risk_code));
                                                                            }) })] }))] }, `${likelihood}-${impact}`));
                                                    }))) }), _jsx("div", { className: "flex justify-between px-1", children: Array.from({ length: config.matrixSize }, (_, i) => i + 1).map(lik => (_jsx("div", { className: "w-16 text-center text-[10px] font-semibold", children: config.likelihoodLabels[lik - 1] }, lik))) })] })] })] }, idx));
                    }) }))] }) }));
}
function RiskHistoryTab({ config, showToast, isAdmin }) {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    useEffect(() => {
        loadHistory();
    }, []);
    const loadHistory = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase
                .from('risk_history')
                .select('*')
                .order('committed_date', { ascending: false });
            if (error)
                throw error;
            setHistoryData(data || []);
        }
        catch (error) {
            console.error('Error loading history:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRestore = async (period) => {
        if (!confirm(`Restore ${period}? This will move all risks back to the active register for editing.`)) {
            return;
        }
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('restore_user_period', { target_period: period });
            if (error)
                throw error;
            if (data?.success) {
                showToast(`Period ${period} restored. ${data.restored_count} risk(s) moved back to active register.`);
                await loadHistory();
            }
            else {
                showToast(data?.error || 'Failed to restore period', 'error');
            }
        }
        catch (error) {
            console.error('Error restoring period:', error);
            showToast(error.message || 'Failed to restore period', 'error');
        }
    };
    const [showCopyDialog, setShowCopyDialog] = useState(false);
    const [copySourcePeriod, setCopySourcePeriod] = useState('');
    const [copyTargetPeriod, setCopyTargetPeriod] = useState('');
    const handleCopyToNewPeriod = async (sourcePeriod, historyData) => {
        setCopySourcePeriod(sourcePeriod);
        setShowCopyDialog(true);
    };
    const executeCopy = async () => {
        if (!copyTargetPeriod || copyTargetPeriod.trim() === '') {
            showToast('Please select a target period', 'error');
            return;
        }
        try {
            // Fetch historical risks from the source period
            const { supabase } = await import('@/lib/supabase');
            const { data: historicalRisks, error: historyError } = await supabase
                .from('risk_history')
                .select('*')
                .eq('period', copySourcePeriod);
            if (historyError)
                throw historyError;
            if (!historicalRisks || historicalRisks.length === 0) {
                showToast('No risks found in the selected period', 'error');
                return;
            }
            // Get existing risk codes to avoid duplicates
            const { data: existingRisks } = await supabase
                .from('risks')
                .select('risk_code');
            const existingCodes = new Set((existingRisks || []).map(r => r.risk_code));
            // Generate unique risk codes for duplicates
            const generateUniqueCode = (baseCode) => {
                let newCode = baseCode;
                let counter = 1;
                while (existingCodes.has(newCode)) {
                    newCode = `${baseCode}-${counter}`;
                    counter++;
                }
                existingCodes.add(newCode);
                return newCode;
            };
            // Create new risks with the new period and controls
            // Controls are stored as JSON in risk_history
            const { bulkImportRisks } = await import('@/lib/database');
            const newRisks = historicalRisks.map(risk => ({
                risk_code: generateUniqueCode(risk.risk_code),
                risk_title: risk.risk_title,
                risk_description: risk.risk_description,
                division: risk.division,
                department: risk.department,
                category: risk.category,
                owner: risk.owner,
                relevant_period: copyTargetPeriod.trim(),
                likelihood_inherent: risk.likelihood_inherent,
                impact_inherent: risk.impact_inherent,
                status: risk.status,
                controls: risk.controls || [] // Controls are stored as JSON in risk_history
            }));
            const result = await bulkImportRisks(newRisks);
            if (result.success) {
                showToast(`Successfully copied ${result.count} risk(s) with controls from ${copySourcePeriod} to ${copyTargetPeriod.trim()}`);
                setShowCopyDialog(false);
                setCopyTargetPeriod('');
                // Reload history data to refresh the view
                await loadHistory();
            }
            else {
                showToast(result.error || 'Failed to copy risks', 'error');
            }
        }
        catch (error) {
            console.error('Error copying risks:', error);
            showToast(error.message || 'Failed to copy risks to new period', 'error');
        }
    };
    const handleDelete = async (period) => {
        if (!confirm(`⚠️ PERMANENTLY DELETE ${period}? This cannot be undone! All committed risks for this period will be lost.`)) {
            return;
        }
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('delete_user_period', { target_period: period });
            if (error)
                throw error;
            if (data?.success) {
                showToast(`Period ${period} permanently deleted. ${data.deleted_count} risk(s) removed from history.`);
                await loadHistory();
            }
            else {
                showToast(data?.error || 'Failed to delete period', 'error');
            }
        }
        catch (error) {
            console.error('Error deleting period:', error);
            showToast(error.message || 'Failed to delete period', 'error');
        }
    };
    const handleBulkDeleteAll = async () => {
        if (!confirm(`⚠️ ADMIN BULK DELETE - DELETE ALL HISTORY?\n\nThis will PERMANENTLY DELETE ALL committed periods from ALL users in the system. This action CANNOT be undone!\n\nAre you absolutely sure you want to proceed?`)) {
            return;
        }
        if (!confirm(`FINAL CONFIRMATION: Type DELETE in your mind and click OK to proceed with deleting ALL history data.`)) {
            return;
        }
        try {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase
                .from('risk_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
            if (error)
                throw error;
            showToast(`All history deleted successfully.`);
            await loadHistory();
        }
        catch (error) {
            console.error('Error bulk deleting history:', error);
            showToast(error.message || 'Failed to delete all history', 'error');
        }
    };
    // Get unique periods from history
    const uniquePeriods = useMemo(() => {
        const periods = new Set(historyData.map(r => r.period));
        return Array.from(periods);
    }, [historyData]);
    // Filter by selected period
    const filteredHistory = useMemo(() => {
        if (!selectedPeriod)
            return historyData;
        return historyData.filter(r => r.period === selectedPeriod);
    }, [historyData, selectedPeriod]);
    if (loading) {
        return _jsx("div", { className: "p-8 text-center", children: "Loading history..." });
    }
    if (historyData.length === 0) {
        return (_jsx(Card, { className: "rounded-2xl shadow-sm", children: _jsx(CardContent, { className: "p-8 text-center", children: _jsx("p", { className: "text-gray-500", children: "No committed periods yet. Use the \"Commit Period\" button to save your risks to history." }) }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "My Risk History" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Label, { children: "Filter by Period:" }), _jsxs(Select, { value: selectedPeriod || "all", onValueChange: (v) => setSelectedPeriod(v === "all" ? null : v), children: [_jsx(SelectTrigger, { className: "w-48", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Periods" }), uniquePeriods.map(p => (_jsx(SelectItem, { value: p, children: p }, p)))] })] })] }), selectedPeriod && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleCopyToNewPeriod(selectedPeriod, historyData), children: "Copy to New Period" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => handleRestore(selectedPeriod), children: ["Restore ", selectedPeriod] }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: () => handleDelete(selectedPeriod), children: ["Delete ", selectedPeriod] })] }))] }), _jsx("div", { className: "overflow-auto rounded-xl border bg-white", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100 sticky top-0", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Period" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Risk Code" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Title" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Division" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Department" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Category" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Owner" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "LxI (Inh)" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Inherent Risk" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "LxI (Res)" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Residual Risk" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Status" }), _jsx("th", { className: "px-3 py-2 text-left font-semibold", children: "Committed Date" })] }) }), _jsx("tbody", { children: filteredHistory.map((risk, index) => {
                                                const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
                                                const inherentLevel = bucket(risk.likelihood_inherent, risk.impact_inherent, config.matrixSize);
                                                // Use stored residual values from history (fallback to inherent if not set)
                                                const likelihoodRes = risk.likelihood_residual ?? risk.likelihood_inherent;
                                                const impactRes = risk.impact_residual ?? risk.impact_inherent;
                                                const residualScore = likelihoodRes * impactRes;
                                                const residualLevel = bucket(likelihoodRes, impactRes, config.matrixSize);
                                                return (_jsxs("tr", { className: `border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`, children: [_jsx("td", { className: "px-3 py-2 font-medium", children: risk.period }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: risk.risk_code }), _jsx("td", { className: "px-3 py-2", children: risk.risk_title }), _jsx("td", { className: "px-3 py-2", children: risk.division }), _jsx("td", { className: "px-3 py-2", children: risk.department }), _jsx("td", { className: "px-3 py-2", children: risk.category }), _jsx("td", { className: "px-3 py-2", children: risk.owner }), _jsx("td", { className: "px-3 py-2 text-center font-medium", children: inherentScore.toFixed(1) }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `px-2 py-1 rounded text-xs font-semibold ${inherentLevel === 'Minimal' ? 'bg-green-100 text-green-800' :
                                                                    inherentLevel === 'Low' ? 'bg-green-200 text-green-900' :
                                                                        inherentLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                                            inherentLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                                                                                'bg-red-100 text-red-800'}`, children: inherentLevel }) }), _jsx("td", { className: "px-3 py-2 text-center font-medium", children: residualScore.toFixed(1) }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `px-2 py-1 rounded text-xs font-semibold ${residualLevel === 'Minimal' ? 'bg-green-100 text-green-800' :
                                                                    residualLevel === 'Low' ? 'bg-green-200 text-green-900' :
                                                                        residualLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                                            residualLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                                                                                'bg-red-100 text-red-800'}`, children: residualLevel }) }), _jsx("td", { className: "px-3 py-2", children: risk.status }), _jsx("td", { className: "px-3 py-2 text-xs", children: new Date(risk.committed_date).toLocaleDateString() })] }, risk.id));
                                            }) })] }) }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Showing ", filteredHistory.length, " committed risk(s) ", selectedPeriod ? `for ${selectedPeriod}` : 'across all periods'] })] })] }), _jsx(Dialog, { open: showCopyDialog, onOpenChange: setShowCopyDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Copy Risks to New Period" }), _jsxs(DialogDescription, { children: ["Select a target period to copy all risks and controls from ", copySourcePeriod, " to the active risk register."] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium", children: "Source Period" }), _jsx(Input, { value: copySourcePeriod, readOnly: true, className: "bg-gray-100" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium", children: "Target Period" }), _jsxs(Select, { value: copyTargetPeriod, onValueChange: setCopyTargetPeriod, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select target period..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Q1 2025", children: "Q1 2025" }), _jsx(SelectItem, { value: "Q2 2025", children: "Q2 2025" }), _jsx(SelectItem, { value: "Q3 2025", children: "Q3 2025" }), _jsx(SelectItem, { value: "Q4 2025", children: "Q4 2025" }), _jsx(SelectItem, { value: "Q1 2026", children: "Q1 2026" }), _jsx(SelectItem, { value: "Q2 2026", children: "Q2 2026" }), _jsx(SelectItem, { value: "Q3 2026", children: "Q3 2026" }), _jsx(SelectItem, { value: "Q4 2026", children: "Q4 2026" }), _jsx(SelectItem, { value: "FY2025", children: "FY2025" }), _jsx(SelectItem, { value: "FY2026", children: "FY2026" })] })] })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowCopyDialog(false), children: "Cancel" }), _jsx(Button, { onClick: executeCopy, children: "Copy Risks" })] })] }) })] }));
}
function RiskImportTab({ onImport, currentConfig, canEdit }) {
    const [parsedData, setParsedData] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [discoveredConfig, setDiscoveredConfig] = useState(null);
    const [pastedData, setPastedData] = useState('');
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file)
            return;
        setFileName(file.name);
        file.text().then(text => {
            const result = parseCsvToJson(text);
            const { data, discovered } = processParsedRiskData(result, currentConfig.matrixSize);
            setParsedData(data);
            setDiscoveredConfig(discovered);
        });
    }, [currentConfig.matrixSize]);
    const handlePaste = () => {
        if (!pastedData.trim())
            return;
        setFileName('Pasted from Excel');
        const lines = pastedData.trim().split('\n');
        const headerLine = lines[0];
        const tabCount = (headerLine.match(/\t/g) || []).length;
        // Check if we have the expected number of columns (8 tabs = 9 columns)
        if (tabCount < 8) {
            alert(`⚠️ Column mismatch detected!\n\nExpected 9 columns (8 tabs between them), but found ${tabCount + 1} columns.\n\nPlease ensure:\n1. All columns in Excel are wide enough to show full content\n2. You're selecting ALL columns including the last one (status)\n3. Try widening your Excel columns before copying\n\nClick "Show Example" to see the correct format.`);
            return;
        }
        // Convert tab-separated paste data to CSV
        const csvText = lines.map(line => {
            if (line.includes('\t')) {
                return line.split('\t').map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
            }
            return line;
        }).join('\n');
        const result = parseCsvToJson(csvText);
        const { data, discovered } = processParsedRiskData(result, currentConfig.matrixSize);
        setParsedData(data);
        setDiscoveredConfig(discovered);
        setPastedData('');
    };
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });
    const handleImport = () => { if (!discoveredConfig)
        return; const validRisks = parsedData.filter(r => !r.errors || r.errors.length === 0); onImport(validRisks, discoveredConfig); setParsedData([]); setFileName(null); setDiscoveredConfig(null); };
    const validRows = useMemo(() => parsedData.filter(r => !r.errors || r.errors.length === 0), [parsedData]);
    const invalidRowsCount = useMemo(() => parsedData.length - validRows.length, [parsedData, validRows]);
    const newDiscoveries = useMemo(() => { if (!discoveredConfig)
        return null; const newDivisions = discoveredConfig.divisions.filter(d => !currentConfig.divisions.includes(d)); const newDepartments = discoveredConfig.departments.filter(d => !currentConfig.departments.includes(d)); const newCategories = discoveredConfig.categories.filter(c => !currentConfig.categories.includes(c)); const counts = [newDivisions.length > 0 ? `${newDivisions.length} new division(s)` : '', newDepartments.length > 0 ? `${newDepartments.length} new department(s)` : '', newCategories.length > 0 ? `${newCategories.length} new category(s)` : ''].filter(Boolean); return { counts, total: newDivisions.length + newDepartments.length + newCategories.length }; }, [discoveredConfig, currentConfig]);
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Import Risks from CSV or Excel" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { ...getRootProps(), className: `p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx("input", { ...getInputProps() }), _jsx(FileUp, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: isDragActive ? "Drop the file here ..." : "Drag 'n' drop a CSV file here, or click to select file" }), _jsx("p", { className: "text-xs text-gray-500", children: "Required columns: risk_title, risk_description, division, department, category, owner, likelihood_inherent, impact_inherent, status" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-white text-gray-500", children: "OR" }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Paste from Excel" }), _jsx("p", { className: "text-xs text-gray-600", children: "Select and copy cells from Excel (including headers). Make sure all columns are fully visible and not truncated before copying." }), _jsx(Textarea, { placeholder: "Copy cells from Excel and paste here (with headers)...", value: pastedData, onChange: e => setPastedData(e.target.value), rows: 6, className: "font-mono text-xs" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handlePaste, disabled: !pastedData.trim(), size: "sm", children: "Process Pasted Data" }), _jsx(Button, { onClick: () => setPastedData('risk_title\trisk_description\tdivision\tdepartment\tcategory\towner\tlikelihood_inherent\timpact_inherent\tstatus\nOperational Risk\tErroneous fee amounts computed/collected as a result of manual computation process on Ms. Excel\tOperations\tCOG\tFinancial\tOPD\t2\t4\tOpen'), variant: "outline", size: "sm", children: "Show Example" })] })] }), fileName && _jsxs("p", { className: "text-sm font-medium", children: ["Previewing: ", _jsx("span", { className: "font-normal text-gray-700", children: fileName })] }), parsedData.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "overflow-auto rounded-xl border bg-white max-h-96", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100 sticky top-0", children: _jsx("tr", { children: ["Title", "Category", "Owner", "L (Inh)", "I (Inh)", "Status", "Errors"].map(h => _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: h }, h)) }) }), _jsx("tbody", { children: parsedData.map((row, index) => (_jsxs("tr", { className: `border-t ${row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}`, children: [_jsx("td", { className: "px-3 py-2", children: row.risk_title }), _jsx("td", { className: "px-3 py-2", children: row.category }), _jsx("td", { className: "px-3 py-2", children: row.owner }), _jsx("td", { className: "px-3 py-2", children: isNaN(row.likelihood_inherent) ? '' : row.likelihood_inherent }), _jsx("td", { className: "px-3 py-2", children: isNaN(row.impact_inherent) ? '' : row.impact_inherent }), _jsx("td", { className: "px-3 py-2", children: row.status }), _jsx("td", { className: "px-3 py-2 text-red-600 text-xs", children: row.errors?.join(', ') })] }, index))) })] }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-sm text-gray-600 space-y-1", children: [invalidRowsCount > 0 ? _jsxs("span", { className: "text-red-600 font-semibold flex items-center", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mr-2" }), invalidRowsCount, " row(s) have errors and will be skipped."] }) : _jsxs("span", { className: "text-green-600 font-semibold", children: ["All ", parsedData.length, " rows look good!"] }), newDiscoveries && newDiscoveries.total > 0 && _jsxs("span", { className: "text-blue-600 font-semibold", children: ["Found ", newDiscoveries.counts.join(', '), ". These will be added to your configuration."] })] }), _jsxs(Button, { onClick: handleImport, disabled: validRows.length === 0, children: ["Import ", validRows.length > 0 ? validRows.length : '', " Valid Risks"] })] })] }))] })] }));
}
function ControlImportTab({ onImport, allRisks, canEdit }) {
    const [parsedData, setParsedData] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [pastedData, setPastedData] = useState('');
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file)
            return;
        setFileName(file.name);
        file.text().then(text => {
            const result = parseCsvToJson(text);
            setParsedData(processParsedControlsData(result, allRisks));
        });
    }, [allRisks]);
    const handlePaste = () => {
        if (!pastedData.trim())
            return;
        setFileName('Pasted from Excel');
        const lines = pastedData.trim().split('\n');
        const headerLine = lines[0];
        const tabCount = (headerLine.match(/\t/g) || []).length;
        // Check if we have the expected number of columns (6 tabs = 7 columns)
        if (tabCount < 6) {
            alert(`⚠️ Column mismatch detected!\n\nExpected 7 columns (6 tabs between them), but found ${tabCount + 1} columns.\n\nPlease ensure:\n1. All columns in Excel are wide enough to show full content\n2. You're selecting ALL columns including the last one (effectiveness_evaluation)\n3. Try widening your Excel columns before copying\n\nClick "Show Example" to see the correct format.`);
            return;
        }
        // Convert tab-separated paste data to CSV
        const csvText = lines.map(line => {
            if (line.includes('\t')) {
                return line.split('\t').map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
            }
            return line;
        }).join('\n');
        const result = parseCsvToJson(csvText);
        setParsedData(processParsedControlsData(result, allRisks));
        setPastedData('');
    };
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });
    const handleImport = () => { const validControls = parsedData.filter(c => !c.errors || c.errors.length === 0); onImport(validControls); setParsedData([]); setFileName(null); };
    const validRows = useMemo(() => parsedData.filter(c => !c.errors || c.errors.length === 0), [parsedData]);
    const invalidRowsCount = useMemo(() => parsedData.length - validRows.length, [parsedData, validRows]);
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Import Controls from CSV or Excel" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { ...getRootProps(), className: `p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx("input", { ...getInputProps() }), _jsx(FileUp, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: isDragActive ? "Drop the file here ..." : "Drag 'n' drop a CSV file here, or click to select file" }), _jsx("p", { className: "text-xs text-gray-500", children: "Required columns: risk_code, control_description, target, design, implementation, monitoring, effectiveness_evaluation" })] }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-white text-gray-500", children: "OR" }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Paste from Excel" }), _jsx("p", { className: "text-xs text-gray-600", children: "Select and copy cells from Excel (including headers). Make sure all columns are fully visible and not truncated before copying." }), _jsx(Textarea, { placeholder: "Copy cells from Excel and paste here (with headers)...", value: pastedData, onChange: e => setPastedData(e.target.value), rows: 6, className: "font-mono text-xs" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handlePaste, disabled: !pastedData.trim(), size: "sm", children: "Process Pasted Data" }), _jsx(Button, { onClick: () => setPastedData('risk_code\tcontrol_description\ttarget\tdesign\timplementation\tmonitoring\teffectiveness_evaluation\nRISK-001\tImplement MFA and access controls\tLikelihood\t3\t2\t2\t3'), variant: "outline", size: "sm", children: "Show Example" })] })] }), fileName && _jsxs("p", { className: "text-sm font-medium", children: ["Previewing: ", _jsx("span", { className: "font-normal text-gray-700", children: fileName })] }), parsedData.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "overflow-auto rounded-xl border bg-white max-h-96", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100 sticky top-0", children: _jsx("tr", { children: ["Risk Code", "Risk Title", "Control Description", "Target", "D", "I", "M", "E", "Errors"].map(h => _jsx("th", { className: "px-3 py-2 text-left font-semibold text-gray-700", children: h }, h)) }) }), _jsx("tbody", { children: parsedData.map((row, index) => (_jsxs("tr", { className: `border-t ${row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}`, children: [_jsx("td", { className: "px-3 py-2", children: row.risk_code }), _jsx("td", { className: "px-3 py-2", children: row.risk_title }), _jsx("td", { className: "px-3 py-2", children: row.description }), _jsx("td", { className: "px-3 py-2", children: row.target }), _jsx("td", { className: "px-3 py-2", children: row.design }), _jsx("td", { className: "px-3 py-2", children: row.implementation }), _jsx("td", { className: "px-3 py-2", children: row.monitoring }), _jsx("td", { className: "px-3 py-2", children: row.effectiveness_evaluation }), _jsx("td", { className: "px-3 py-2 text-red-600 text-xs", children: row.errors?.join(', ') })] }, index))) })] }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("div", { className: "text-sm text-gray-600 space-y-1", children: invalidRowsCount > 0 ? _jsxs("span", { className: "text-red-600 font-semibold flex items-center", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mr-2" }), invalidRowsCount, " row(s) have errors and will be skipped."] }) : _jsxs("span", { className: "text-green-600 font-semibold", children: ["All ", parsedData.length, " rows look good!"] }) }), _jsxs(Button, { onClick: handleImport, disabled: validRows.length === 0, children: ["Import ", validRows.length > 0 ? validRows.length : '', " Valid Controls"] })] })] }))] })] }));
}
function DeleteConfirmationDialog({ onConfirm, riskCode }) {
    const [open, setOpen] = useState(false);
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx(Button, { size: "sm", variant: "ghost", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500" }) }) }), _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Are you absolutely sure?" }), _jsxs(DialogDescription, { children: ["This action cannot be undone. This will permanently delete the risk ", _jsx("span", { className: "font-semibold", children: riskCode }), "."] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: () => { onConfirm(); setOpen(false); }, children: "Delete" })] })] })] }));
}
function processParsedRiskData(rawData, matrixSize) {
    const discoveredDivisions = new Set();
    const discoveredDepartments = new Set();
    const discoveredCategories = new Set();
    const data = rawData.map((rowData) => {
        const risk = { risk_title: rowData.risk_title?.trim() || '', risk_description: rowData.risk_description?.trim() || '', division: rowData.division?.trim() || '', department: rowData.department?.trim() || '', category: rowData.category?.trim() || '', owner: rowData.owner?.trim() || '', relevant_period: rowData.relevant_period?.trim() || null, likelihood_inherent: parseInt(rowData.likelihood_inherent, 10), impact_inherent: parseInt(rowData.impact_inherent, 10), status: rowData.status?.trim(), controls: [], errors: [] };
        if (!risk.risk_title)
            risk.errors?.push('Missing title');
        if (isNaN(risk.likelihood_inherent) || risk.likelihood_inherent < 1 || risk.likelihood_inherent > matrixSize)
            risk.errors?.push(`Invalid L-Inherent (1-${matrixSize})`);
        if (isNaN(risk.impact_inherent) || risk.impact_inherent < 1 || risk.impact_inherent > matrixSize)
            risk.errors?.push(`Invalid I-Inherent (1-${matrixSize})`);
        if (!['Open', 'In Progress', 'Closed'].includes(risk.status))
            risk.errors?.push('Invalid status');
        if (risk.errors?.length === 0) {
            if (risk.division)
                discoveredDivisions.add(risk.division);
            if (risk.department)
                discoveredDepartments.add(risk.department);
            if (risk.category)
                discoveredCategories.add(risk.category);
        }
        return risk;
    });
    return { data, discovered: { divisions: Array.from(discoveredDivisions), departments: Array.from(discoveredDepartments), categories: Array.from(discoveredCategories) } };
}
function processParsedControlsData(rawData, allRisks) {
    const risksMap = new Map(allRisks.map(r => [r.risk_code, r.risk_title]));
    return rawData.map((rowData) => {
        const risk_code = rowData.risk_code?.trim() || '';
        const control = {
            risk_code,
            risk_title: risksMap.get(risk_code) || 'Unknown Risk',
            description: rowData.control_description?.trim() || '',
            target: rowData.target?.trim(),
            design: parseInt(rowData.design, 10),
            implementation: parseInt(rowData.implementation, 10),
            monitoring: parseInt(rowData.monitoring, 10),
            effectiveness_evaluation: parseInt(rowData.effectiveness_evaluation, 10),
            errors: []
        };
        if (!control.risk_code)
            control.errors?.push('Missing risk_code');
        else if (!risksMap.has(control.risk_code))
            control.errors?.push('Unknown risk_code');
        if (!control.description)
            control.errors?.push('Missing control_description');
        if (!['Likelihood', 'Impact'].includes(control.target))
            control.errors?.push('Invalid target');
        if (isNaN(control.design) || control.design < 0 || control.design > 3)
            control.errors?.push('Invalid design');
        if (isNaN(control.implementation) || control.implementation < 0 || control.implementation > 3)
            control.errors?.push('Invalid impl.');
        if (isNaN(control.monitoring) || control.monitoring < 0 || control.monitoring > 3)
            control.errors?.push('Invalid monitoring');
        if (isNaN(control.effectiveness_evaluation) || control.effectiveness_evaluation < 0 || control.effectiveness_evaluation > 3)
            control.errors?.push('Invalid eval.');
        return control;
    });
}
function MultiSelectPopover({ title, options, selected, setSelected }) { const handleSelect = (value) => { const newSelected = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]; setSelected(newSelected); }; return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full justify-between", children: [selected.length > 0 ? `${title} (${selected.length})` : `All ${title}`, _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-[200px] p-0", children: _jsx("div", { className: "p-2 space-y-1", children: options.map(option => (_jsxs("div", { className: "flex items-center gap-2 p-1 rounded hover:bg-gray-100", children: [_jsx(Checkbox, { id: `ms-${title}-${option}`, checked: selected.includes(option), onCheckedChange: () => handleSelect(option) }), _jsx(Label, { htmlFor: `ms-${title}-${option}`, className: "w-full text-sm font-normal", children: option })] }, option))) }) })] })); }
function AddRiskDialog({ onAdd, config, rows }) { const [open, setOpen] = useState(false); const [form, setForm] = useState({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: config.owners[0] || "", relevant_period: null, likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" }); const preview = useMemo(() => nextRiskCode(rows, form.division, form.category), [rows, form.division, form.category]); const handleSave = () => { onAdd(form); setOpen(false); setForm({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: config.owners[0] || "", relevant_period: null, likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" }); }; return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Add Risk"] }) }), _jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] flex flex-col", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Add a Risk" }) }), _jsx(RiskFields, { form: form, setForm: setForm, config: config, codePreview: preview, codeLocked: true }), _jsx(DialogFooter, { className: "pt-4", children: _jsx(Button, { onClick: handleSave, children: "Save" }) })] })] })); }
function EditRiskDialog({ initial, config, onSave, children, open, onOpenChange }) {
    const [form, setForm] = useState({ ...initial });
    useEffect(() => { setForm({ ...initial }); }, [initial]);
    const handleSave = () => { onSave(form); onOpenChange(false); };
    const period = initial.period || initial.relevant_period;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] flex flex-col", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Edit ", initial.risk_code, " ", period && _jsxs("span", { className: "text-sm font-normal text-gray-500", children: ["(", period, ")"] })] }) }), _jsx(RiskFields, { form: form, setForm: setForm, config: config, codePreview: initial.risk_code, codeLocked: true }), _jsx(DialogFooter, { className: "pt-4", children: _jsx(Button, { onClick: handleSave, children: "Save" }) })] }) }));
}
function RiskFields({ form, setForm, config, codePreview, codeLocked }) {
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSuggestingRisk, setIsSuggestingRisk] = useState(false);
    const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const addControl = () => setForm(p => ({ ...p, controls: [...p.controls, { id: crypto.randomUUID(), description: "", target: "Likelihood", design: 0, implementation: 0, monitoring: 0, effectiveness_evaluation: 0 }] }));
    const updateControl = (id, updatedControl) => setForm(p => ({ ...p, controls: p.controls.map(c => c.id === id ? { ...c, ...updatedControl } : c) }));
    const removeControl = (id) => setForm(p => ({ ...p, controls: p.controls.filter(c => c.id !== id) }));
    const residualRisk = calculateResidualRisk(form);
    const handleSuggestRiskDetails = async () => {
        const prompt = window.prompt("Describe the risk scenario you want to create (e.g., 'data breach due to weak passwords', 'operational failure in trading platform'):");
        if (!prompt?.trim())
            return;
        setIsSuggestingRisk(true);
        try {
            const aiPrompt = `You are a risk management expert. Based on this risk scenario: "${prompt}", create a professional risk statement with:
1. A concise risk title (max 10 words)
2. A detailed risk description (2-3 sentences explaining the risk event, causes, and potential consequences)

Return your response as a valid JSON object with this exact structure:
{
  "risk_title": "title here",
  "risk_description": "description here"
}

Only return the JSON object, nothing else.`;
            const text = await askClaude(aiPrompt);
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Could not parse AI response");
            }
            const suggestion = JSON.parse(jsonMatch[0]);
            if (suggestion.risk_title && suggestion.risk_description) {
                setForm(p => ({
                    ...p,
                    risk_title: suggestion.risk_title,
                    risk_description: suggestion.risk_description
                }));
            }
            else {
                alert("The AI could not suggest risk details.");
            }
        }
        catch (error) {
            console.error("Failed to get AI suggestions:", error);
            alert("An error occurred while getting AI suggestions. Please try again.");
        }
        finally {
            setIsSuggestingRisk(false);
        }
    };
    const handleSuggestControls = async () => {
        if (!form.risk_title || !form.risk_description) {
            alert("Please enter a title and description for the risk first.");
            return;
        }
        setIsSuggesting(true);
        try {
            const prompt = `Based on the risk titled "${form.risk_title}" with the description "${form.risk_description}", suggest 3 relevant control measures. Include a mix of controls: some that reduce the 'Likelihood' of the risk occurring, and some that reduce the 'Impact' if it does occur. For each control, provide a brief description and specify whether it primarily targets 'Likelihood' or 'Impact'.

Return your response as a valid JSON array with this exact structure:
[
  {
    "description": "control description here",
    "target": "Likelihood"
  },
  {
    "description": "control description here",
    "target": "Impact"
  }
]

Only return the JSON array, nothing else.`;
            const text = await askClaude(prompt);
            // Extract JSON from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("Could not parse AI response");
            }
            const suggestions = JSON.parse(jsonMatch[0]);
            if (suggestions && suggestions.length > 0) {
                setForm(p => ({
                    ...p,
                    controls: [
                        ...p.controls,
                        ...suggestions.map(s => ({
                            id: crypto.randomUUID(),
                            description: s.description,
                            target: s.target,
                            design: 2, // Default to a reasonable value
                            implementation: 2,
                            monitoring: 2,
                            effectiveness_evaluation: 2,
                        }))
                    ]
                }));
            }
            else {
                alert("The AI could not suggest any controls for this risk.");
            }
        }
        catch (error) {
            console.error("Failed to get AI suggestions:", error);
            alert("An error occurred while getting AI suggestions. Please try again.");
        }
        finally {
            setIsSuggesting(false);
        }
    };
    const periodOptions = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "FY2025", "FY2026"];
    return (_jsxs("div", { className: "flex-grow overflow-y-auto -mr-4 pr-4 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Risk Code" }), _jsx(Input, { value: codePreview, readOnly: !!codeLocked, className: codeLocked ? "bg-gray-100" : "" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Status" }), _jsxs(Select, { value: form.status, onValueChange: v => setField('status', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: ["Open", "In Progress", "Closed"].map(x => _jsx(SelectItem, { value: x, children: x }, x)) })] })] }), _jsxs("div", { className: "col-span-2", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx(Label, { children: "Title & Description" }), _jsxs(Button, { onClick: handleSuggestRiskDetails, size: "sm", variant: "outline", disabled: isSuggestingRisk, children: [_jsx(Sparkles, { className: "mr-2 h-4 w-4" }), isSuggestingRisk ? 'Thinking...' : 'Suggest Risk Details'] })] }), _jsx(Input, { value: form.risk_title, onChange: e => setField('risk_title', e.target.value), placeholder: "Risk title" })] }), _jsx("div", { className: "col-span-2", children: _jsx(Textarea, { rows: 3, value: form.risk_description, onChange: e => setField('risk_description', e.target.value), placeholder: "Risk description" }) }), _jsxs("div", { children: [_jsx(Label, { children: "Division" }), _jsxs(Select, { value: form.division, onValueChange: v => setField('division', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.divisions.map(x => _jsx(SelectItem, { value: x, children: x }, x)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Department" }), _jsxs(Select, { value: form.department, onValueChange: v => setField('department', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.departments.map(x => _jsx(SelectItem, { value: x, children: x }, x)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Category" }), _jsxs(Select, { value: form.category, onValueChange: v => setField('category', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.categories.map(x => _jsx(SelectItem, { value: x, children: x }, x)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Owner" }), _jsxs(Select, { value: form.owner, onValueChange: v => setField('owner', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.owners.map(x => _jsx(SelectItem, { value: x, children: x }, x)) })] })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Relevant Period" }), _jsxs(Select, { value: form.relevant_period || undefined, onValueChange: v => setField('relevant_period', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select period..." }) }), _jsxs(SelectContent, { children: [periodOptions.map(p => _jsx(SelectItem, { value: p, children: p }, p)), _jsx(SelectItem, { value: "custom", children: "Custom..." })] })] }), form.relevant_period === "custom" && _jsx(Input, { placeholder: "Enter custom period (e.g., H1 2025)", value: "", onChange: e => setField('relevant_period', e.target.value), className: "mt-2" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "font-semibold text-gray-800", children: "Inherent Risk" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Likelihood (Inherent)" }), _jsxs(Select, { value: String(form.likelihood_inherent), onValueChange: v => setField('likelihood_inherent', Number(v)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.likelihoodLabels.map((label, index) => _jsx(SelectItem, { value: String(index + 1), children: label }, index + 1)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Impact (Inherent)" }), _jsxs(Select, { value: String(form.impact_inherent), onValueChange: v => setField('impact_inherent', Number(v)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: config.impactLabels.map((label, index) => _jsx(SelectItem, { value: String(index + 1), children: label }, index + 1)) })] })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "font-semibold text-gray-800", children: "Controls" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { onClick: handleSuggestControls, size: "sm", variant: "outline", disabled: isSuggesting, children: [_jsx(Sparkles, { className: "mr-2 h-4 w-4" }), isSuggesting ? 'Thinking...' : 'Suggest Controls'] }), _jsxs(Button, { onClick: addControl, size: "sm", variant: "outline", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Add Control"] })] })] }), form.controls.map((control, index) => (_jsxs("div", { className: "border rounded-lg p-4 space-y-4 bg-gray-50", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { className: "flex-grow space-y-2", children: [_jsxs(Label, { children: ["Control #", index + 1, " Description"] }), _jsx(Textarea, { placeholder: "e.g., Daily reconciliation process", value: control.description, onChange: e => updateControl(control.id, { description: e.target.value }) })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "ml-4", onClick: () => removeControl(control.id), children: _jsx(Trash2, { className: "h-4 w-4 text-red-500" }) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Target" }), _jsxs(Select, { value: control.target, onValueChange: (v) => updateControl(control.id, { target: v }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Likelihood", children: "Likelihood" }), _jsx(SelectItem, { value: "Impact", children: "Impact" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "D (Design)" }), _jsxs(Select, { value: String(control.design), onValueChange: v => updateControl(control.id, { design: Number(v) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CONTROL_DESIGN_OPTIONS.map(o => _jsx(SelectItem, { value: String(o.value), children: o.label }, o.value)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "I (Implementation)" }), _jsxs(Select, { value: String(control.implementation), onValueChange: v => updateControl(control.id, { implementation: Number(v) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CONTROL_IMPLEMENTATION_OPTIONS.map(o => _jsx(SelectItem, { value: String(o.value), children: o.label }, o.value)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "M (Monitoring)" }), _jsxs(Select, { value: String(control.monitoring), onValueChange: v => updateControl(control.id, { monitoring: Number(v) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CONTROL_MONITORING_OPTIONS.map(o => _jsx(SelectItem, { value: String(o.value), children: o.label }, o.value)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "E (Evaluation)" }), _jsxs(Select, { value: String(control.effectiveness_evaluation), onValueChange: v => updateControl(control.id, { effectiveness_evaluation: Number(v) }), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CONTROL_EFFECTIVENESS_OPTIONS.map(o => _jsx(SelectItem, { value: String(o.value), children: o.label }, o.value)) })] })] })] })] }, control.id))), form.controls.length === 0 && _jsx("p", { className: "text-sm text-center text-gray-500 py-4", children: "No controls added. Residual risk will equal inherent risk." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "font-semibold text-gray-800", children: "Residual Risk (Calculated)" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50", children: [_jsxs("div", { children: [_jsx(Label, { children: "Likelihood (Residual)" }), _jsx(Input, { readOnly: true, value: `${residualRisk.likelihood.toFixed(2)} (${config.likelihoodLabels[Math.round(residualRisk.likelihood) - 1] || 'N/A'})`, className: "bg-white font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Impact (Residual)" }), _jsx(Input, { readOnly: true, value: `${residualRisk.impact.toFixed(2)} (${config.impactLabels[Math.round(residualRisk.impact) - 1] || 'N/A'})`, className: "bg-white font-mono" })] })] })] })] }));
}
function ConfigDialog({ config, onSave }) {
    const [draft, setDraft] = useState(config);
    useEffect(() => { setDraft(config); }, [config]);
    const handleSizeChange = (size) => {
        const newSize = parseInt(size, 10);
        setDraft(prev => {
            const newLikelihoodLabels = Array.from({ length: newSize }, (_, i) => prev.likelihoodLabels[i] || `Likelihood ${i + 1}`);
            const newImpactLabels = Array.from({ length: newSize }, (_, i) => prev.impactLabels[i] || `Impact ${i + 1}`);
            return { ...prev, matrixSize: newSize, likelihoodLabels: newLikelihoodLabels, impactLabels: newImpactLabels };
        });
    };
    const handleLabelChange = (type, index, value) => {
        setDraft(prev => {
            const newLabels = type === 'likelihood' ? [...prev.likelihoodLabels] : [...prev.impactLabels];
            newLabels[index] = value;
            return type === 'likelihood' ? { ...prev, likelihoodLabels: newLabels } : { ...prev, impactLabels: newLabels };
        });
    };
    const handleListChange = (type, value) => {
        setDraft(p => ({ ...p, [type]: value.split(',').map(s => s.trim()) }));
    };
    const apply = () => {
        onSave({
            ...draft,
            divisions: draft.divisions.filter(Boolean),
            departments: draft.departments.filter(Boolean),
            categories: draft.categories.filter(Boolean),
            owners: draft.owners.filter(Boolean),
        });
    };
    return (_jsxs(Dialog, { children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", children: [_jsx(Settings, { className: "mr-2 h-4 w-4" }), "Configure"] }) }), _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] flex flex-col", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Configuration" }) }), _jsxs("div", { className: "flex-grow overflow-y-auto -mr-4 pr-4 space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "font-semibold", children: "Risk Matrix Setup" }), _jsxs(RadioGroup, { value: String(draft.matrixSize), onValueChange: handleSizeChange, className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "5", id: "r1" }), _jsx(Label, { htmlFor: "r1", children: "5x5 Matrix" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "6", id: "r2" }), _jsx(Label, { htmlFor: "r2", children: "6x6 Matrix" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Likelihood Labels" }), draft.likelihoodLabels.map((label, index) => _jsx(Input, { value: label, onChange: e => handleLabelChange('likelihood', index, e.target.value), placeholder: `Level ${index + 1}` }, index))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Impact Labels" }), draft.impactLabels.map((label, index) => _jsx(Input, { value: label, onChange: e => handleLabelChange('impact', index, e.target.value), placeholder: `Level ${index + 1}` }, index))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "font-semibold", children: "Prepopulated Lists" }), _jsxs("div", { className: "grid grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx(Label, { children: "Divisions (comma-separated)" }), _jsx(Textarea, { rows: 4, value: draft.divisions.join(', '), onChange: e => handleListChange('divisions', e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Departments (comma-separated)" }), _jsx(Textarea, { rows: 4, value: draft.departments.join(', '), onChange: e => handleListChange('departments', e.target.value) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Categories (comma-separated)" }), _jsx(Textarea, { rows: 3, value: draft.categories.join(', '), onChange: e => handleListChange('categories', e.target.value) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Owners (comma-separated)" }), _jsx(Textarea, { rows: 3, value: draft.owners.join(', '), onChange: e => handleListChange('owners', e.target.value) })] })] })] })] }), _jsx(DialogFooter, { className: "pt-4", children: _jsx(Button, { onClick: apply, children: "Save Configuration" }) })] })] }));
}
function AIAssistantTab({ onAddMultipleRisks, config, onSwitchTab }) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
    const [suggestionData, setSuggestionData] = useState({});
    const [error, setError] = useState(null);
    const isAddButtonDisabled = useMemo(() => {
        if (selectedSuggestions.size === 0)
            return true;
        for (const index of selectedSuggestions) {
            if (!suggestionData[index] || !suggestionData[index].category || !suggestionData[index].division) {
                return true;
            }
        }
        return false;
    }, [selectedSuggestions, suggestionData]);
    const handleGenerateRisks = async () => {
        if (!prompt.trim()) {
            setError("Please enter a description of the project or process.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuggestions([]);
        setSelectedSuggestions(new Set());
        setSuggestionData({});
        // Safely parse JSON from model output (handles ```json fences, extra text)
        function parseRisks(text) {
            try {
                const start = text.indexOf("[");
                const end = text.lastIndexOf("]");
                const slice = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
                return JSON.parse(slice);
            }
            catch {
                const cleaned = text.replace(/```json|```/g, "").trim();
                try {
                    return JSON.parse(cleaned);
                }
                catch {
                    return [];
                }
            }
        }
        try {
            // Steer Gemini to return strict JSON
            const instruction = [
                "You are a senior enterprise risk manager.",
                "From the business description below, generate 3–5 *inherent* risk candidates.",
                "Return JSON only: an array of objects like:",
                `{ "risk_title": "<short title>", "risk_description": "<1–2 sentence description>" }`,
                "No commentary or markdown fences — JSON array only."
            ].join("\n");
            const fullPrompt = `${instruction}\n\nBusiness description:\n${prompt}`;
            // Calls Claude API via '@/lib/ai'
            const text = await askClaude(fullPrompt);
            const parsed = parseRisks(text);
            const items = (Array.isArray(parsed) ? parsed : [])
                .map((r) => ({
                risk_title: String(r?.risk_title ?? r?.title ?? "").trim().slice(0, 120),
                risk_description: String(r?.risk_description ?? r?.description ?? "").trim(),
            }))
                .filter((r) => r.risk_title && r.risk_description);
            if (!items.length) {
                console.error("AI raw response:", text);
                setError("AI returned an unexpected format. Try rephrasing the description.");
                return;
            }
            // If your state is typed: use AISuggestedRisk[]
            setSuggestions(items);
        }
        catch (e) {
            console.error("AI error:", e);
            setError(e?.message || "An error occurred while communicating with the AI.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSelectionChange = (index, checked) => {
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(index);
            }
            else {
                newSet.delete(index);
            }
            return newSet;
        });
    };
    const handleSuggestionDataChange = (index, field, value) => {
        setSuggestionData(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [field]: value,
            }
        }));
    };
    const handleAddSelectedRisks = () => {
        const risksToAdd = Array.from(selectedSuggestions).map(index => {
            const suggestion = suggestions[index];
            const data = suggestionData[index]; // Disabled button ensures this exists
            return {
                ...suggestion,
                category: data.category,
                division: data.division,
                department: config.departments[0] || "",
                owner: "Unassigned",
                relevant_period: null,
                likelihood_inherent: 3,
                impact_inherent: 3,
                controls: [],
                status: "Open"
            };
        });
        if (risksToAdd.length > 0) {
            onAddMultipleRisks(risksToAdd);
            alert(`Added ${risksToAdd.length} risk(s) to the register.`);
            setSuggestions([]);
            setSelectedSuggestions(new Set());
            setSuggestionData({});
            onSwitchTab("register");
        }
    };
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center", children: [_jsx(Sparkles, { className: "mr-2 h-5 w-5 text-purple-500" }), "AI Assistant: Proactive Risk Identification"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "ai-prompt", children: "Describe a new project, process, or business area:" }), _jsx(Textarea, { id: "ai-prompt", value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "e.g., 'We are planning to launch a new mobile banking application for retail customers...'", rows: 5, className: "mt-1" })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: handleGenerateRisks, disabled: isLoading, children: isLoading ? "Analyzing..." : "Identify Risks" }) }), error && _jsx("p", { className: "text-red-600 text-sm", children: error }), suggestions.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "font-semibold", children: "Suggested Risks:" }), suggestions.map((risk, index) => (_jsx(Card, { className: "bg-gray-50", children: _jsxs(CardContent, { className: "p-4 flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-start gap-4 flex-grow", children: [_jsx(Checkbox, { id: `suggestion-${index}`, className: "mt-1", onCheckedChange: (checked) => handleSelectionChange(index, !!checked) }), _jsxs("div", { className: "flex-grow", children: [_jsx(Label, { htmlFor: `suggestion-${index}`, className: "font-bold", children: risk.risk_title }), _jsx("p", { className: "text-sm text-gray-600", children: risk.risk_description })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 pl-8", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Label, { className: "w-20", children: "Division" }), _jsxs(Select, { value: suggestionData[index]?.division || "", onValueChange: (value) => handleSuggestionDataChange(index, 'division', value), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select..." }) }), _jsx(SelectContent, { children: config.divisions.map(c => _jsx(SelectItem, { value: c, children: c }, c)) })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Label, { className: "w-20", children: "Category" }), _jsxs(Select, { value: suggestionData[index]?.category || "", onValueChange: (value) => handleSuggestionDataChange(index, 'category', value), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select..." }) }), _jsx(SelectContent, { children: config.categories.map(c => _jsx(SelectItem, { value: c, children: c }, c)) })] })] })] })] }) }, index))), _jsx("div", { className: "flex justify-end pt-2", children: _jsxs(Button, { onClick: handleAddSelectedRisks, disabled: isAddButtonDisabled, children: ["Add ", selectedSuggestions.size > 0 ? `${selectedSuggestions.size} ` : '', "Selected Risk(s) to Register"] }) })] }))] })] }));
}
