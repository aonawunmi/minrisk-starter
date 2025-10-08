import React, { useMemo, useState, useEffect, useCallback } from "react";
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
import { Upload, Plus, Search, RefreshCw, Settings, Table, Pencil, Trash2, ChevronsUpDown, FileUp, AlertTriangle, ArrowUpDown, Sparkles, Calendar, Archive } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { askGemini, ChatMsg } from '@/lib/ai';
import SupaPing from "@/components/SupaPing";
import UserMenu from "@/components/UserMenu";
import AdminDashboard from "@/components/AdminDashboard";
import BulkDeletionDialog from "@/components/BulkDeletionDialog";
import { loadRisks, createRisk, updateRisk, deleteRisk, loadConfig, saveConfig as saveConfigToDb } from '@/lib/database';

// Make the endpoint visible in DevTools:
;(window as any).__MINRISK_AI_PATH = import.meta.env.VITE_AI_PATH ?? '/api/gemini'
console.log('AI endpoint:', (window as any).__MINRISK_AI_PATH)


/**
 * MinRisk — Version 1.7.2 (Final - Level 2)
 * - Enhanced Heatmap Popover: Inherent risk list now displays the corresponding Residual L & I values for each risk.
 */

// ===== TYPES =====
export type Control = { id: string; description: string; target: "Likelihood" | "Impact"; design: number; implementation: number; monitoring: number; effectiveness_evaluation: number; };
export type RiskRow = { risk_code: string; risk_title: string; risk_description: string; division: string; department: string; category: string; owner: string; relevant_period: string | null; likelihood_inherent: number; impact_inherent: number; controls: Control[]; status: "Open" | "In Progress" | "Closed"; user_id?: string; user_email?: string; };
export type AppConfig = {
    matrixSize: 5 | 6;
    likelihoodLabels: string[];
    impactLabels: string[];
    divisions: string[];
    departments: string[];
    categories: string[];
};
type ProcessedRisk = RiskRow & { likelihood_residual: number, impact_residual: number, inherent_score: number, residual_score: number };
type ParsedRisk = Omit<RiskRow, 'risk_code' | 'controls'> & { controls: []; errors?: string[] };
type ParsedControl = Omit<Control, 'id'> & { risk_code: string; risk_title?: string; errors?: string[] };
type DiscoveredConfig = { divisions: string[]; departments: string[]; categories: string[] };
type SortConfig = { key: keyof ProcessedRisk; direction: 'asc' | 'desc'; };
type AISuggestedRisk = { risk_title: string; risk_description: string; };

// ===== CONSTANTS =====
const DEFAULT_APP_CONFIG: AppConfig = {
    matrixSize: 5,
    likelihoodLabels: ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"],
    impactLabels: ["Minimal", "Low", "Moderate", "High", "Severe"],
    divisions: ["Clearing", "Operations", "Finance"],
    departments: ["Risk Management", "IT Ops", "Quant/Risk", "Treasury", "Trading"],
    categories: ["Strategic", "Credit", "Market", "Liquidity", "Operational", "Legal/Compliance", "Technology", "ESG", "Reputational"],
};
const CONTROL_DESIGN_OPTIONS = [{ value: 3, label: "Reduces risks entirely" }, { value: 2, label: "Reduces most aspects of risk" }, { value: 1, label: "Reduces some areas of risk" }, { value: 0, label: "Badly designed or no protection" }];
const CONTROL_IMPLEMENTATION_OPTIONS = [{ value: 3, label: "Always applied as intended" }, { value: 2, label: "Generally operational" }, { value: 1, label: "Sometimes applied correctly" }, { value: 0, "label": "Not applied or applied incorrectly" }];
const CONTROL_MONITORING_OPTIONS = [{ value: 3, label: "Always monitored" }, { value: 2, label: "Usually monitored" }, { value: 1, label: "Monitored on an ad-hoc basis" }, { value: 0, label: "Not monitored at all" }];
const CONTROL_EFFECTIVENESS_OPTIONS = [{ value: 3, label: "Regularly evaluated" }, { value: 2, label: "Occasionally evaluated" }, { value: 1, label: "Infrequently evaluated" }, { value: 0, label: "Never evaluated" }];

const SEED: RiskRow[] = [{ risk_code: "CRD-001", risk_title: "Counterparty default", risk_description: "Clearing member fails to meet obligations; default waterfall.", division: "Clearing", department: "Risk Management", category: "Credit", owner: "Head, Risk", relevant_period: null, likelihood_inherent: 4, impact_inherent: 5, status: "In Progress", controls: [{ id: "c1", description: "Daily Margin Calls", target: "Impact", design: 3, implementation: 3, monitoring: 3, effectiveness_evaluation: 3 }, { id: "c2", description: "Member Default Fund", target: "Impact", design: 2, implementation: 3, monitoring: 2, effectiveness_evaluation: 2 }] }, { risk_code: "OPR-003", risk_title: "Settlement system outage", risk_description: "Platform unavailable during settlement window.", division: "Operations", department: "IT Ops", category: "Operational", owner: "CTO", relevant_period: null, likelihood_inherent: 3, impact_inherent: 5, status: "Open", controls: [{ id: "c3", description: "System Redundancy/Failover", target: "Likelihood", design: 3, implementation: 2, monitoring: 3, effectiveness_evaluation: 2 }] }];

// ===== LOGIC & HELPERS =====
const bucket = (l: number, i: number, size: 5 | 6) => {
    const s = l * i;
    if (size === 5) {
        return s >= 20 ? "Severe" : s >= 12 ? "High" : s >= 6 ? "Moderate" : s >= 3 ? "Low" : "Minimal";
    }
    // Scale thresholds for 6x6 matrix
    return s >= 30 ? "Catastrophic" : s >= 20 ? "Severe" : s >= 12 ? "High" : s >= 6 ? "Moderate" : "Low";
};
const scoreColor = (t: string) => {
    switch (t) {
        case "Catastrophic": return "#991b1b";
        case "Severe": return "#dc2626";
        case "High": return "#f97316";
        case "Moderate": return "#facc15";
        case "Low": return "#84cc16";
        default: return "#22c55e"; // Minimal
    }
};
const scoreColorClass = (t: string) => {
    switch (t) {
        case "Catastrophic": return "bg-red-800";
        case "Severe": return "bg-red-600";
        case "High": return "bg-orange-500";
        case "Moderate": return "bg-yellow-400";
        case "Low": return "bg-lime-400";
        default: return "bg-emerald-400"; // Minimal
    }
};
const scoreColorText = (t: string) => (t === "Catastrophic" || t === "Severe" || t === "High") ? "text-white" : "text-black";
const cap3 = (s: string) => (s || "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "NEW";
const nextRiskCode = (rows: RiskRow[], div: string, cat: string) => { const pre = `${cap3(div)}-${cap3(cat)}`; const nums = rows.filter(r => r && r.risk_code && r.risk_code.startsWith(pre)).map(r => Number((r.risk_code.split("-")[2] || "0").replace(/[^0-9]/g, ""))).filter(Number.isFinite).sort((a, b) => a - b); const n = (nums.length > 0 ? nums[nums.length - 1] : 0) + 1; return `${pre}-${String(n).padStart(3, '0')}` };
const calculateControlEffectiveness = (control: Control): number => { if (control.design === 0 || control.implementation === 0) return 0; const totalScore = control.design + control.implementation + control.monitoring + control.effectiveness_evaluation; return totalScore / 12; };
const calculateResidualRisk = (risk: RiskRow) => { const likelihoodControls = risk.controls.filter(c => c.target === 'Likelihood'); const impactControls = risk.controls.filter(c => c.target === 'Impact'); const maxLikelihoodReduction = likelihoodControls.length > 0 ? Math.max(...likelihoodControls.map(calculateControlEffectiveness)) : 0; const maxImpactReduction = impactControls.length > 0 ? Math.max(...impactControls.map(calculateControlEffectiveness)) : 0; const residualLikelihood = risk.likelihood_inherent - (risk.likelihood_inherent - 1) * maxLikelihoodReduction; const residualImpact = risk.impact_inherent - (risk.impact_inherent - 1) * maxImpactReduction; return { likelihood: Math.max(1, residualLikelihood), impact: Math.max(1, residualImpact) }; };

// ===== PRIORITY RISK KEY HELPERS =====
// Create composite key to uniquely identify a risk by user_id and risk_code
const makePriorityKey = (userId: string | undefined, riskCode: string): string => {
    return `${userId || 'unknown'}::${riskCode}`;
};
// Check if a risk is in the priority set
const isPriorityRisk = (priorityRisks: Set<string>, userId: string | undefined, riskCode: string): boolean => {
    return priorityRisks.has(makePriorityKey(userId, riskCode));
};

// ===== CSV PARSING LOGIC =====
const parseCsvToJson = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj: { [key: string]: string } = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j]?.trim();
        }
        data.push(obj);
    }
    return data;
};

const unparseJsonToCsv = (data: any[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                let value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                if (/[",\n]/.test(value)) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
};

function exportToCsv(filename: string, rows: any[]) {
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
const callGeminiAPI = async (prompt: string, schema?: any): Promise<any> => {
  // Build a concise instruction from the caller's schema
  function schemaInstruction(s?: any): string {
    try {
      const isArray = s?.type?.toUpperCase?.() === 'ARRAY';
      const propsObj = s?.items?.properties ?? {};
      const required = Array.isArray(s?.items?.required) ? s.items.required : [];

      const props = Object.keys(propsObj);
      const propsLine = props.length
        ? `Fields: ${props.map((k) => `"${k}" (${String(propsObj[k]?.type || 'STRING').toLowerCase()})`).join(', ')}.`
        : '';

      const reqLine = required.length ? `Required: ${required.map((k: string) => `"${k}"`).join(', ')}.` : '';

      return [
        'You are a senior enterprise risk & controls expert.',
        isArray ? 'Return a JSON array of objects.' : 'Return a single JSON object.',
        propsLine,
        reqLine,
        'Output must be JSON only — no commentary, no markdown fences.',
      ]
        .filter(Boolean)
        .join('\n');
    } catch {
      return 'Return JSON only — no commentary, no markdown fences.';
    }
  }

  // Prepend instruction (when schema provided) so model returns parseable JSON
  const fullPrompt = schema ? `${schemaInstruction(schema)}\n\n${prompt}` : prompt;

  const text = await askGemini(fullPrompt); // calls /api/gemini under the hood

  // Robust JSON parsing (handles ```json fences and extra prose)
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(text);
  if (parsed !== null) return parsed;

  // If model wrapped JSON in ```json … ```
  parsed = tryParse(text.replace(/```json|```/g, '').trim());
  if (parsed !== null) return parsed;

  // Extract array/object if surrounded by text
  const a0 = text.indexOf('['),
    a1 = text.lastIndexOf(']');
  if (a0 !== -1 && a1 !== -1) {
    parsed = tryParse(text.slice(a0, a1 + 1));
    if (parsed !== null) return parsed;
  }
  const o0 = text.indexOf('{'),
    o1 = text.lastIndexOf('}');
  if (o0 !== -1 && o1 !== -1) {
    parsed = tryParse(text.slice(o0, o1 + 1));
    if (parsed !== null) return parsed;
  }

  // Last resort — callers already handle "no suggestions"
  return [];
};


// ===== MAIN APP COMPONENT =====
export default function MinRiskLatest() {
    const [rows, setRows] = useState<RiskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
    const [filters, setFilters] = useState({ divisions: [] as string[], departments: [] as string[], categories: [] as string[], statuses: [] as string[], users: [] as string[], periods: [] as string[] });
    const [heatMapView, setHeatMapView] = useState({ inherent: true, residual: true });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [priorityRisks, setPriorityRisks] = useState(new Set<string>());
    const [activeTab, setActiveTab] = useState("register");
    const [editingRisk, setEditingRisk] = useState<ProcessedRisk | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'edit' | 'view_only' | null>(null);
    const [userStatus, setUserStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
    const [activePeriod, setActivePeriod] = useState<string | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const [showChangePeriodDialog, setShowChangePeriodDialog] = useState(false);
    const [newPeriod, setNewPeriod] = useState<string>("");
    const [showCommitDialog, setShowCommitDialog] = useState(false);

    // Toast notification function
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Change active period handler
    const handleChangePeriod = async () => {
        if (!newPeriod) return;
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('change_active_period', { new_period: newPeriod });

            if (error) throw error;
            if (data?.success) {
                setActivePeriod(newPeriod);
                showToast(`Active period changed to ${newPeriod}. ${data.updated_count} risk(s) updated.`);
                setShowChangePeriodDialog(false);
                setNewPeriod("");
                // Reload risks to reflect the change
                const risks = await loadRisks();
                setRows(risks);
            } else {
                showToast(data?.error || 'Failed to change period', 'error');
            }
        } catch (error: any) {
            console.error('Error changing period:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            showToast(error.message || error.hint || 'Failed to change period', 'error');
        }
    };

    // Commit period handler
    const handleCommitPeriod = async () => {
        if (!activePeriod) return;
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('commit_user_period', { target_period: activePeriod });

            if (error) throw error;
            if (data?.success) {
                showToast(`Period ${activePeriod} committed. ${data.risk_count} risk(s) moved to history.`);
                setShowCommitDialog(false);
                // Reload risks to reflect the change
                const risks = await loadRisks();
                setRows(risks);
            } else {
                showToast(data?.error || 'Failed to commit period', 'error');
            }
        } catch (error: any) {
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
                    });
                }
                console.log('✅ Data load complete!');
            } catch (error) {
                console.error('❌ Failed to load data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return rows.filter(r => { const m = !q || [r.risk_code, r.risk_title, r.risk_description, r.owner, r.category, r.division, r.department].join(" ").toLowerCase().includes(q); const d = filters.divisions.length === 0 || filters.divisions.includes(r.division); const de = filters.departments.length === 0 || filters.departments.includes(r.department); const c = filters.categories.length === 0 || filters.categories.includes(r.category); const s = filters.statuses.length === 0 || filters.statuses.includes(r.status); const u = filters.users.length === 0 || (r.user_email && filters.users.includes(r.user_email)); const p = filters.periods.length === 0 || (r.relevant_period && filters.periods.includes(r.relevant_period)); return m && d && de && c && s && u && p; }); }, [rows, query, filters]);

    const uniquePeriods = useMemo(() => {
        const periods = rows.map(r => r.relevant_period).filter((p): p is string => Boolean(p));
        return Array.from(new Set(periods)).sort();
    }, [rows]);

    const processedData = useMemo(() => { return filtered.map(r => { const residual = calculateResidualRisk(r); return { ...r, likelihood_residual: residual.likelihood, impact_residual: residual.impact, inherent_score: r.likelihood_inherent * r.impact_inherent, residual_score: residual.likelihood * residual.impact }; }); }, [filtered]);
    
    const sortedData = useMemo(() => {
        let sortableItems = [...processedData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === undefined || bVal === undefined || aVal === null || bVal === null) return 0;
                if (aVal < bVal) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aVal > bVal) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return sortableItems;
    }, [processedData, sortConfig]);
    
    const addMultipleRisks = async (risksToAdd: Omit<RiskRow, 'risk_code'>[]) => {
        for (const risk of risksToAdd) {
            const riskCode = nextRiskCode(rows, risk.division, risk.category);
            console.log('Attempting to create risk:', riskCode);
            const result = await createRisk({ ...risk, risk_code: riskCode });
            console.log('Create risk result:', result);
            if (result.success && result.data) {
                setRows(prev => [...prev, result.data!]);
                console.log('Risk added to state successfully');
                showToast(`✓ Risk ${riskCode} created successfully!`, 'success');
            } else {
                console.error('Failed to create risk:', result.error);
                alert(`Failed to create risk: ${result.error || 'Unknown error'}`);
            }
        }
    };

    const add = (payload: Omit<RiskRow, 'risk_code'>) => addMultipleRisks([payload]);

    const save = async (code: string, payload: Omit<RiskRow, 'risk_code'>) => {
        const result = await updateRisk(code, payload);
        if (result.success) {
            setRows(p => p.map(r => r.risk_code === code ? { ...payload, risk_code: code } : r));
            showToast(`✓ Risk ${code} updated successfully!`, 'success');
        } else {
            console.error('Failed to update risk:', result.error);
            alert(`Failed to update risk: ${result.error}`);
        }
    };

    const remove = async (code: string) => {
        const result = await deleteRisk(code);
        if (result.success) {
            setRows(p => p.filter(r => r.risk_code !== code));
            setPriorityRisks(prev => {
                const newSet = new Set(prev);
                newSet.delete(code);
                return newSet;
            });
        } else {
            console.error('Failed to delete risk:', result.error);
            alert(`Failed to delete risk: ${result.error}`);
        }
    };
    
    const handleRiskBulkImport = async (newRisks: ParsedRisk[], discoveredConfig: DiscoveredConfig) => {
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
            tempRowsForCodeGeneration.push(newRiskWithCode as RiskRow);
            return newRiskWithCode as RiskRow;
        });

        // Import to database using bulkImportRisks
        const { bulkImportRisks } = await import('@/lib/database');
        const result = await bulkImportRisks(risksWithCodes);

        if (result.success) {
            console.log('✅ Bulk import successful:', result.count, 'risks saved');
            // Reload all risks from database to get the complete data with IDs
            const allRisks = await loadRisks();
            setRows(allRisks);
        } else {
            console.error('❌ Bulk import failed:', result.error);
            alert(`Failed to import risks: ${result.error}`);
        }
    };

    const handleControlBulkImport = async (newControls: ParsedControl[]) => {
        console.log('🔄 Bulk importing', newControls.length, 'controls...');

        // Add controls to existing risks in state
        const rowsMap = new Map(rows.map(r => [r.risk_code, { ...r, controls: [...r.controls] }]));

        newControls.forEach(controlData => {
            const risk = rowsMap.get(controlData.risk_code);
            if (risk) {
                const newControl: Control = {
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
                } else {
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
    
    const requestSort = (key: keyof ProcessedRisk) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSaveRisk = (payload: Omit<RiskRow, 'risk_code'>) => {
        if(editingRisk) {
            save(editingRisk.risk_code, payload);
            setEditingRisk(null);
        }
    };

    const handleResetDemo = async () => {
        if (!confirm('⚠️ This will DELETE ALL your data and reset to demo data. This cannot be undone. Continue?')) return;

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
            } else {
                console.error('❌ Failed to load demo data:', result.error);
                alert(`Failed to load demo data: ${result.error}`);
            }

            // Reset config to defaults
            setConfig(DEFAULT_APP_CONFIG);

            console.log('🎉 Reset complete!');
        } catch (error) {
            console.error('❌ Reset failed:', error);
            alert('Failed to reset data. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleClearAllData = async () => {
        if (!confirm('⚠️ This will DELETE ALL your risks and controls from the database. This cannot be undone. Continue?')) return;

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
        } catch (error) {
            console.error('❌ Clear failed:', error);
            alert('Failed to clear data. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (newConfig: AppConfig) => {
        const result = await saveConfigToDb({
            matrix_size: newConfig.matrixSize,
            likelihood_labels: newConfig.likelihoodLabels,
            impact_labels: newConfig.impactLabels,
            divisions: newConfig.divisions,
            departments: newConfig.departments,
            categories: newConfig.categories,
        });
        if (result.success) {
            setConfig(newConfig);
        } else {
            console.error('Failed to save config:', result.error);
            alert(`Failed to save configuration: ${result.error}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Check if user needs approval
    const needsApproval = userStatus === 'pending' || userStatus === 'rejected';
    const canEdit = userRole === 'edit'; // Only 'edit' role can modify data
    const isAdmin = userRole === 'admin'; // Admin can view all but not edit data

    if (needsApproval) {
        return <div className="min-h-screen w-full bg-gray-50 p-6 flex items-center justify-center">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>{userStatus === 'pending' ? '⏳ Awaiting Approval' : '❌ Access Denied'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">
                        {userStatus === 'pending'
                            ? 'Your account is pending approval from an administrator. You will receive access once approved.'
                            : 'Your account access has been rejected. Please contact an administrator for more information.'
                        }
                    </p>
                    <UserMenu />
                </CardContent>
            </Card>
        </div>;
    }

    return <div className="min-h-screen w-full bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">MinRisk</h1>
                <p className="text-sm text-gray-500">
                    Version 1.6.1 (Final) • Role: <span className="font-semibold capitalize">{userRole === 'view_only' ? 'View Only' : userRole}</span>
                </p>
            </div>
            <div className="flex items-center gap-2">
                {isAdmin && <Button variant="outline" onClick={handleClearAllData}><Trash2 className="mr-2 h-4 w-4" />Clear All</Button>}
                {isAdmin && <Button variant="outline" onClick={handleResetDemo}><RefreshCw className="mr-2 h-4 w-4" />Reset Demo</Button>}
                {isAdmin && <ConfigDialog config={config} onSave={handleSaveConfig} />}
                <UserMenu />
            </div>
        </div>

        {/* Active Period Management */}
        {userStatus === 'approved' && (
            <div className="mb-4 p-4 rounded-xl border bg-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 block mb-1">Active Period</label>
                            <div className="text-lg font-bold text-blue-600">
                                {activePeriod || 'No period set'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && <Button variant="outline" size="sm" onClick={() => setShowChangePeriodDialog(true)}><Calendar className="mr-2 h-4 w-4" />Change Period</Button>}
                        {canEdit && activePeriod && <Button variant="default" size="sm" onClick={() => setShowCommitDialog(true)}><Archive className="mr-2 h-4 w-4" />Commit Period</Button>}
                    </div>
                </div>
            </div>
        )}

        {import.meta.env.DEV && (
  <div className="mb-4 p-3 rounded-xl border bg-white">
    <strong>Supabase check</strong>
    <SupaPing />
  </div>
)}


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4"><TabsTrigger value="register">Risk Register</TabsTrigger><TabsTrigger value="control_register">Control Register</TabsTrigger><TabsTrigger value="heatmap">Heat Map</TabsTrigger><TabsTrigger value="history">📜 History</TabsTrigger>{/* <TabsTrigger value="ai_assistant">✨ AI Assistant</TabsTrigger> */}{canEdit && <TabsTrigger value="import_risks">Risk Import</TabsTrigger>}{canEdit && <TabsTrigger value="import_controls">Control Import</TabsTrigger>}{isAdmin && <TabsTrigger value="admin">👥 Admin</TabsTrigger>}</TabsList>

            <TabsContent value="register"><RiskRegisterTab sortedData={sortedData} rowCount={filtered.length} requestSort={requestSort} onAdd={add} onEdit={setEditingRisk} onRemove={remove} config={config} rows={filtered} allRows={rows} priorityRisks={priorityRisks} setPriorityRisks={setPriorityRisks} canEdit={canEdit} filters={filters} setFilters={setFilters} isAdmin={isAdmin} /></TabsContent>
            <TabsContent value="control_register"><ControlRegisterTab allRisks={filtered} priorityRisks={priorityRisks} canEdit={canEdit} /></TabsContent>
            <TabsContent value="heatmap"><HeatmapTab processedData={processedData} allRows={rows} uniquePeriods={uniquePeriods} heatMapView={heatMapView} setHeatMapView={setHeatMapView} priorityRisks={priorityRisks} config={config} onEditRisk={setEditingRisk} canEdit={canEdit} /></TabsContent>
            <TabsContent value="history"><RiskHistoryTab config={config} showToast={showToast} /></TabsContent>
            {/* <TabsContent value="ai_assistant"><AIAssistantTab onAddMultipleRisks={addMultipleRisks} config={config} onSwitchTab={setActiveTab}/></TabsContent> */}
            <TabsContent value="import_risks"><RiskImportTab onImport={handleRiskBulkImport} currentConfig={config} canEdit={canEdit} /></TabsContent>
            <TabsContent value="import_controls"><ControlImportTab onImport={handleControlBulkImport} allRisks={rows} canEdit={canEdit} /></TabsContent>
            {isAdmin && <TabsContent value="admin"><AdminDashboard /></TabsContent>}
        </Tabs>
        
        {editingRisk && (
            <EditRiskDialog
                key={editingRisk.risk_code}
                initial={editingRisk}
                config={config}
                onSave={handleSaveRisk}
                open={!!editingRisk}
                onOpenChange={(isOpen) => !isOpen && setEditingRisk(null)}
            />
        )}

        {/* Change Period Dialog */}
        <Dialog open={showChangePeriodDialog} onOpenChange={setShowChangePeriodDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Active Period</DialogTitle>
                    <DialogDescription>
                        Select a new period. All your active risks will be updated to this period.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Period</Label>
                        <Select value={newPeriod} onValueChange={setNewPeriod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a period..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                                <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                                <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                                <SelectItem value="Q3 2026">Q3 2026</SelectItem>
                                <SelectItem value="Q4 2026">Q4 2026</SelectItem>
                                <SelectItem value="FY2025">FY2025</SelectItem>
                                <SelectItem value="FY2026">FY2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowChangePeriodDialog(false)}>Cancel</Button>
                    <Button onClick={handleChangePeriod} disabled={!newPeriod}>Change Period</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Commit Period Dialog */}
        <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Commit Period</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to commit {activePeriod}? All your risks for this period will be moved to history and the register will be cleared.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCommitDialog(false)}>Cancel</Button>
                    <Button onClick={handleCommitPeriod} variant="default">Commit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Toast Notification */}
        {toast && (
            <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${
                toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}>
                {toast.message}
            </div>
        )}
    </div>;
}

// ===== CHILD COMPONENTS =====

function RiskRegisterTab({ sortedData, rowCount, requestSort, onAdd, onEdit, onRemove, config, rows, allRows, priorityRisks, setPriorityRisks, canEdit, filters, setFilters, isAdmin }: { sortedData: ProcessedRisk[]; rowCount: number; requestSort: (key: keyof ProcessedRisk) => void; onAdd: (r: Omit<RiskRow, 'risk_code'>) => void; onEdit: (risk: ProcessedRisk) => void; onRemove: (code: string) => void; config: AppConfig; rows: RiskRow[]; allRows: RiskRow[]; priorityRisks: Set<string>; setPriorityRisks: React.Dispatch<React.SetStateAction<Set<string>>>; canEdit: boolean; filters: { divisions: string[]; departments: string[]; categories: string[]; statuses: string[]; users: string[]; periods: string[] }; setFilters: React.Dispatch<React.SetStateAction<{ divisions: string[]; departments: string[]; categories: string[]; statuses: string[]; users: string[]; periods: string[] }>>; isAdmin: boolean }) {
    const [showBulkDelete, setShowBulkDelete] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Always show all sorted data - priority checkboxes are just for marking/selection
    // Apply search filter
    const searchFilteredData = useMemo(() => {
        if (!searchQuery) return sortedData;
        const query = searchQuery.toLowerCase();
        return sortedData.filter(r =>
            r.risk_code.toLowerCase().includes(query) ||
            r.risk_title.toLowerCase().includes(query) ||
            r.risk_description?.toLowerCase().includes(query) ||
            r.category?.toLowerCase().includes(query) ||
            r.owner?.toLowerCase().includes(query)
        );
    }, [sortedData, searchQuery]);

    const displayedData = searchFilteredData;

    // Get unique user emails for filter from ALL rows (not filtered)
    const userEmails = useMemo(() =>
        Array.from(new Set(allRows.map(r => r.user_email).filter((e): e is string => Boolean(e)))),
        [allRows]
    );

    const visibleRisks = useMemo(() => displayedData.map(r => ({ userId: r.user_id, riskCode: r.risk_code })), [displayedData]);
    const selectedVisibleCount = useMemo(() => visibleRisks.filter(r => isPriorityRisk(priorityRisks, r.userId, r.riskCode)).length, [visibleRisks, priorityRisks]);
    const isAllSelected = selectedVisibleCount > 0 && selectedVisibleCount === visibleRisks.length;
    const isSomeSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleRisks.length;

    const handleSelectAll = () => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            if (isAllSelected) {
                visibleRisks.forEach(r => newSet.delete(makePriorityKey(r.userId, r.riskCode)));
            } else {
                visibleRisks.forEach(r => newSet.add(makePriorityKey(r.userId, r.riskCode)));
            }
            return newSet;
        });
    };

    const handlePriorityChange = (userId: string | undefined, riskCode: string, checked: boolean | 'indeterminate') => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            const key = makePriorityKey(userId, riskCode);
            if (checked) {
                newSet.add(key);
            } else {
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

return (
  <>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
      <div className="col-span-1"><Input placeholder="Search risks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
      <MultiSelectPopover title="Divisions" options={config.divisions} selected={filters.divisions} setSelected={v => setFilters(f => ({ ...f, divisions: v }))} />
      <MultiSelectPopover title="Departments" options={config.departments} selected={filters.departments} setSelected={v => setFilters(f => ({ ...f, departments: v }))} />
      <MultiSelectPopover title="Categories" options={config.categories} selected={filters.categories} setSelected={v => setFilters(f => ({ ...f, categories: v }))} />
      <MultiSelectPopover title="Status" options={["Open", "In Progress", "Closed"]} selected={filters.statuses} setSelected={v => setFilters(f => ({ ...f, statuses: v }))} />
    </div>
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">
            Showing {displayedData.length} of {rowCount} risks
            {priorityRisks.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({priorityRisks.size} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Table className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {canEdit && priorityRisks.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Bulk Delete ({priorityRisks.size})
              </Button>
            )}
            {canEdit && <AddRiskDialog rows={rows} onAdd={onAdd} config={config} />}
          </div>
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">S/N</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all">Priority</Label>
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Owner</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Period</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  <Button variant="ghost" size="sm" onClick={() => requestSort('inherent_score')}>
                    LxI (Inh) <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  <Button variant="ghost" size="sm" onClick={() => requestSort('residual_score')}>
                    LxI (Res) <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Bucket (Res)</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                {isAdmin && (
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    <MultiSelectPopover
                      title="User"
                      options={userEmails}
                      selected={filters.users}
                      setSelected={v => setFilters(f => ({ ...f, users: v }))}
                    />
                  </th>
                )}
                {canEdit && <th className="px-3 py-2 text-center font-semibold text-gray-700">Actions</th>}
              </tr>
            </thead>

            <tbody>
              {displayedData.map((r, index) => {
                const tag = bucket(r.likelihood_residual, r.impact_residual, config.matrixSize);
                const textColor = scoreColorText(tag);
                const bgColorClass = scoreColorClass(tag);
                return (
                  <tr key={`${r.user_id}-${r.risk_code}`} className="border-t">
                    <td className="px-3 py-2 text-center">{index + 1}</td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={isPriorityRisk(priorityRisks, r.user_id, r.risk_code)}
                        onCheckedChange={(checked) => handlePriorityChange(r.user_id, r.risk_code, checked)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{r.risk_code}</td>
                    <td className="px-3 py-2">{r.risk_title}</td>
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.owner}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{r.relevant_period || '-'}</td>
                    <td className="px-3 py-2">{r.inherent_score.toFixed(1)}</td>
                    <td className="px-3 py-2 font-semibold">{r.residual_score.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${bgColorClass} ${textColor}`}>
                        {tag}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-xs text-gray-600">{r.user_email || 'N/A'}</td>
                    )}
                    {canEdit && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmationDialog
                            onConfirm={() => onRemove(r.risk_code)}
                            riskCode={r.risk_code}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <BulkDeletionDialog
      open={showBulkDelete}
      onOpenChange={setShowBulkDelete}
      selectedRisks={selectedRisksForBulkDelete}
      onComplete={handleBulkDeleteComplete}
    />
  </>
);
}

function ControlRegisterTab({ allRisks, priorityRisks, canEdit }: { allRisks: RiskRow[]; priorityRisks: Set<string>; canEdit: boolean }) {
    const allControls = useMemo(() => {
        // Filter risks by priority if any are selected
        const risksToShow = priorityRisks.size === 0
            ? allRisks
            : allRisks.filter(risk => isPriorityRisk(priorityRisks, risk.user_id, risk.risk_code));

        return risksToShow.flatMap(risk =>
            risk.controls.map(control => ({
                risk_code: risk.risk_code,
                ...control
            }))
        );
    }, [allRisks, priorityRisks]);

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle>Control Register</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="overflow-auto rounded-xl border bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Risk Code</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Control Description</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-700">D</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-700">I</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-700">M</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-700">E</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allControls.map(control => (
                                <tr key={control.id} className="border-t">
                                    <td className="px-3 py-2 font-medium">{control.risk_code}</td>
                                    <td className="px-3 py-2">{control.description}</td>
                                    <td className="px-3 py-2 text-center">{control.design}</td>
                                    <td className="px-3 py-2 text-center">{control.implementation}</td>
                                    <td className="px-3 py-2 text-center">{control.monitoring}</td>
                                    <td className="px-3 py-2 text-center">{control.effectiveness_evaluation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function HeatmapTab({ processedData, allRows, uniquePeriods, heatMapView, setHeatMapView, priorityRisks, config, onEditRisk, canEdit }: { processedData: ProcessedRisk[]; allRows: RiskRow[]; uniquePeriods: string[]; heatMapView: { inherent: boolean, residual: boolean }; setHeatMapView: React.Dispatch<React.SetStateAction<{ inherent: boolean; residual: boolean; }>>; priorityRisks: Set<string>; config: AppConfig; onEditRisk: (risk: ProcessedRisk) => void; canEdit: boolean }) {
    const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
    const [dataSource, setDataSource] = useState<'active' | 'history'>('active');
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter states
    const [filterDivision, setFilterDivision] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterOwner, setFilterOwner] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

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

            if (error) throw error;
            setHistoryData(data || []);
        } catch (error: any) {
            console.error('Error loading history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Get unique historical periods
    const historicalPeriods = useMemo(() => {
        const periods = new Set(historyData.map(r => r.period));
        return Array.from(periods);
    }, [historyData]);

    // Convert history data to ProcessedRisk format
    const processedHistoryData: ProcessedRisk[] = useMemo(() => {
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
        if (selectedPeriods.length === 0) return sourceData;
        return sourceData.filter(r => {
            const period = dataSource === 'active' ? r.relevant_period : r.period;
            return period && selectedPeriods.includes(period);
        });
    }, [processedData, processedHistoryData, selectedPeriods, dataSource]);

    // Apply additional filters (Division, Department, Category, Owner, Status) and Search
    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return periodFilteredData.filter(r => {
            // Search filter
            if (searchQuery && !(
                r.risk_code?.toLowerCase().includes(query) ||
                r.risk_title?.toLowerCase().includes(query) ||
                r.risk_description?.toLowerCase().includes(query) ||
                r.category?.toLowerCase().includes(query) ||
                r.owner?.toLowerCase().includes(query)
            )) return false;
            // Other filters
            if (filterDivision !== 'all' && r.division !== filterDivision) return false;
            if (filterDepartment !== 'all' && r.department !== filterDepartment) return false;
            if (filterCategory !== 'all' && r.category !== filterCategory) return false;
            if (filterOwner !== 'all' && r.owner !== filterOwner) return false;
            if (filterStatus !== 'all' && r.status !== filterStatus) return false;
            return true;
        });
    }, [periodFilteredData, searchQuery, filterDivision, filterDepartment, filterCategory, filterOwner, filterStatus]);

    const heatmapData = useMemo(() => {
        const grid: { inherent: ProcessedRisk[], residual: ProcessedRisk[] }[][] = Array(config.matrixSize).fill(0).map(() => Array(config.matrixSize).fill(0).map(() => ({ inherent: [], residual: [] })));
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
    
    return (
        <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
                <div className="mb-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            {dataSource === 'active'
                                ? `Displaying ${filteredData.filter(r => isPriorityRisk(priorityRisks, r.user_id, r.risk_code)).length} priority risk(s)`
                                : `Displaying ${filteredData.length} historical risk(s)`}
                            {selectedPeriods.length > 0 && <span className="ml-2 text-blue-600 font-medium">({selectedPeriods.join(', ')})</span>}
                            {loadingHistory && <span className="ml-2 text-gray-400">(Loading history...)</span>}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2"><Checkbox id="showInherent" checked={heatMapView.inherent} onCheckedChange={c => setHeatMapView(v => ({ ...v, inherent: !!c }))} /><label htmlFor="showInherent" className="text-sm">Show Inherent</label></div>
                            <div className="flex items-center gap-2"><Checkbox id="showResidual" checked={heatMapView.residual} onCheckedChange={c => setHeatMapView(v => ({ ...v, residual: !!c }))} /><label htmlFor="showResidual" className="text-sm">Show Residual</label></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Data Source:</span>
                            <Select value={dataSource} onValueChange={(v: 'active' | 'history') => { setDataSource(v); setSelectedPeriods([]); }}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active Risks</SelectItem>
                                    <SelectItem value="history">Risk History</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(dataSource === 'active' ? uniquePeriods.length > 0 : historicalPeriods.length > 0) && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Filter by Period:</span>
                                <MultiSelectPopover
                                    title="Periods"
                                    options={dataSource === 'active' ? uniquePeriods : historicalPeriods}
                                    selected={selectedPeriods}
                                    setSelected={setSelectedPeriods}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Input placeholder="Search risks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
                        <Select value={filterDivision} onValueChange={setFilterDivision}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Division" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Divisions</SelectItem>
                                {uniqueValues.divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Department" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {uniqueValues.departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {uniqueValues.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterOwner} onValueChange={setFilterOwner}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Owner" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Owners</SelectItem>
                                {uniqueValues.owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {uniqueValues.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex">
                    <div className="flex flex-col justify-start pt-8 pr-2">
                         {Array.from({ length: config.matrixSize }, (_, i) => config.matrixSize - i).map(imp => (
                            <div key={imp} className="h-20 flex items-center justify-center text-xs font-semibold">{config.impactLabels[imp-1]}</div>
                        ))}
                    </div>
                    <div className="flex-grow">
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${config.matrixSize}, 1fr)` }}>
                            {heatmapData.slice().reverse().map((row, impIndex) => (
                                row.map((cell, probIndex) => {
                                    const impact = config.matrixSize - impIndex;
                                    const likelihood = probIndex + 1;
                                    const bucketName = bucket(likelihood, impact, config.matrixSize);
                                    const bgColor = scoreColor(bucketName);
                                    const allRisksInCell = [...new Map([...cell.inherent, ...cell.residual].map(item => [item['risk_code'], item])).values()];

                                    return (
                                        <Popover key={`${likelihood}-${impact}`}>
                                            <PopoverTrigger asChild>
                                                <div
                                                     className="h-20 border border-gray-200 flex items-center justify-center p-1 relative cursor-pointer"
                                                     style={{ backgroundColor: `${bgColor}E6` }}>
                                                    <div className="flex gap-2 text-lg font-bold">
                                                        {heatMapView.inherent && cell.inherent.length > 0 && <span className="text-blue-700">{cell.inherent.length}</span>}
                                                        {heatMapView.inherent && heatMapView.residual && cell.inherent.length > 0 && cell.residual.length > 0 && <span className="text-gray-400">/</span>}
                                                        {heatMapView.residual && cell.residual.length > 0 && <span className="text-rose-700">{cell.residual.length}</span>}
                                                    </div>
                                                </div>
                                            </PopoverTrigger>
                                            {allRisksInCell.length > 0 && (
                                                <PopoverContent>
                                                    <div className="font-bold text-sm mb-2">Risks in cell (L:{likelihood}, I:{impact})</div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {heatMapView.inherent && cell.inherent.length > 0 && (
                                                            <div>
                                                                <h4 className="font-semibold text-blue-700 mt-2">Inherent Position</h4>
                                                                {cell.inherent.map(risk => (
                                                                    <button key={risk.risk_code} className="w-full text-left border-b p-2 text-xs hover:bg-gray-100" onClick={() => onEditRisk(risk)}>
                                                                        <p className="font-bold">{risk.risk_code}: {risk.risk_title}</p>
                                                                        <p className="text-gray-600 text-xs">(Residual L: {risk.likelihood_residual.toFixed(1)}, I: {risk.impact_residual.toFixed(1)})</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {heatMapView.residual && cell.residual.length > 0 && (
                                                             <div>
                                                                <h4 className="font-semibold text-rose-700 mt-2">Residual Position</h4>
                                                                {cell.residual.map(risk => (
                                                                    <button key={risk.risk_code} className="w-full text-left border-b p-2 text-xs hover:bg-gray-100" onClick={() => onEditRisk(risk)}>
                                                                        <p className="font-bold">{risk.risk_code}: {risk.risk_title}</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            )}
                                        </Popover>
                                    );
                                })
                            ))}
                        </div>
                        <div className="flex justify-between pl-8 pr-8">
                           {Array.from({ length: config.matrixSize }, (_, i) => i + 1).map(lik => (
                                <div key={lik} className="w-20 text-center text-xs font-semibold">{config.likelihoodLabels[lik-1]}</div>
                           ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RiskHistoryTab({ config, showToast }: { config: AppConfig; showToast: (msg: string, type?: 'success' | 'error') => void }) {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

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

            if (error) throw error;
            setHistoryData(data || []);
        } catch (error: any) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (period: string) => {
        if (!confirm(`Restore ${period}? This will move all risks back to the active register for editing.`)) {
            return;
        }

        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('restore_user_period', { target_period: period });

            if (error) throw error;
            if (data?.success) {
                showToast(`Period ${period} restored. ${data.restored_count} risk(s) moved back to active register.`);
                await loadHistory();
            } else {
                showToast(data?.error || 'Failed to restore period', 'error');
            }
        } catch (error: any) {
            console.error('Error restoring period:', error);
            showToast(error.message || 'Failed to restore period', 'error');
        }
    };

    const handleDelete = async (period: string) => {
        if (!confirm(`⚠️ PERMANENTLY DELETE ${period}? This cannot be undone! All committed risks for this period will be lost.`)) {
            return;
        }

        try {
            const { supabase } = await import('@/lib/supabase');
            const { data, error } = await supabase.rpc('delete_user_period', { target_period: period });

            if (error) throw error;
            if (data?.success) {
                showToast(`Period ${period} permanently deleted. ${data.deleted_count} risk(s) removed from history.`);
                await loadHistory();
            } else {
                showToast(data?.error || 'Failed to delete period', 'error');
            }
        } catch (error: any) {
            console.error('Error deleting period:', error);
            showToast(error.message || 'Failed to delete period', 'error');
        }
    };

    // Get unique periods from history
    const uniquePeriods = useMemo(() => {
        const periods = new Set(historyData.map(r => r.period));
        return Array.from(periods);
    }, [historyData]);

    // Filter by selected period
    const filteredHistory = useMemo(() => {
        if (!selectedPeriod) return historyData;
        return historyData.filter(r => r.period === selectedPeriod);
    }, [historyData, selectedPeriod]);

    if (loading) {
        return <div className="p-8 text-center">Loading history...</div>;
    }

    if (historyData.length === 0) {
        return (
            <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No committed periods yet. Use the "Commit Period" button to save your risks to history.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle>My Risk History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Label>Filter by Period:</Label>
                        <Select value={selectedPeriod || "all"} onValueChange={(v) => setSelectedPeriod(v === "all" ? null : v)}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Periods</SelectItem>
                                {uniquePeriods.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedPeriod && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(selectedPeriod)}
                            >
                                Restore {selectedPeriod}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(selectedPeriod)}
                            >
                                Delete {selectedPeriod}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="overflow-auto rounded-xl border bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold">Period</th>
                                <th className="px-3 py-2 text-left font-semibold">Risk Code</th>
                                <th className="px-3 py-2 text-left font-semibold">Title</th>
                                <th className="px-3 py-2 text-left font-semibold">Division</th>
                                <th className="px-3 py-2 text-left font-semibold">Department</th>
                                <th className="px-3 py-2 text-left font-semibold">Category</th>
                                <th className="px-3 py-2 text-left font-semibold">Owner</th>
                                <th className="px-3 py-2 text-left font-semibold">LxI (Inh)</th>
                                <th className="px-3 py-2 text-left font-semibold">Inherent Risk</th>
                                <th className="px-3 py-2 text-left font-semibold">LxI (Res)</th>
                                <th className="px-3 py-2 text-left font-semibold">Residual Risk</th>
                                <th className="px-3 py-2 text-left font-semibold">Status</th>
                                <th className="px-3 py-2 text-left font-semibold">Committed Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map((risk, index) => {
                                const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
                                const inherentLevel = bucket(risk.likelihood_inherent, risk.impact_inherent, config.matrixSize);
                                // Use stored residual values from history (fallback to inherent if not set)
                                const likelihoodRes = risk.likelihood_residual ?? risk.likelihood_inherent;
                                const impactRes = risk.impact_residual ?? risk.impact_inherent;
                                const residualScore = likelihoodRes * impactRes;
                                const residualLevel = bucket(likelihoodRes, impactRes, config.matrixSize);
                                return (
                                    <tr key={risk.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="px-3 py-2 font-medium">{risk.period}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{risk.risk_code}</td>
                                        <td className="px-3 py-2">{risk.risk_title}</td>
                                        <td className="px-3 py-2">{risk.division}</td>
                                        <td className="px-3 py-2">{risk.department}</td>
                                        <td className="px-3 py-2">{risk.category}</td>
                                        <td className="px-3 py-2">{risk.owner}</td>
                                        <td className="px-3 py-2 text-center font-medium">{inherentScore.toFixed(1)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                inherentLevel === 'Minimal' ? 'bg-green-100 text-green-800' :
                                                inherentLevel === 'Low' ? 'bg-green-200 text-green-900' :
                                                inherentLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                inherentLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {inherentLevel}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-medium">{residualScore.toFixed(1)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                residualLevel === 'Minimal' ? 'bg-green-100 text-green-800' :
                                                residualLevel === 'Low' ? 'bg-green-200 text-green-900' :
                                                residualLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                residualLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {residualLevel}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{risk.status}</td>
                                        <td className="px-3 py-2 text-xs">{new Date(risk.committed_date).toLocaleDateString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="text-sm text-gray-600">
                    Showing {filteredHistory.length} committed risk(s) {selectedPeriod ? `for ${selectedPeriod}` : 'across all periods'}
                </div>
            </CardContent>
        </Card>
    );
}


function RiskImportTab({ onImport, currentConfig, canEdit }: { onImport: (risks: ParsedRisk[], discovered: DiscoveredConfig) => void; currentConfig: AppConfig; canEdit: boolean }) {
    const [parsedData, setParsedData] = useState<ParsedRisk[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [discoveredConfig, setDiscoveredConfig] = useState<DiscoveredConfig | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setFileName(file.name);
        file.text().then(text => {
            const result = parseCsvToJson(text);
            const { data, discovered } = processParsedRiskData(result, currentConfig.matrixSize);
            setParsedData(data);
            setDiscoveredConfig(discovered);
        });
    }, [currentConfig.matrixSize]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });
    const handleImport = () => { if (!discoveredConfig) return; const validRisks = parsedData.filter(r => !r.errors || r.errors.length === 0); onImport(validRisks, discoveredConfig); setParsedData([]); setFileName(null); setDiscoveredConfig(null); };
    const validRows = useMemo(() => parsedData.filter(r => !r.errors || r.errors.length === 0), [parsedData]);
    const invalidRowsCount = useMemo(() => parsedData.length - validRows.length, [parsedData, validRows]);
    const newDiscoveries = useMemo(() => { if (!discoveredConfig) return null; const newDivisions = discoveredConfig.divisions.filter(d => !currentConfig.divisions.includes(d)); const newDepartments = discoveredConfig.departments.filter(d => !currentConfig.departments.includes(d)); const newCategories = discoveredConfig.categories.filter(c => !currentConfig.categories.includes(c)); const counts = [newDivisions.length > 0 ? `${newDivisions.length} new division(s)` : '', newDepartments.length > 0 ? `${newDepartments.length} new department(s)` : '', newCategories.length > 0 ? `${newCategories.length} new category(s)` : ''].filter(Boolean); return { counts, total: newDivisions.length + newDepartments.length + newCategories.length }; }, [discoveredConfig, currentConfig]);

    return (<Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Import Risks from CSV</CardTitle></CardHeader><CardContent className="space-y-4"><div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}><input {...getInputProps()} /><FileUp className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-2 text-sm text-gray-600">{isDragActive ? "Drop the file here ..." : "Drag 'n' drop a CSV file here, or click to select file"}</p><p className="text-xs text-gray-500">Required columns: risk_title, risk_description, division, department, category, owner, likelihood_inherent, impact_inherent, status</p></div>{fileName && <p className="text-sm font-medium">Previewing file: <span className="font-normal text-gray-700">{fileName}</span></p>}{parsedData.length > 0 && (<div className="space-y-4"><div className="overflow-auto rounded-xl border bg-white max-h-96"><table className="w-full text-sm"><thead className="bg-gray-100 sticky top-0"><tr>{["Title", "Category", "Owner", "L (Inh)", "I (Inh)", "Status", "Errors"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead><tbody>{parsedData.map((row, index) => (<tr key={index} className={`border-t ${row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}`}><td className="px-3 py-2">{row.risk_title}</td><td className="px-3 py-2">{row.category}</td><td className="px-3 py-2">{row.owner}</td><td className="px-3 py-2">{isNaN(row.likelihood_inherent) ? '' : row.likelihood_inherent}</td><td className="px-3 py-2">{isNaN(row.impact_inherent) ? '' : row.impact_inherent}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2 text-red-600 text-xs">{row.errors?.join(', ')}</td></tr>))}</tbody></table></div><div className="flex justify-between items-center"><div className="text-sm text-gray-600 space-y-1">{invalidRowsCount > 0 ? <span className="text-red-600 font-semibold flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>{invalidRowsCount} row(s) have errors and will be skipped.</span> : <span className="text-green-600 font-semibold">All {parsedData.length} rows look good!</span>}{newDiscoveries && newDiscoveries.total > 0 && <span className="text-blue-600 font-semibold">Found {newDiscoveries.counts.join(', ')}. These will be added to your configuration.</span>}</div><Button onClick={handleImport} disabled={validRows.length === 0}>Import {validRows.length > 0 ? validRows.length : ''} Valid Risks</Button></div></div>)}</CardContent></Card>);
}

function ControlImportTab({ onImport, allRisks, canEdit }: { onImport: (controls: ParsedControl[]) => void; allRisks: RiskRow[]; canEdit: boolean }) {
    const [parsedData, setParsedData] = useState<ParsedControl[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setFileName(file.name);
        file.text().then(text => {
            const result = parseCsvToJson(text);
            setParsedData(processParsedControlsData(result, allRisks));
        });
    }, [allRisks]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, multiple: false });
    const handleImport = () => { const validControls = parsedData.filter(c => !c.errors || c.errors.length === 0); onImport(validControls); setParsedData([]); setFileName(null); };
    const validRows = useMemo(() => parsedData.filter(c => !c.errors || c.errors.length === 0), [parsedData]);
    const invalidRowsCount = useMemo(() => parsedData.length - validRows.length, [parsedData, validRows]);

    return (<Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Import Controls from CSV</CardTitle></CardHeader><CardContent className="space-y-4"><div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}><input {...getInputProps()} /><FileUp className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-2 text-sm text-gray-600">{isDragActive ? "Drop the file here ..." : "Drag 'n' drop a CSV file here, or click to select file"}</p><p className="text-xs text-gray-500">Required columns: risk_code, control_description, target, design, implementation, monitoring, effectiveness_evaluation</p></div>{fileName && <p className="text-sm font-medium">Previewing file: <span className="font-normal text-gray-700">{fileName}</span></p>}{parsedData.length > 0 && (<div className="space-y-4"><div className="overflow-auto rounded-xl border bg-white max-h-96"><table className="w-full text-sm"><thead className="bg-gray-100 sticky top-0"><tr>{["Risk Code", "Risk Title", "Control Description", "Target", "D", "I", "M", "E", "Errors"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>)}</tr></thead><tbody>{parsedData.map((row, index) => (<tr key={index} className={`border-t ${row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}`}><td className="px-3 py-2">{row.risk_code}</td><td className="px-3 py-2">{row.risk_title}</td><td className="px-3 py-2">{row.description}</td><td className="px-3 py-2">{row.target}</td><td className="px-3 py-2">{row.design}</td><td className="px-3 py-2">{row.implementation}</td><td className="px-3 py-2">{row.monitoring}</td><td className="px-3 py-2">{row.effectiveness_evaluation}</td><td className="px-3 py-2 text-red-600 text-xs">{row.errors?.join(', ')}</td></tr>))}</tbody></table></div><div className="flex justify-between items-center"><div className="text-sm text-gray-600 space-y-1">{invalidRowsCount > 0 ? <span className="text-red-600 font-semibold flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>{invalidRowsCount} row(s) have errors and will be skipped.</span> : <span className="text-green-600 font-semibold">All {parsedData.length} rows look good!</span>}</div><Button onClick={handleImport} disabled={validRows.length === 0}>Import {validRows.length > 0 ? validRows.length : ''} Valid Controls</Button></div></div>)}</CardContent></Card>);
}

function DeleteConfirmationDialog({ onConfirm, riskCode }: { onConfirm: () => void; riskCode: string; }) {
    const [open, setOpen] = useState(false);
    return ( <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-red-500" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Are you absolutely sure?</DialogTitle><DialogDescription>This action cannot be undone. This will permanently delete the risk <span className="font-semibold">{riskCode}</span>.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>Delete</Button></DialogFooter></DialogContent></Dialog> );
}

function processParsedRiskData(rawData: any[], matrixSize: 5 | 6) {
    const discoveredDivisions = new Set<string>(); const discoveredDepartments = new Set<string>(); const discoveredCategories = new Set<string>();
    const data = rawData.map((rowData: any) => {
        const risk: ParsedRisk = { risk_title: rowData.risk_title?.trim() || '', risk_description: rowData.risk_description?.trim() || '', division: rowData.division?.trim() || '', department: rowData.department?.trim() || '', category: rowData.category?.trim() || '', owner: rowData.owner?.trim() || '', relevant_period: rowData.relevant_period?.trim() || null, likelihood_inherent: parseInt(rowData.likelihood_inherent, 10), impact_inherent: parseInt(rowData.impact_inherent, 10), status: rowData.status?.trim() as any, controls: [], errors: [] };
        if (!risk.risk_title) risk.errors?.push('Missing title');
        if (isNaN(risk.likelihood_inherent) || risk.likelihood_inherent < 1 || risk.likelihood_inherent > matrixSize) risk.errors?.push(`Invalid L-Inherent (1-${matrixSize})`);
        if (isNaN(risk.impact_inherent) || risk.impact_inherent < 1 || risk.impact_inherent > matrixSize) risk.errors?.push(`Invalid I-Inherent (1-${matrixSize})`);
        if (!['Open', 'In Progress', 'Closed'].includes(risk.status)) risk.errors?.push('Invalid status');
        if (risk.errors?.length === 0) { if (risk.division) discoveredDivisions.add(risk.division); if (risk.department) discoveredDepartments.add(risk.department); if (risk.category) discoveredCategories.add(risk.category); }
        return risk;
    });
    return { data, discovered: { divisions: Array.from(discoveredDivisions), departments: Array.from(discoveredDepartments), categories: Array.from(discoveredCategories) } };
}

function processParsedControlsData(rawData: any[], allRisks: RiskRow[]): ParsedControl[] {
    const risksMap = new Map(allRisks.map(r => [r.risk_code, r.risk_title]));
    return rawData.map((rowData: any) => {
        const risk_code = rowData.risk_code?.trim() || '';
        const control: ParsedControl = {
            risk_code,
            risk_title: risksMap.get(risk_code) || 'Unknown Risk',
            description: rowData.control_description?.trim() || '',
            target: rowData.target?.trim() as any,
            design: parseInt(rowData.design, 10),
            implementation: parseInt(rowData.implementation, 10),
            monitoring: parseInt(rowData.monitoring, 10),
            effectiveness_evaluation: parseInt(rowData.effectiveness_evaluation, 10),
            errors: []
        };

        if (!control.risk_code) control.errors?.push('Missing risk_code');
        else if (!risksMap.has(control.risk_code)) control.errors?.push('Unknown risk_code');
        if (!control.description) control.errors?.push('Missing control_description');
        if (!['Likelihood', 'Impact'].includes(control.target)) control.errors?.push('Invalid target');
        if (isNaN(control.design) || control.design < 0 || control.design > 3) control.errors?.push('Invalid design');
        if (isNaN(control.implementation) || control.implementation < 0 || control.implementation > 3) control.errors?.push('Invalid impl.');
        if (isNaN(control.monitoring) || control.monitoring < 0 || control.monitoring > 3) control.errors?.push('Invalid monitoring');
        if (isNaN(control.effectiveness_evaluation) || control.effectiveness_evaluation < 0 || control.effectiveness_evaluation > 3) control.errors?.push('Invalid eval.');
        return control;
    });
}


function MultiSelectPopover({ title, options, selected, setSelected }: { title: string; options: readonly string[]; selected: string[]; setSelected: (selected: string[]) => void; }) { const handleSelect = (value: string) => { const newSelected = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]; setSelected(newSelected); }; return (<Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{selected.length > 0 ? `${title} (${selected.length})` : `All ${title}`}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[200px] p-0"><div className="p-2 space-y-1">{options.map(option => (<div key={option} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100"><Checkbox id={`ms-${title}-${option}`} checked={selected.includes(option)} onCheckedChange={() => handleSelect(option)} /><Label htmlFor={`ms-${title}-${option}`} className="w-full text-sm font-normal">{option}</Label></div>))}</div></PopoverContent></Popover>); }
function AddRiskDialog({ onAdd, config, rows }: { onAdd: (r: Omit<RiskRow, 'risk_code'>) => void; config: AppConfig; rows: RiskRow[] }) { const [open, setOpen] = useState(false); const [form, setForm] = useState<Omit<RiskRow, 'risk_code'>>({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: "", relevant_period: null, likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" }); const preview = useMemo(() => nextRiskCode(rows, form.division, form.category), [rows, form.division, form.category]); const handleSave = () => { onAdd(form); setOpen(false); setForm({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: "", relevant_period: null, likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" });}; return (<Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Risk</Button></DialogTrigger><DialogContent className="max-w-3xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Add a Risk</DialogTitle></DialogHeader><RiskFields form={form} setForm={setForm} config={config} codePreview={preview} codeLocked /><DialogFooter className="pt-4"><Button onClick={handleSave}>Save</Button></DialogFooter></DialogContent></Dialog>); }
function EditRiskDialog({ initial, config, onSave, children, open, onOpenChange }: { initial: ProcessedRisk; config: AppConfig; onSave: (p: Omit<RiskRow, 'risk_code'>) => void; children?: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) { 
    const [form, setForm] = useState<Omit<RiskRow, 'risk_code'>>({ ...initial }); 
    useEffect(() => { setForm({ ...initial }) }, [initial]); 
    const handleSave = () => { onSave(form); onOpenChange(false); }; 
    const period = (initial as any).period || initial.relevant_period;
    return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Edit {initial.risk_code} {period && <span className="text-sm font-normal text-gray-500">({period})</span>}</DialogTitle></DialogHeader><RiskFields form={form} setForm={setForm} config={config} codePreview={initial.risk_code} codeLocked /><DialogFooter className="pt-4"><Button onClick={handleSave}>Save</Button></DialogFooter></DialogContent></Dialog>); 
}
function RiskFields({ form, setForm, config, codePreview, codeLocked }: { form: Omit<RiskRow, 'risk_code'>; setForm: React.Dispatch<React.SetStateAction<Omit<RiskRow, "risk_code">>>; config: AppConfig; codePreview: string; codeLocked?: boolean }) { 
    const [isSuggesting, setIsSuggesting] = useState(false);
    const setField = <K extends keyof Omit<RiskRow, 'risk_code'>>(k: K, v: Omit<RiskRow, 'risk_code'>[K]) => setForm(p => ({ ...p, [k]: v })); 
    const addControl = () => setForm(p => ({ ...p, controls: [...p.controls, { id: crypto.randomUUID(), description: "", target: "Likelihood", design: 0, implementation: 0, monitoring: 0, effectiveness_evaluation: 0 }] })); 
    const updateControl = (id: string, updatedControl: Partial<Control>) => setForm(p => ({ ...p, controls: p.controls.map(c => c.id === id ? { ...c, ...updatedControl } : c) })); 
    const removeControl = (id: string) => setForm(p => ({ ...p, controls: p.controls.filter(c => c.id !== id) })); 
    const residualRisk = calculateResidualRisk(form as RiskRow); 
    
    const handleSuggestControls = async () => {
        if (!form.risk_title || !form.risk_description) {
            alert("Please enter a title and description for the risk first.");
            return;
        }
        setIsSuggesting(true);
        try {
            const prompt = `Based on the risk titled "${form.risk_title}" with the description "${form.risk_description}", suggest 3 relevant control measures. Include a mix of controls: some that reduce the 'Likelihood' of the risk occurring, and some that reduce the 'Impact' if it does occur. For each control, provide a brief description and specify whether it primarily targets 'Likelihood' or 'Impact'.`;
            const schema = {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  description: { type: "STRING" },
                  target: { type: "STRING", enum: ["Likelihood", "Impact"] },
                },
                required: ["description", "target"],
              },
            };
            const suggestions = await callGeminiAPI(prompt, schema) as {description: string, target: "Likelihood" | "Impact"}[];

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
            } else {
                 alert("The AI could not suggest any controls for this risk.");
            }
        } catch (error) {
            console.error("Failed to get AI suggestions:", error);
            alert("An error occurred while getting AI suggestions. Please try again.");
        } finally {
            setIsSuggesting(false);
        }
    };

    const periodOptions = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "FY2025", "FY2026"];

    return (<div className="flex-grow overflow-y-auto -mr-4 pr-4 space-y-6"><div className="grid grid-cols-2 gap-4"><div><Label>Risk Code</Label><Input value={codePreview} readOnly={!!codeLocked} className={codeLocked ? "bg-gray-100" : ""} /></div><div><Label>Status</Label><Select value={form.status} onValueChange={v => setField('status', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Open", "In Progress", "Closed"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div className="col-span-2"><Label>Title</Label><Input value={form.risk_title} onChange={e => setField('risk_title', e.target.value)} /></div><div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.risk_description} onChange={e => setField('risk_description', e.target.value)} /></div><div><Label>Division</Label><Select value={form.division} onValueChange={v => setField('division', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.divisions.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Department</Label><Select value={form.department} onValueChange={v => setField('department', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.departments.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Category</Label><Select value={form.category} onValueChange={v => setField('category', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.categories.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Owner</Label><Input value={form.owner} onChange={e => setField('owner', e.target.value)} /></div><div className="col-span-2"><Label>Relevant Period</Label><Select value={form.relevant_period || undefined} onValueChange={v => setField('relevant_period', v)}><SelectTrigger><SelectValue placeholder="Select period..." /></SelectTrigger><SelectContent>{periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}<SelectItem value="custom">Custom...</SelectItem></SelectContent></Select>{form.relevant_period === "custom" && <Input placeholder="Enter custom period (e.g., H1 2025)" value="" onChange={e => setField('relevant_period', e.target.value)} className="mt-2" />}</div></div><div className="space-y-2"><h3 className="font-semibold text-gray-800">Inherent Risk</h3><div className="grid grid-cols-2 gap-4"><div><Label>Likelihood (Inherent)</Label><Select value={String(form.likelihood_inherent)} onValueChange={v => setField('likelihood_inherent', Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.likelihoodLabels.map((label, index) => <SelectItem key={index + 1} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Impact (Inherent)</Label><Select value={String(form.impact_inherent)} onValueChange={v => setField('impact_inherent', Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.impactLabels.map((label, index) => <SelectItem key={index + 1} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent></Select></div></div></div><div className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-semibold text-gray-800">Controls</h3><div className="flex gap-2">{/* <Button onClick={handleSuggestControls} size="sm" variant="outline" disabled={isSuggesting}><Sparkles className="mr-2 h-4 w-4"/>{isSuggesting ? 'Thinking...' : 'Suggest Controls'}</Button> */}<Button onClick={addControl} size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Add Control</Button></div></div>{form.controls.map((control, index) => (<div key={control.id} className="border rounded-lg p-4 space-y-4 bg-gray-50"><div className="flex justify-between items-start"><div className="flex-grow space-y-2"><Label>Control #{index + 1} Description</Label><Textarea placeholder="e.g., Daily reconciliation process" value={control.description} onChange={e => updateControl(control.id, { description: e.target.value })} /></div><Button variant="ghost" size="sm" className="ml-4" onClick={() => removeControl(control.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div><div><Label>Target</Label><Select value={control.target} onValueChange={(v: "Likelihood" | "Impact") => updateControl(control.id, { target: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Likelihood">Likelihood</SelectItem><SelectItem value="Impact">Impact</SelectItem></SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>D (Design)</Label><Select value={String(control.design)} onValueChange={v => updateControl(control.id, { design: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_DESIGN_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>I (Implementation)</Label><Select value={String(control.implementation)} onValueChange={v => updateControl(control.id, { implementation: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_IMPLEMENTATION_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>M (Monitoring)</Label><Select value={String(control.monitoring)} onValueChange={v => updateControl(control.id, { monitoring: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_MONITORING_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>E (Evaluation)</Label><Select value={String(control.effectiveness_evaluation)} onValueChange={v => updateControl(control.id, { effectiveness_evaluation: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_EFFECTIVENESS_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div></div></div>))}{form.controls.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No controls added. Residual risk will equal inherent risk.</p>}</div><div className="space-y-2"><h3 className="font-semibold text-gray-800">Residual Risk (Calculated)</h3><div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50"><div><Label>Likelihood (Residual)</Label><Input readOnly value={`${residualRisk.likelihood.toFixed(2)} (${config.likelihoodLabels[Math.round(residualRisk.likelihood)-1] || 'N/A'})`} className="bg-white font-mono" /></div><div><Label>Impact (Residual)</Label><Input readOnly value={`${residualRisk.impact.toFixed(2)} (${config.impactLabels[Math.round(residualRisk.impact)-1] || 'N/A'})`} className="bg-white font-mono" /></div></div></div></div>); 
}

function ConfigDialog({ config, onSave }: { config: AppConfig; onSave: (c: AppConfig) => void }) {
    const [draft, setDraft] = useState<AppConfig>(config);
    useEffect(() => { setDraft(config); }, [config]);

    const handleSizeChange = (size: '5' | '6') => {
        const newSize = parseInt(size, 10) as 5 | 6;
        setDraft(prev => {
            const newLikelihoodLabels = Array.from({ length: newSize }, (_, i) => prev.likelihoodLabels[i] || `Likelihood ${i + 1}`);
            const newImpactLabels = Array.from({ length: newSize }, (_, i) => prev.impactLabels[i] || `Impact ${i + 1}`);
            return { ...prev, matrixSize: newSize, likelihoodLabels: newLikelihoodLabels, impactLabels: newImpactLabels };
        });
    };

    const handleLabelChange = (type: 'likelihood' | 'impact', index: number, value: string) => {
        setDraft(prev => {
            const newLabels = type === 'likelihood' ? [...prev.likelihoodLabels] : [...prev.impactLabels];
            newLabels[index] = value;
            return type === 'likelihood' ? { ...prev, likelihoodLabels: newLabels } : { ...prev, impactLabels: newLabels };
        });
    };

    const handleListChange = (type: 'divisions' | 'departments' | 'categories', value: string) => {
        setDraft(p => ({ ...p, [type]: value.split(',').map(s => s.trim()) }));
    };
    
    const apply = () => {
        onSave({
            ...draft,
            divisions: draft.divisions.filter(Boolean),
            departments: draft.departments.filter(Boolean),
            categories: draft.categories.filter(Boolean),
        });
    };

    return (<Dialog><DialogTrigger asChild><Button variant="outline"><Settings className="mr-2 h-4 w-4" />Configure</Button></DialogTrigger><DialogContent className="max-w-4xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Configuration</DialogTitle></DialogHeader>
        <div className="flex-grow overflow-y-auto -mr-4 pr-4 space-y-6">
            <div className="space-y-2">
                <Label className="font-semibold">Risk Matrix Setup</Label>
                <RadioGroup value={String(draft.matrixSize)} onValueChange={handleSizeChange} className="flex items-center gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="5" id="r1" /><Label htmlFor="r1">5x5 Matrix</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="6" id="r2" /><Label htmlFor="r2">6x6 Matrix</Label></div>
                </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Likelihood Labels</Label>
                    {draft.likelihoodLabels.map((label, index) => <Input key={index} value={label} onChange={e => handleLabelChange('likelihood', index, e.target.value)} placeholder={`Level ${index + 1}`} />)}
                </div>
                <div className="space-y-2">
                    <Label>Impact Labels</Label>
                    {draft.impactLabels.map((label, index) => <Input key={index} value={label} onChange={e => handleLabelChange('impact', index, e.target.value)} placeholder={`Level ${index + 1}`} />)}
                </div>
            </div>
             <div className="space-y-2">
                 <Label className="font-semibold">Prepopulated Lists</Label>
                <div className="grid grid-cols-2 gap-6">
                    <div><Label>Divisions (comma-separated)</Label><Textarea rows={4} value={draft.divisions.join(', ')} onChange={e => handleListChange('divisions', e.target.value)} /></div>
                    <div><Label>Departments (comma-separated)</Label><Textarea rows={4} value={draft.departments.join(', ')} onChange={e => handleListChange('departments', e.target.value)} /></div>
                    <div className="col-span-2"><Label>Categories (comma-separated)</Label><Textarea rows={3} value={draft.categories.join(', ')} onChange={e => handleListChange('categories', e.target.value)} /></div>
                </div>
            </div>
        </div>
        <DialogFooter className="pt-4"><Button onClick={apply}>Save Configuration</Button></DialogFooter>
    </DialogContent></Dialog>);
}

function AIAssistantTab({ onAddMultipleRisks, config, onSwitchTab }: { onAddMultipleRisks: (risks: Omit<RiskRow, 'risk_code'>[]) => void; config: AppConfig; onSwitchTab: (tab: string) => void; }) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<AISuggestedRisk[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
    const [suggestionData, setSuggestionData] = useState<{ [key: number]: { category: string; division: string; } }>({});
    const [error, setError] = useState<string | null>(null);

     const isAddButtonDisabled = useMemo(() => {
        if (selectedSuggestions.size === 0) return true;
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
  function parseRisks(text: string) {
    try {
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      const slice = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
      return JSON.parse(slice);
    } catch {
      const cleaned = text.replace(/```json|```/g, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch {
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

    // Calls our /api/gemini via '@/lib/ai'
    const text = await askGemini(fullPrompt);

    const parsed = parseRisks(text);

    const items = (Array.isArray(parsed) ? parsed : [])
      .map((r: any) => ({
        risk_title: String(r?.risk_title ?? r?.title ?? "").trim().slice(0, 120),
        risk_description: String(r?.risk_description ?? r?.description ?? "").trim(),
      }))
      .filter((r: any) => r.risk_title && r.risk_description);

    if (!items.length) {
      console.error("AI raw response:", text);
      setError("AI returned an unexpected format. Try rephrasing the description.");
      return;
    }

    // If your state is typed: use AISuggestedRisk[]
    setSuggestions(items as AISuggestedRisk[]);
  } catch (e: any) {
    console.error("AI error:", e);
    setError(e?.message || "An error occurred while communicating with the AI.");
  } finally {
    setIsLoading(false);
  }
};

    const handleSelectionChange = (index: number, checked: boolean) => {
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(index);
            } else {
                newSet.delete(index);
            }
            return newSet;
        });
    };

    const handleSuggestionDataChange = (index: number, field: 'category' | 'division', value: string) => {
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
            const data = suggestionData[index]!; // Disabled button ensures this exists
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
                status: "Open" as "Open"
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

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
                    AI Assistant: Proactive Risk Identification
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="ai-prompt">Describe a new project, process, or business area:</Label>
                    <Textarea
                        id="ai-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'We are planning to launch a new mobile banking application for retail customers...'"
                        rows={5}
                        className="mt-1"
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleGenerateRisks} disabled={isLoading}>
                        {isLoading ? "Analyzing..." : "Identify Risks"}
                    </Button>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {suggestions.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-semibold">Suggested Risks:</h3>
                        {suggestions.map((risk, index) => (
                            <Card key={index} className="bg-gray-50">
                                <CardContent className="p-4 flex flex-col gap-4">
                                     <div className="flex items-start gap-4 flex-grow">
                                        <Checkbox 
                                            id={`suggestion-${index}`} 
                                            className="mt-1"
                                            onCheckedChange={(checked) => handleSelectionChange(index, !!checked)}
                                        />
                                        <div className="flex-grow">
                                            <Label htmlFor={`suggestion-${index}`} className="font-bold">{risk.risk_title}</Label>
                                            <p className="text-sm text-gray-600">{risk.risk_description}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pl-8">
                                        <div className="flex items-center gap-2">
                                            <Label className="w-20">Division</Label>
                                            <Select 
                                                value={suggestionData[index]?.division || ""}
                                                onValueChange={(value) => handleSuggestionDataChange(index, 'division', value)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>{config.divisions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label className="w-20">Category</Label>
                                            <Select 
                                                value={suggestionData[index]?.category || ""}
                                                onValueChange={(value) => handleSuggestionDataChange(index, 'category', value)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>{config.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                         <div className="flex justify-end pt-2">
                            <Button onClick={handleAddSelectedRisks} disabled={isAddButtonDisabled}>
                                Add {selectedSuggestions.size > 0 ? `${selectedSuggestions.size} ` : ''}Selected Risk(s) to Register
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

