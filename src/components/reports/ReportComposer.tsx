/**
 * Report Composer
 * Main UI for generating and editing report drafts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Save,
  Eye,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ReportDraft, ReportAudience, RegulatorType } from '../../types/report-types';
import { generateReportDraft, loadReportDraft, updateSectionNarrative, toggleSection, finalizeReport } from '../../lib/report-generator';
import { getOrganizationSettings, validateRegulatorForInstitution, logRegulatorOverride } from '../../lib/regulator-routing';
import { exportToWord } from '../../lib/export/word-export';
import { exportToPDF } from '../../lib/export/pdf-export';
import { ReportSectionEditor } from './ReportSectionEditor';

interface ReportComposerProps {
  organizationId: string;
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'edit' | 'view_only';
  reportId?: string;  // Optional: if provided, load existing report instead of showing form
  onReportGenerated?: (reportId: string) => void;  // Callback when new report is generated
}

export function ReportComposer({ organizationId, userId, userEmail, userRole, reportId, onReportGenerated }: ReportComposerProps) {
  const [audience, setAudience] = useState<ReportAudience>('board');
  const [period, setPeriod] = useState('');
  const [regulatorOverride, setRegulatorOverride] = useState<RegulatorType | undefined>();
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [orgSettings, setOrgSettings] = useState<any>(null);

  // Load org settings
  useEffect(() => {
    loadOrgSettings();
  }, [organizationId]);

  // Load existing report if reportId is provided
  useEffect(() => {
    if (reportId) {
      loadExistingReport(reportId);
    }
  }, [reportId]);

  async function loadOrgSettings() {
    console.log('🔍 ReportComposer: Loading org settings for:', organizationId);
    const settings = await getOrganizationSettings(organizationId);
    console.log('📋 ReportComposer: Loaded settings:', settings);
    setOrgSettings(settings);
  }

  async function loadExistingReport(id: string) {
    try {
      setGenerating(true);
      setError(null);
      const loadedDraft = await loadReportDraft(id);
      if (loadedDraft) {
        setDraft(loadedDraft);
        // Expand all sections by default
        setExpandedSections(new Set(loadedDraft.sections.map((s) => s.id)));
      } else {
        setError('Report not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setGenerating(false);
    }
  }

  // Generate new draft
  async function handleGenerateDraft() {
    if (!period) {
      setError('Please enter a reporting period (e.g., Q1 2025)');
      return;
    }

    if (!orgSettings) {
      setError('Organization settings not configured. Please set institution type first.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateReportDraft(
        organizationId,
        userId,
        userEmail,
        audience,
        period,
        regulatorOverride
      );

      if (result.success && result.draft) {
        setDraft(result.draft);
        if (result.existing) {
          setSuccess('Opened existing draft report created by another user. You can edit and collaborate on it.');
        } else {
          setSuccess('Report draft generated successfully!');
        }
        // Expand all sections by default
        setExpandedSections(new Set(result.draft.sections.map((s) => s.id)));
        // Notify parent component
        if (onReportGenerated && result.draft.id) {
          onReportGenerated(result.draft.id);
        }
      } else {
        setError(result.error || 'Failed to generate draft');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setGenerating(false);
    }
  }

  // Handle section narrative update
  async function handleNarrativeUpdate(sectionId: string, newNarrative: string) {
    if (!draft) return;

    setSaving(true);
    const result = await updateSectionNarrative(sectionId, newNarrative, userId, userEmail);
    setSaving(false);

    if (result.success) {
      // Update local state
      setDraft({
        ...draft,
        sections: draft.sections.map((s) =>
          s.id === sectionId
            ? { ...s, narrative: newNarrative, last_edited_by: userEmail, last_edited_at: new Date().toISOString() }
            : s
        ),
      });
      setSuccess('Section updated');
      setTimeout(() => setSuccess(null), 2000);
    } else {
      setError(result.error || 'Failed to update section');
    }
  }

  // Handle section toggle
  async function handleSectionToggle(sectionId: string, included: boolean) {
    if (!draft) return;

    const result = await toggleSection(sectionId, included, userId, userEmail);

    if (result.success) {
      setDraft({
        ...draft,
        sections: draft.sections.map((s) => (s.id === sectionId ? { ...s, included } : s)),
      });
    } else {
      setError(result.error || 'Failed to toggle section');
    }
  }

  // Finalize report
  async function handleFinalize() {
    if (!draft) return;

    if (!window.confirm('Are you sure you want to finalize this report? You will not be able to edit it after finalization.')) {
      return;
    }

    const result = await finalizeReport(draft.id, userId, userEmail);

    if (result.success) {
      setDraft({ ...draft, status: 'final', finalized_at: new Date().toISOString(), finalized_by: userId });
      setSuccess('Report finalized successfully!');
    } else {
      setError(result.error || 'Failed to finalize report');
    }
  }

  // Export handlers
  async function handleExportWord() {
    if (!draft) return;

    setExporting(true);
    try {
      await exportToWord(draft);
      setSuccess('Exported to Word successfully!');
    } catch (err: any) {
      setError('Failed to export to Word');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    if (!draft) return;

    setExporting(true);
    try {
      exportToPDF(draft);
      setSuccess('Exported to PDF successfully!');
    } catch (err: any) {
      setError('Failed to export to PDF');
    } finally {
      setExporting(false);
    }
  }

  // Toggle section expansion
  function toggleSectionExpansion(sectionId: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  }

  const isFinalized = draft?.status === 'final';

  return (
    <div className="space-y-6">
      {/* Report Setup Card */}
      {!draft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate New Report
            </CardTitle>
            <CardDescription>Create a new stakeholder-specific risk report with AI-generated narratives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audience Selection */}
            <div className="space-y-2">
              <Label htmlFor="audience">Report Audience</Label>
              <Select value={audience} onValueChange={(value) => setAudience(value as ReportAudience)}>
                <SelectTrigger id="audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulator">Regulator (CBN/SEC/PENCOM)</SelectItem>
                  <SelectItem value="board">Board Risk Committee (BRC)</SelectItem>
                  <SelectItem value="ceo">CEO/Executive Committee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Input */}
            <div className="space-y-2">
              <Label htmlFor="period">Reporting Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue placeholder="Select reporting period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                  <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                  <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                  <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                  <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                  <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                  <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                  <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                  <SelectItem value="FY 2025">FY 2025 (Full Year)</SelectItem>
                  <SelectItem value="FY 2024">FY 2024 (Full Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Regulator Override (if regulator audience) */}
            {audience === 'regulator' && orgSettings && (
              <div className="space-y-2">
                <Label>Default Regulator</Label>
                <div className="text-sm text-muted-foreground">
                  {orgSettings.default_regulator} (based on {orgSettings.institution_type} institution type)
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideDialog(true)}
                  className="mt-2"
                >
                  Override Regulator
                </Button>
              </div>
            )}

            {/* Error/Success Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {error.includes('Organization settings not configured') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadOrgSettings}
                      className="ml-2"
                    >
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">{success}</AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Button onClick={handleGenerateDraft} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Draft
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Draft Editor */}
      {draft && (
        <div className="space-y-4">
          {/* Draft Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {draft.audience.toUpperCase()} Report - {draft.period}
                  </CardTitle>
                  <CardDescription>
                    Status: {draft.status === 'draft' ? '📝 Draft' : '🔒 Final'} | Created:{' '}
                    {new Date(draft.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isFinalized && (
                    <Button variant="outline" size="sm" onClick={handleFinalize}>
                      <Lock className="mr-2 h-4 w-4" />
                      Finalize
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting}>
                    <Download className="mr-2 h-4 w-4" />
                    Word
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Sections List */}
          {draft.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <ReportSectionEditor
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                isReadOnly={isFinalized}
                onToggleExpand={() => toggleSectionExpansion(section.id)}
                onNarrativeUpdate={(narrative) => handleNarrativeUpdate(section.id, narrative)}
                onToggleIncluded={(included) => handleSectionToggle(section.id, included)}
              />
            ))}

          {/* Status Messages */}
          {(error || success) && (
            <div className="fixed bottom-4 right-4 w-96">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      )}

      {/* Regulator Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Default Regulator</DialogTitle>
            <DialogDescription>
              Change the regulatory report target. This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regulator-override">Regulator</Label>
              <Select value={regulatorOverride} onValueChange={(value) => setRegulatorOverride(value as RegulatorType)}>
                <SelectTrigger id="regulator-override">
                  <SelectValue placeholder="Select regulator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBN">CBN - Central Bank of Nigeria</SelectItem>
                  <SelectItem value="SEC">SEC - Securities and Exchange Commission</SelectItem>
                  <SelectItem value="PENCOM">PENCOM - National Pension Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason for Override (Required)</Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why you're overriding the default regulator..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (regulatorOverride && overrideReason.trim()) {
                  setShowOverrideDialog(false);
                } else {
                  alert('Please select a regulator and provide a reason');
                }
              }}
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
