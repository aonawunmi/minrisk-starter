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
import { Upload, Plus, Search, RefreshCw, Settings, Table, Pencil, Trash2, ChevronsUpDown, FileUp, AlertTriangle, ArrowUpDown, Sparkles } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

/**
 * MinRisk — Version 1.7.2 (Final - Level 2)
 * - Enhanced Heatmap Popover: Inherent risk list now displays the corresponding Residual L & I values for each risk.
 */

// ===== TYPES =====
export type Control = { id: string; description: string; target: "Likelihood" | "Impact"; design: number; implementation: number; monitoring: number; effectiveness_evaluation: number; };
export type RiskRow = { risk_code: string; risk_title: string; risk_description: string; division: string; department: string; category: string; owner: string; likelihood_inherent: number; impact_inherent: number; controls: Control[]; status: "Open" | "In Progress" | "Closed"; };
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

const SEED: RiskRow[] = [{ risk_code: "CRD-001", risk_title: "Counterparty default", risk_description: "Clearing member fails to meet obligations; default waterfall.", division: "Clearing", department: "Risk Management", category: "Credit", owner: "Head, Risk", likelihood_inherent: 4, impact_inherent: 5, status: "In Progress", controls: [{ id: "c1", description: "Daily Margin Calls", target: "Impact", design: 3, implementation: 3, monitoring: 3, effectiveness_evaluation: 3 }, { id: "c2", description: "Member Default Fund", target: "Impact", design: 2, implementation: 3, monitoring: 2, effectiveness_evaluation: 2 }] }, { risk_code: "OPR-003", risk_title: "Settlement system outage", risk_description: "Platform unavailable during settlement window.", division: "Operations", department: "IT Ops", category: "Operational", owner: "CTO", likelihood_inherent: 3, impact_inherent: 5, status: "Open", controls: [{ id: "c3", description: "System Redundancy/Failover", target: "Likelihood", design: 3, implementation: 2, monitoring: 3, effectiveness_evaluation: 2 }] }];

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
const nextRiskCode = (rows: RiskRow[], div: string, cat: string) => { const pre = `${cap3(div)}-${cap3(cat)}`; const nums = rows.filter(r => r && r.risk_code && r.risk_code.startsWith(pre)).map(r => Number((r.risk_code.split("-")[2] || "0").replace(/[^0-9]/g, ""))).filter(Number.isFinite).sort((a, b) => a - b); const n = (nums.at(-1) || 0) + 1; return `${pre}-${String(n).padStart(3, '0')}` };
const calculateControlEffectiveness = (control: Control): number => { if (control.design === 0 || control.implementation === 0) return 0; const totalScore = control.design + control.implementation + control.monitoring + control.effectiveness_evaluation; return totalScore / 12; };
const calculateResidualRisk = (risk: RiskRow) => { const likelihoodControls = risk.controls.filter(c => c.target === 'Likelihood'); const impactControls = risk.controls.filter(c => c.target === 'Impact'); const maxLikelihoodReduction = likelihoodControls.length > 0 ? Math.max(...likelihoodControls.map(calculateControlEffectiveness)) : 0; const maxImpactReduction = impactControls.length > 0 ? Math.max(...impactControls.map(calculateControlEffectiveness)) : 0; const residualLikelihood = risk.likelihood_inherent - (risk.likelihood_inherent - 1) * maxLikelihoodReduction; const residualImpact = risk.impact_inherent - (risk.impact_inherent - 1) * maxImpactReduction; return { likelihood: Math.max(1, residualLikelihood), impact: Math.max(1, residualImpact) }; };

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
const callGeminiAPI = async (prompt: string, schema?: object) => {
    const apiKey = ""; // Leave empty
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload: any = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    if (schema) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: schema,
        };
    }
    
    let attempts = 0;
    while (attempts < 5) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                 throw new Error("No text returned from API.");
            }
            
            return schema ? JSON.parse(text) : text;
            
        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error);
            if (attempts >= 5) {
                throw error; // Rethrow after final attempt
            }
            await new Promise(resolve => setTimeout(resolve, 2 ** attempts * 100)); // Exponential backoff
        }
    }
};


// ===== MAIN APP COMPONENT =====
export default function MinRiskLatest() {
    const [rows, setRows] = useState<RiskRow[]>(SEED);
    const [query, setQuery] = useState("");
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
    const [filters, setFilters] = useState({ divisions: [] as string[], departments: [] as string[], category: "All", status: "All" });
    const [heatMapView, setHeatMapView] = useState({ inherent: true, residual: true });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [priorityRisks, setPriorityRisks] = useState(new Set<string>());
    const [activeTab, setActiveTab] = useState("register");
    const [editingRisk, setEditingRisk] = useState<ProcessedRisk | null>(null);

    const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return rows.filter(r => { const m = !q || [r.risk_code, r.risk_title, r.risk_description, r.owner, r.category, r.division, r.department].join(" ").toLowerCase().includes(q); const d = filters.divisions.length === 0 || filters.divisions.includes(r.division); const de = filters.departments.length === 0 || filters.departments.includes(r.department); const c = filters.category === "All" || r.category === filters.category; const s = filters.status === "All" || r.status === filters.status; return m && d && de && c && s; }); }, [rows, query, filters]);
    const processedData = useMemo(() => { return filtered.map(r => { const residual = calculateResidualRisk(r); return { ...r, likelihood_residual: residual.likelihood, impact_residual: residual.impact, inherent_score: r.likelihood_inherent * r.impact_inherent, residual_score: residual.likelihood * residual.impact }; }); }, [filtered]);
    
    const sortedData = useMemo(() => {
        let sortableItems = [...processedData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (a[sortConfig.key] > b[sortConfig.key]) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return sortableItems;
    }, [processedData, sortConfig]);
    
    const addMultipleRisks = (risksToAdd: Omit<RiskRow, 'risk_code'>[]) => {
        setRows(prevRows => {
            let tempRows = [...prevRows];
            const newRisksWithCodes = risksToAdd.map(risk => {
                const newRisk = { ...risk, risk_code: nextRiskCode(tempRows, risk.division, risk.category) };
                tempRows.push(newRisk);
                return newRisk;
            });
            return [...prevRows, ...newRisksWithCodes];
        });
    };

    const add = (payload: Omit<RiskRow, 'risk_code'>) => addMultipleRisks([payload]);
    
    const save = (code: string, payload: Omit<RiskRow, 'risk_code'>) => setRows(p => p.map(r => r.risk_code === code ? { ...payload, risk_code: code } : r));
    const remove = (code: string) => {
        setRows(p => p.filter(r => r.risk_code !== code));
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            newSet.delete(code);
            return newSet;
        });
    };
    
    const handleRiskBulkImport = (newRisks: ParsedRisk[], discoveredConfig: DiscoveredConfig) => {
        setConfig(prevConfig => ({
            ...prevConfig,
            divisions: [...new Set([...prevConfig.divisions, ...discoveredConfig.divisions])],
            departments: [...new Set([...prevConfig.departments, ...discoveredConfig.departments])],
            categories: [...new Set([...prevConfig.categories, ...discoveredConfig.categories])],
        }));
        setRows(prevRows => {
            let tempRowsForCodeGeneration = [...prevRows];
            const processedNewRisks = newRisks.map(riskWithoutCode => {
                const newRiskWithCode = { ...riskWithoutCode, risk_code: nextRiskCode(tempRowsForCodeGeneration, riskWithoutCode.division, riskWithoutCode.category) };
                tempRowsForCodeGeneration.push(newRiskWithCode as RiskRow);
                return newRiskWithCode;
            });
            return [...prevRows, ...processedNewRisks as RiskRow[]];
        });
    };

    const handleControlBulkImport = (newControls: ParsedControl[]) => {
        setRows(currentRows => {
            const rowsMap = new Map(currentRows.map(r => [r.risk_code, { ...r, controls: [...r.controls] }]));
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
            return Array.from(rowsMap.values());
        });
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

    return <div className="min-h-screen w-full bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl md:text-3xl font-bold">MinRisk</h1><p className="text-sm text-gray-500">Version 1.6.1 (Final)</p></div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setRows(SEED); setConfig(DEFAULT_APP_CONFIG); }}><RefreshCw className="mr-2 h-4 w-4" />Reset Demo</Button>
                <ConfigDialog config={config} onSave={setConfig} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            <div className="col-span-1"><Input placeholder="Search risks..." value={query} onChange={e => setQuery(e.target.value)} /></div>
            <MultiSelectPopover title="Divisions" options={config.divisions} selected={filters.divisions} setSelected={v => setFilters(f => ({ ...f, divisions: v }))} />
            <MultiSelectPopover title="Departments" options={config.departments} selected={filters.departments} setSelected={v => setFilters(f => ({ ...f, departments: v }))} />
            <Select value={filters.category} onValueChange={v => setFilters({ ...filters, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["All", ...config.categories].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["All", "Open", "In Progress", "Closed"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4"><TabsTrigger value="register">Risk Register</TabsTrigger><TabsTrigger value="control_register">Control Register</TabsTrigger><TabsTrigger value="heatmap">Heat Map</TabsTrigger><TabsTrigger value="ai_assistant">✨ AI Assistant</TabsTrigger><TabsTrigger value="import_risks">Risk Import</TabsTrigger><TabsTrigger value="import_controls">Control Import</TabsTrigger></TabsList>
            
            <TabsContent value="register"><RiskRegisterTab sortedData={sortedData} rowCount={rows.length} requestSort={requestSort} onAdd={add} onEdit={setEditingRisk} onRemove={remove} config={config} rows={rows} priorityRisks={priorityRisks} setPriorityRisks={setPriorityRisks} /></TabsContent>
            <TabsContent value="control_register"><ControlRegisterTab allRisks={rows} /></TabsContent>
            <TabsContent value="heatmap"><HeatmapTab processedData={processedData} heatMapView={heatMapView} setHeatMapView={setHeatMapView} priorityRisks={priorityRisks} config={config} onEditRisk={setEditingRisk}/></TabsContent>
            <TabsContent value="ai_assistant"><AIAssistantTab onAddMultipleRisks={addMultipleRisks} config={config} onSwitchTab={setActiveTab}/></TabsContent>
            <TabsContent value="import_risks"><RiskImportTab onImport={handleRiskBulkImport} currentConfig={config}/></TabsContent>
            <TabsContent value="import_controls"><ControlImportTab onImport={handleControlBulkImport} allRisks={rows} /></TabsContent>
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
    </div>;
}

// ===== CHILD COMPONENTS =====

function RiskRegisterTab({ sortedData, rowCount, requestSort, onAdd, onEdit, onRemove, config, rows, priorityRisks, setPriorityRisks }: { sortedData: ProcessedRisk[]; rowCount: number; requestSort: (key: keyof ProcessedRisk) => void; onAdd: (r: Omit<RiskRow, 'risk_code'>) => void; onEdit: (risk: ProcessedRisk) => void; onRemove: (code: string) => void; config: AppConfig; rows: RiskRow[]; priorityRisks: Set<string>; setPriorityRisks: React.Dispatch<React.SetStateAction<Set<string>>> }) {
    
    const visibleRiskCodes = useMemo(() => sortedData.map(r => r.risk_code), [sortedData]);
    const selectedVisibleCount = useMemo(() => visibleRiskCodes.filter(code => priorityRisks.has(code)).length, [visibleRiskCodes, priorityRisks]);
    const isAllSelected = selectedVisibleCount > 0 && selectedVisibleCount === visibleRiskCodes.length;
    const isSomeSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleRiskCodes.length;

    const handleSelectAll = () => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            if (isAllSelected) {
                visibleRiskCodes.forEach(code => newSet.delete(code));
            } else {
                visibleRiskCodes.forEach(code => newSet.add(code));
            }
            return newSet;
        });
    };

    const handlePriorityChange = (riskCode: string, checked: boolean | 'indeterminate') => {
        setPriorityRisks(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(riskCode);
            } else {
                newSet.delete(riskCode);
            }
            return newSet;
        });
    };

    const handleExport = () => {
        if (priorityRisks.size === 0) {
            alert("Please select at least one priority risk to export.");
            return;
        }
        const dataToExport = sortedData
            .filter(r => priorityRisks.has(r.risk_code))
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

    return (<Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><div className="flex items-center justify-between mb-3"><div className="text-sm text-gray-500">Showing {sortedData.length} of {rowCount} risks</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleExport}><Table className="mr-2 h-4 w-4"/>Export CSV</Button><AddRiskDialog rows={rows} onAdd={onAdd} config={config}/></div></div><div className="overflow-auto rounded-xl border bg-white"><table className="min-w-[980px] w-full text-sm"><thead className="bg-gray-100"><tr>
        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">S/N</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700 w-24">
            <div className="flex items-center gap-2">
                <Checkbox id="select-all" checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false} onCheckedChange={handleSelectAll} />
                <Label htmlFor="select-all">Priority</Label>
            </div>
        </th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Owner</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700"><Button variant="ghost" size="sm" onClick={() => requestSort('inherent_score')}>LxI (Inh) <ArrowUpDown className="ml-2 h-4 w-4" /></Button></th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700"><Button variant="ghost" size="sm" onClick={() => requestSort('residual_score')}>LxI (Res) <ArrowUpDown className="ml-2 h-4 w-4" /></Button></th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Bucket (Res)</th>
        <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
        <th></th>
    </tr></thead><tbody>{sortedData.map((r,index)=>{const tag=bucket(r.likelihood_residual,r.impact_residual, config.matrixSize); const textColor = scoreColorText(tag); const bgColorClass = scoreColorClass(tag); return(<tr key={r.risk_code} className="border-t"><td className="px-3 py-2 text-center">{index+1}</td>
    <td className="px-3 py-2 text-center"><Checkbox checked={priorityRisks.has(r.risk_code)} onCheckedChange={checked => handlePriorityChange(r.risk_code, checked)} /></td>
    <td className="px-3 py-2 font-medium">{r.risk_code}</td><td className="px-3 py-2">{r.risk_title}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.owner}</td><td className="px-3 py-2">{r.inherent_score.toFixed(1)}</td><td className="px-3 py-2 font-semibold">{r.residual_score.toFixed(1)}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs ${bgColorClass} ${textColor}`}>{tag}</span></td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2"><div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-4 w-4"/></Button><DeleteConfirmationDialog onConfirm={()=>onRemove(r.risk_code)} riskCode={r.risk_code}/></div></td></tr>)})}</tbody></table></div></CardContent></Card>);
}

function ControlRegisterTab({ allRisks }: { allRisks: RiskRow[] }) {
    const allControls = useMemo(() => {
        return allRisks.flatMap(risk =>
            risk.controls.map(control => ({
                risk_code: risk.risk_code,
                ...control
            }))
        );
    }, [allRisks]);

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

function HeatmapTab({ processedData, heatMapView, setHeatMapView, priorityRisks, config, onEditRisk }: { processedData: ProcessedRisk[]; heatMapView: { inherent: boolean, residual: boolean }; setHeatMapView: React.Dispatch<React.SetStateAction<{ inherent: boolean; residual: boolean; }>>; priorityRisks: Set<string>; config: AppConfig; onEditRisk: (risk: ProcessedRisk) => void; }) {
    
    const heatmapData = useMemo(() => {
        const grid: { inherent: ProcessedRisk[], residual: ProcessedRisk[] }[][] = Array(config.matrixSize).fill(0).map(() => Array(config.matrixSize).fill(0).map(() => ({ inherent: [], residual: [] })));
        const priorityData = processedData.filter(r => priorityRisks.has(r.risk_code));

        priorityData.forEach(risk => {
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
    }, [processedData, priorityRisks, heatMapView, config.matrixSize]);
    
    return (
        <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-500">Displaying {priorityRisks.size} priority risk(s)</div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><Checkbox id="showInherent" checked={heatMapView.inherent} onCheckedChange={c => setHeatMapView(v => ({ ...v, inherent: !!c }))} /><label htmlFor="showInherent" className="text-sm">Show Inherent</label></div>
                        <div className="flex items-center gap-2"><Checkbox id="showResidual" checked={heatMapView.residual} onCheckedChange={c => setHeatMapView(v => ({ ...v, residual: !!c }))} /><label htmlFor="showResidual" className="text-sm">Show Residual</label></div>
                    </div>
                </div>

                <div className="flex">
                    <div className="flex flex-col justify-between pt-8 pb-8 pr-2">
                         {Array.from({ length: config.matrixSize }, (_, i) => config.matrixSize - i).map(imp => (
                            <div key={imp} className="h-20 flex items-center text-xs font-semibold -rotate-90">{config.impactLabels[imp-1]}</div>
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
                                                     style={{ backgroundColor: `${bgColor}33` }}>
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


function RiskImportTab({ onImport, currentConfig }: { onImport: (risks: ParsedRisk[], discovered: DiscoveredConfig) => void; currentConfig: AppConfig; }) {
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

function ControlImportTab({ onImport, allRisks }: { onImport: (controls: ParsedControl[]) => void; allRisks: RiskRow[] }) {
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
        const risk: ParsedRisk = { risk_title: rowData.risk_title?.trim() || '', risk_description: rowData.risk_description?.trim() || '', division: rowData.division?.trim() || '', department: rowData.department?.trim() || '', category: rowData.category?.trim() || '', owner: rowData.owner?.trim() || '', likelihood_inherent: parseInt(rowData.likelihood_inherent, 10), impact_inherent: parseInt(rowData.impact_inherent, 10), status: rowData.status?.trim() as any, controls: [], errors: [] };
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
function AddRiskDialog({ onAdd, config, rows }: { onAdd: (r: Omit<RiskRow, 'risk_code'>) => void; config: AppConfig; rows: RiskRow[] }) { const [open, setOpen] = useState(false); const [form, setForm] = useState<Omit<RiskRow, 'risk_code'>>({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: "", likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" }); const preview = useMemo(() => nextRiskCode(rows, form.division, form.category), [rows, form.division, form.category]); const handleSave = () => { onAdd(form); setOpen(false); setForm({ risk_title: "", risk_description: "", division: config.divisions[0] || "", department: config.departments[0] || "", category: config.categories[0] || "", owner: "", likelihood_inherent: 3, impact_inherent: 3, controls: [], status: "Open" });}; return (<Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Risk</Button></DialogTrigger><DialogContent className="max-w-3xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Add a Risk</DialogTitle></DialogHeader><RiskFields form={form} setForm={setForm} config={config} codePreview={preview} codeLocked /><DialogFooter className="pt-4"><Button onClick={handleSave}>Save</Button></DialogFooter></DialogContent></Dialog>); }
function EditRiskDialog({ initial, config, onSave, children, open, onOpenChange }: { initial: ProcessedRisk; config: AppConfig; onSave: (p: Omit<RiskRow, 'risk_code'>) => void; children?: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) { 
    const [form, setForm] = useState<Omit<RiskRow, 'risk_code'>>({ ...initial }); 
    useEffect(() => { setForm({ ...initial }) }, [initial]); 
    const handleSave = () => { onSave(form); onOpenChange(false); }; 
    return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Edit {initial.risk_code}</DialogTitle></DialogHeader><RiskFields form={form} setForm={setForm} config={config} codePreview={initial.risk_code} codeLocked /><DialogFooter className="pt-4"><Button onClick={handleSave}>Save</Button></DialogFooter></DialogContent></Dialog>); 
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
            const prompt = `Based on the risk titled "${form.risk_title}" with the description "${form.risk_description}", suggest 3 relevant control measures. For each, provide a brief description and specify if it primarily targets 'Likelihood' or 'Impact'.`;
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

    return (<div className="flex-grow overflow-y-auto -mr-4 pr-4 space-y-6"><div className="grid grid-cols-2 gap-4"><div><Label>Risk Code</Label><Input value={codePreview} readOnly={!!codeLocked} className={codeLocked ? "bg-gray-100" : ""} /></div><div><Label>Status</Label><Select value={form.status} onValueChange={v => setField('status', v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Open", "In Progress", "Closed"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div className="col-span-2"><Label>Title</Label><Input value={form.risk_title} onChange={e => setField('risk_title', e.target.value)} /></div><div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.risk_description} onChange={e => setField('risk_description', e.target.value)} /></div><div><Label>Division</Label><Select value={form.division} onValueChange={v => setField('division', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.divisions.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Department</Label><Select value={form.department} onValueChange={v => setField('department', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.departments.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Category</Label><Select value={form.category} onValueChange={v => setField('category', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.categories.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Owner</Label><Input value={form.owner} onChange={e => setField('owner', e.target.value)} /></div></div><div className="space-y-2"><h3 className="font-semibold text-gray-800">Inherent Risk</h3><div className="grid grid-cols-2 gap-4"><div><Label>Likelihood (Inherent)</Label><Select value={String(form.likelihood_inherent)} onValueChange={v => setField('likelihood_inherent', Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.likelihoodLabels.map((label, index) => <SelectItem key={index + 1} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Impact (Inherent)</Label><Select value={String(form.impact_inherent)} onValueChange={v => setField('impact_inherent', Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.impactLabels.map((label, index) => <SelectItem key={index + 1} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent></Select></div></div></div><div className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-semibold text-gray-800">Controls</h3><div className="flex gap-2"><Button onClick={handleSuggestControls} size="sm" variant="outline" disabled={isSuggesting}><Sparkles className="mr-2 h-4 w-4"/>{isSuggesting ? 'Thinking...' : 'Suggest Controls'}</Button><Button onClick={addControl} size="sm" variant="outline"><Plus className="mr-2 h-4 w-4" />Add Control</Button></div></div>{form.controls.map((control, index) => (<div key={control.id} className="border rounded-lg p-4 space-y-4 bg-gray-50"><div className="flex justify-between items-start"><div className="flex-grow space-y-2"><Label>Control #{index + 1} Description</Label><Textarea placeholder="e.g., Daily reconciliation process" value={control.description} onChange={e => updateControl(control.id, { description: e.target.value })} /></div><Button variant="ghost" size="sm" className="ml-4" onClick={() => removeControl(control.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div><div><Label>Target</Label><Select value={control.target} onValueChange={(v: "Likelihood" | "Impact") => updateControl(control.id, { target: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Likelihood">Likelihood</SelectItem><SelectItem value="Impact">Impact</SelectItem></SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div><Label>D (Design)</Label><Select value={String(control.design)} onValueChange={v => updateControl(control.id, { design: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_DESIGN_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>I (Implementation)</Label><Select value={String(control.implementation)} onValueChange={v => updateControl(control.id, { implementation: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_IMPLEMENTATION_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>M (Monitoring)</Label><Select value={String(control.monitoring)} onValueChange={v => updateControl(control.id, { monitoring: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_MONITORING_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div><div><Label>E (Evaluation)</Label><Select value={String(control.effectiveness_evaluation)} onValueChange={v => updateControl(control.id, { effectiveness_evaluation: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTROL_EFFECTIVENESS_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div></div></div>))}{form.controls.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No controls added. Residual risk will equal inherent risk.</p>}</div><div className="space-y-2"><h3 className="font-semibold text-gray-800">Residual Risk (Calculated)</h3><div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50"><div><Label>Likelihood (Residual)</Label><Input readOnly value={`${residualRisk.likelihood.toFixed(2)} (${config.likelihoodLabels[Math.round(residualRisk.likelihood)-1] || 'N/A'})`} className="bg-white font-mono" /></div><div><Label>Impact (Residual)</Label><Input readOnly value={`${residualRisk.impact.toFixed(2)} (${config.impactLabels[Math.round(residualRisk.impact)-1] || 'N/A'})`} className="bg-white font-mono" /></div></div></div></div>); 
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

        try {
            const apiPrompt = `Based on the following description of a project/process: "${prompt}". Identify potential risks. For each risk, provide a concise title and a brief one-sentence description.`;
            const schema = {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        risk_title: { type: "STRING" },
                        risk_description: { type: "STRING" },
                    },
                    required: ["risk_title", "risk_description"]
                }
            };
            const result = await callGeminiAPI(apiPrompt, schema) as AISuggestedRisk[];
            if (result && result.length > 0) {
                setSuggestions(result);
            } else {
                setError("The AI could not identify any risks for the given description.");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while communicating with the AI. Please try again.");
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

