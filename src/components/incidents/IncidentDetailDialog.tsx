// src/components/incidents/IncidentDetailDialog.tsx
// Detail view and edit dialog for incidents with risk linking

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  Sparkles,
  X,
  Search,
  Loader2,
  Plus,
  Trash2,
  Save,
  History,
} from 'lucide-react';
import { type Incident, linkIncidentToRisks, unlinkIncidentFromRisk, deleteIncident } from '@/lib/incidents';
import { loadRisks } from '@/lib/database';
import { type RiskRow } from '@/App';
import { suggestRisksForIncident, type IncidentRiskSuggestion, assessControlAdequacy, type ControlAdequacyAssessment } from '@/lib/ai';
import { IncidentForm } from './IncidentForm';
import { EnhancementPlanHistory } from './EnhancementPlanHistory';
import { EnhancementPlanReviewDialog } from './EnhancementPlanReviewDialog';
import { type ControlEnhancementPlan, saveEnhancementPlan, type CreateEnhancementPlanInput } from '@/lib/controlEnhancements';

// =====================================================
// TYPES
// =====================================================

type IncidentDetailDialogProps = {
  incident: Incident;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onRisksUpdate?: () => void;
  isAdmin?: boolean;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const getSeverityBadge = (severity: number) => {
  const colors = {
    5: 'bg-red-600 text-white',
    4: 'bg-orange-500 text-white',
    3: 'bg-yellow-400 text-gray-900',
    2: 'bg-blue-400 text-white',
    1: 'bg-green-400 text-white',
  };
  return colors[severity as keyof typeof colors] || 'bg-gray-400 text-white';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Reported': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'Under Investigation': return <Clock className="h-4 w-4 text-blue-600" />;
    case 'Resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'Closed': return <XCircle className="h-4 w-4 text-gray-600" />;
    default: return null;
  }
};

const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return 'Not specified';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function IncidentDetailDialog({ incident, open, onClose, onUpdate, onRisksUpdate, isAdmin = false }: IncidentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Risk linking state
  const [allRisks, setAllRisks] = useState<RiskRow[]>([]);
  const [linkedRisks, setLinkedRisks] = useState<RiskRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkingRiskCode, setLinkingRiskCode] = useState<string | null>(null);

  // AI suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<IncidentRiskSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  // AI control assessment state
  const [controlAssessment, setControlAssessment] = useState<ControlAdequacyAssessment | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);

  // Enhancement plan state
  const [selectedPlan, setSelectedPlan] = useState<ControlEnhancementPlan | null>(null);
  const [showPlanReview, setShowPlanReview] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planHistoryKey, setPlanHistoryKey] = useState(0); // For refreshing history

  // Load risks
  useEffect(() => {
    loadAllRisks();
  }, []);

  // Update linked risks when incident changes
  useEffect(() => {
    if (allRisks.length > 0 && incident.linked_risk_codes) {
      const linked = allRisks.filter(r => incident.linked_risk_codes.includes(r.risk_code));
      setLinkedRisks(linked);
    }
  }, [allRisks, incident.linked_risk_codes]);

  const loadAllRisks = async () => {
    const risks = await loadRisks();
    if (risks && risks.length > 0) {
      setAllRisks(risks);
    }
  };

  // Handle delete incident
  const handleDelete = async () => {
    setIsDeleting(true);
    const { success, error } = await deleteIncident(incident.id);
    if (success) {
      onClose();
      onUpdate();
      if (onRisksUpdate) {
        onRisksUpdate(); // Refresh Risk Register to update incident counts
      }
    } else {
      alert('Failed to delete incident. Please try again.');
      console.error(error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle link risk
  const handleLinkRisk = async (riskCode: string) => {
    setLinkingRiskCode(riskCode);
    const { success, error } = await linkIncidentToRisks(incident.id, [riskCode]);
    if (success) {
      console.log('✅ Link successful, waiting 1 second for trigger to complete...');
      // Wait for database trigger to update incident counts
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🔄 Now refreshing data...');

      onUpdate(); // Refresh incidents
      if (onRisksUpdate) {
        onRisksUpdate(); // Refresh Risk Register
      }
    } else {
      alert('Failed to link risk. Please try again.');
      console.error(error);
    }
    setLinkingRiskCode(null);
  };

  // Handle unlink risk
  const handleUnlinkRisk = async (riskCode: string) => {
    setLinkingRiskCode(riskCode);
    const { success, error} = await unlinkIncidentFromRisk(incident.id, riskCode);
    if (success) {
      onUpdate(); // Refresh incidents
      if (onRisksUpdate) {
        onRisksUpdate(); // Refresh Risk Register
      }
    } else {
      alert('Failed to unlink risk. Please try again.');
      console.error(error);
    }
    setLinkingRiskCode(null);
  };

  // Get AI suggestions for risk linking
  const handleGetAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    setSelectedSuggestions(new Set()); // Clear previous selections
    try {
      const suggestions = await suggestRisksForIncident(
        {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incident_type,
          severity: incident.severity,
          impact_description: incident.impact_description,
          division: incident.division,
          department: incident.department,
        },
        allRisks.map(r => ({
          risk_code: r.risk_code,
          risk_title: r.risk_title,
          risk_description: r.risk_description,
          category: r.category,
          division: r.division,
          department: r.department,
        }))
      );
      setAiSuggestions(suggestions);
    } catch (error: any) {
      alert(`Failed to get AI suggestions: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Toggle suggestion selection
  const toggleSuggestionSelection = (riskCode: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(riskCode)) {
      newSelected.delete(riskCode);
    } else {
      newSelected.add(riskCode);
    }
    setSelectedSuggestions(newSelected);
  };

  // Link all selected suggestions
  const handleLinkSelectedSuggestions = async () => {
    if (selectedSuggestions.size === 0) return;

    setIsLinking(true);
    try {
      const riskCodesToLink = Array.from(selectedSuggestions);
      const { success, error } = await linkIncidentToRisks(incident.id, riskCodesToLink);

      if (success) {
        console.log('✅ Link successful, waiting 1 second for trigger to complete...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('🔄 Now refreshing data...');

        onUpdate(); // Refresh incidents
        if (onRisksUpdate) {
          onRisksUpdate(); // Refresh Risk Register
        }
        setSelectedSuggestions(new Set()); // Clear selections
      } else {
        alert('Failed to link risks. Please try again.');
        console.error(error);
      }
    } catch (error: any) {
      alert(`Failed to link risks: ${error.message}`);
      console.error(error);
    } finally {
      setIsLinking(false);
    }
  };

  // Get AI control adequacy assessment
  const handleGetControlAssessment = async () => {
    if (linkedRisks.length === 0) {
      alert('Please link at least one risk to this incident before assessing controls.');
      return;
    }

    setIsLoadingAssessment(true);
    try {
      const assessment = await assessControlAdequacy(
        {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incident_type,
          severity: incident.severity,
          impact_description: incident.impact_description,
          root_cause: incident.root_cause,
          corrective_actions: incident.corrective_actions,
        },
        linkedRisks.map(r => ({
          risk_code: r.risk_code,
          risk_title: r.risk_title,
          risk_description: r.risk_description,
          category: r.category,
          controls: r.controls,
        }))
      );
      setControlAssessment(assessment);
    } catch (error: any) {
      alert(`Failed to assess controls: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoadingAssessment(false);
    }
  };

  // Save assessment as enhancement plan
  const handleSaveAssessment = async () => {
    if (!controlAssessment) {
      alert('No assessment to save. Please run the control assessment first.');
      return;
    }

    setIsSavingPlan(true);
    try {
      // Map the assessment to enhancement plan format
      const planData: CreateEnhancementPlanInput = {
        incident_id: incident.id,
        overall_adequacy_score: controlAssessment.adequacy_score || 5,
        findings: controlAssessment.key_findings || [],
        recommendations: controlAssessment.control_improvements.map(imp => ({
          type: 'improvement' as const,
          description: imp.suggestion,
          priority: imp.priority?.toLowerCase() as 'high' | 'medium' | 'low' || 'medium',
          risk_code: imp.risk_code,
        })),
        linked_risks_snapshot: linkedRisks.map(risk => ({
          risk_code: risk.risk_code,
          risk_title: risk.risk_title,
          category: risk.category,
          likelihood_inherent: risk.likelihood_inherent,
          impact_inherent: risk.impact_inherent,
        })),
      };

      const { data, error } = await saveEnhancementPlan(planData);

      if (error || !data) {
        throw new Error(error || 'Failed to save plan');
      }

      alert('Assessment saved successfully! You can review it in the Enhancement Plans tab.');
      setPlanHistoryKey(prev => prev + 1); // Refresh history
      setActiveTab('plans'); // Switch to plans tab
    } catch (error: any) {
      alert(`Failed to save assessment: ${error.message}`);
      console.error(error);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Filter available risks (not already linked)
  const availableRisks = allRisks.filter(r => {
    const isNotLinked = !incident.linked_risk_codes.includes(r.risk_code);
    const matchesSearch = searchQuery === '' ||
      r.risk_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.risk_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase());
    return isNotLinked && matchesSearch;
  });

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={() => setIsEditing(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
          </DialogHeader>
          <IncidentForm
            incident={incident}
            onSaved={() => {
              setIsEditing(false);
              onUpdate();
            }}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle>{incident.title}</DialogTitle>
                <Badge className={getSeverityBadge(incident.severity)}>
                  Severity {incident.severity}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">Incident Code: {incident.incident_code}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {isAdmin && !showDeleteConfirm && (
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              {isAdmin && showDeleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Confirm delete?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="risks">
              Linked Risks ({linkedRisks.length})
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              Control Assessment
            </TabsTrigger>
            <TabsTrigger value="plans">
              <History className="h-4 w-4 mr-2" />
              Enhancement Plans
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4 space-y-6">
            {/* Status and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(incident.status)}
                  <span className="font-medium">{incident.status}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Incident Type</p>
                <Badge variant="outline">{incident.incident_type}</Badge>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                {incident.description}
              </p>
            </div>

            {/* Date and Reporter */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Incident Date
                </p>
                <p className="text-sm">{formatDate(incident.incident_date)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Reported By
                </p>
                <p className="text-sm">{incident.reported_by}</p>
                {incident.reporter_email && (
                  <p className="text-xs text-gray-500">{incident.reporter_email}</p>
                )}
              </div>
            </div>

            {/* Division and Department */}
            {(incident.division || incident.department) && (
              <div className="grid grid-cols-2 gap-4">
                {incident.division && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Division
                    </p>
                    <p className="text-sm">{incident.division}</p>
                  </div>
                )}
                {incident.department && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <p className="text-sm">{incident.department}</p>
                  </div>
                )}
              </div>
            )}

            {/* Financial Impact */}
            {incident.financial_impact && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Impact
                </p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(incident.financial_impact)}
                </p>
              </div>
            )}

            {/* Impact Description */}
            {incident.impact_description && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Impact Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {incident.impact_description}
                </p>
              </div>
            )}

            {/* Root Cause */}
            {incident.root_cause && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Root Cause Analysis</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {incident.root_cause}
                </p>
              </div>
            )}

            {/* Corrective Actions */}
            {incident.corrective_actions && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Corrective Actions</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {incident.corrective_actions}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
              <p>Created: {formatDate(incident.created_at)}</p>
              <p>Last Updated: {formatDate(incident.updated_at)}</p>
              {incident.resolved_at && <p>Resolved: {formatDate(incident.resolved_at)}</p>}
              {incident.closed_at && <p>Closed: {formatDate(incident.closed_at)}</p>}
            </div>
          </TabsContent>

          {/* Linked Risks Tab */}
          <TabsContent value="risks" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Currently Linked Risks */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Linked Risks ({linkedRisks.length})
              </h4>
              {linkedRisks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <LinkIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No risks linked to this incident yet</p>
                  <p className="text-xs">Link risks below to track the relationship</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedRisks.map(risk => (
                    <div key={risk.risk_code} className="flex items-start justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">[{risk.risk_code}] {risk.risk_title}</p>
                        {risk.risk_description && (
                          <p className="text-xs text-gray-700 mt-1 line-clamp-2">{risk.risk_description}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{risk.category} • {risk.department}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkRisk(risk.risk_code)}
                        disabled={linkingRiskCode === risk.risk_code}
                        className="flex-shrink-0"
                      >
                        {linkingRiskCode === risk.risk_code ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Suggestions Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Risk Suggestions
                </h4>
                <div className="flex gap-2">
                  {aiSuggestions.length > 0 && selectedSuggestions.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleLinkSelectedSuggestions}
                      disabled={isLinking}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4" />
                          Link Selected ({selectedSuggestions.size})
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetAISuggestions}
                    disabled={isLoadingSuggestions || allRisks.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isLoadingSuggestions ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Get Suggestions
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {aiSuggestions.map(suggestion => {
                    const isAlreadyLinked = incident.linked_risk_codes.includes(suggestion.risk_code);
                    const isSelected = selectedSuggestions.has(suggestion.risk_code);
                    return (
                      <div
                        key={suggestion.risk_code}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isAlreadyLinked
                            ? 'bg-gray-100 border-gray-300'
                            : isSelected
                            ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-400 shadow-sm'
                            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:border-purple-300'
                        }`}
                        onClick={() => !isAlreadyLinked && toggleSuggestionSelection(suggestion.risk_code)}
                      >
                        <div className="flex items-start gap-3">
                          {!isAlreadyLinked && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSuggestionSelection(suggestion.risk_code)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">
                                [{suggestion.risk_code}] {suggestion.risk_title}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  suggestion.confidence >= 0.9
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : suggestion.confidence >= 0.75
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                }`}
                              >
                                {Math.round(suggestion.confidence * 100)}% match
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-700 mb-2">{suggestion.reasoning}</p>
                          </div>
                          {isAlreadyLinked && (
                            <Badge variant="outline" className="bg-gray-200 text-gray-600 flex-shrink-0">
                              Already Linked
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {aiSuggestions.length === 0 && !isLoadingSuggestions && (
                <p className="text-xs text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  Click "Get Suggestions" to use AI to analyze this incident and recommend which risks should be linked.
                </p>
              )}
            </div>

            {/* Add Risk Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Or Search Manually</h4>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search risks by code, title, or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Available Risks */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableRisks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {searchQuery ? 'No risks match your search' : 'All risks are already linked'}
                  </p>
                ) : (
                  availableRisks.map(risk => (
                    <div key={risk.risk_code} className="flex items-start justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">[{risk.risk_code}] {risk.risk_title}</p>
                        {risk.risk_description && (
                          <p className="text-xs text-gray-700 mt-1 line-clamp-2">{risk.risk_description}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{risk.category} • {risk.department}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLinkRisk(risk.risk_code)}
                        disabled={linkingRiskCode === risk.risk_code}
                        className="flex-shrink-0"
                      >
                        {linkingRiskCode === risk.risk_code ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Assessment Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Control Adequacy Assessment
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  Analyze if existing controls were adequate to prevent this incident
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetControlAssessment}
                  disabled={isLoadingAssessment || linkedRisks.length === 0}
                  className="flex items-center gap-2"
                >
                  {isLoadingAssessment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Assess Controls
                    </>
                  )}
                </Button>
                {controlAssessment && (
                  <Button
                    size="sm"
                    onClick={handleSaveAssessment}
                    disabled={isSavingPlan}
                    className="flex items-center gap-2"
                  >
                    {isSavingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Assessment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {linkedRisks.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <LinkIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No risks linked yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Link risks to this incident first to assess control adequacy
                </p>
              </div>
            )}

            {controlAssessment && (
              <div className="space-y-4">
                {/* Overall Assessment */}
                <div className={`p-4 rounded-lg border-2 ${
                  controlAssessment.adequacy_level === 'Adequate'
                    ? 'bg-green-50 border-green-300'
                    : controlAssessment.adequacy_level === 'Inadequate'
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-gray-900">Overall Assessment</h5>
                    <div className="flex gap-2">
                      <Badge className={
                        controlAssessment.adequacy_level === 'Adequate'
                          ? 'bg-green-600'
                          : controlAssessment.adequacy_level === 'Inadequate'
                          ? 'bg-red-600'
                          : 'bg-yellow-600'
                      }>
                        {controlAssessment.adequacy_level}
                      </Badge>
                      <Badge variant="outline" className={
                        controlAssessment.priority === 'High'
                          ? 'border-red-500 text-red-700'
                          : controlAssessment.priority === 'Medium'
                          ? 'border-yellow-500 text-yellow-700'
                          : 'border-blue-500 text-blue-700'
                      }>
                        {controlAssessment.priority} Priority
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{controlAssessment.overall_reasoning}</p>
                </div>

                {/* Control Improvements */}
                {controlAssessment.control_improvements.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Recommended Control Improvements ({controlAssessment.control_improvements.length})
                    </h5>
                    <div className="space-y-3">
                      {controlAssessment.control_improvements.map((improvement, idx) => (
                        <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                [{improvement.risk_code}] {improvement.risk_title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{improvement.control_description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {improvement.dimension}
                            </Badge>
                            <div className="text-xs text-gray-600 flex items-center gap-2">
                              <span className="text-red-600 font-medium">Current: {improvement.current_score}</span>
                              <span>→</span>
                              <span className="text-green-600 font-medium">Suggested: {improvement.suggested_score}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mt-2 italic">{improvement.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Control Suggestions */}
                {controlAssessment.new_control_suggestions.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      New Control Recommendations ({controlAssessment.new_control_suggestions.length})
                    </h5>
                    <div className="space-y-3">
                      {controlAssessment.new_control_suggestions.map((suggestion, idx) => (
                        <div key={idx} className="p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                [{suggestion.risk_code}] {suggestion.risk_title}
                              </p>
                              <p className="text-sm text-gray-800 mt-1">{suggestion.control_description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-white">
                              {suggestion.control_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white">
                              Targets: {suggestion.target}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700 mt-2 italic">{suggestion.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!controlAssessment && linkedRisks.length > 0 && !isLoadingAssessment && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Sparkles className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Ready to assess controls</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Assess Controls" to analyze if existing controls were adequate
                </p>
              </div>
            )}
          </TabsContent>

          {/* Enhancement Plans Tab */}
          <TabsContent value="plans" className="flex-1 overflow-y-auto mt-4">
            <EnhancementPlanHistory
              key={planHistoryKey}
              incidentId={incident.id}
              onSelectPlan={plan => {
                setSelectedPlan(plan);
                setShowPlanReview(true);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Enhancement Plan Review Dialog */}
        <EnhancementPlanReviewDialog
          plan={selectedPlan}
          open={showPlanReview}
          onClose={() => {
            setShowPlanReview(false);
            setSelectedPlan(null);
          }}
          onUpdate={() => {
            setPlanHistoryKey(prev => prev + 1); // Refresh history
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
