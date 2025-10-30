// src/components/KRIManagement.tsx
// KRI Management - CRUD operations for KRI definitions

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Link as LinkIcon, Unlink, Sparkles, AlertCircle } from 'lucide-react';
import { loadKRIDefinitions, createKRIDefinition, updateKRIDefinition, deleteKRIDefinition, generateNextKRICode, suggestRisksForKRI, linkKRIToRisk, unlinkKRIFromRisk, type KRIDefinition, type RiskSuggestion } from '@/lib/kri';
import { loadRisks, type RiskRow } from '@/lib/database';

type KRIManagementProps = {
  canEdit: boolean;
};

export function KRIManagement({ canEdit }: KRIManagementProps) {
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingKRI, setEditingKRI] = useState<KRIDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  // AI Risk Linking state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingKRI, setLinkingKRI] = useState<KRIDefinition | null>(null);
  const [aiSuggestions, setAISuggestions] = useState<RiskSuggestion[]>([]);
  const [analyzingRisks, setAnalyzingRisks] = useState(false);
  const [linkingRiskCode, setLinkingRiskCode] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    kri_code: '',
    kri_name: '',
    description: '',
    category: '',
    linked_risk_code: '',
    indicator_type: 'lagging' as 'leading' | 'lagging' | 'concurrent',
    measurement_unit: '',
    data_source: '',
    collection_frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually',
    responsible_user: '',
    target_value: '',
    lower_threshold: '',
    upper_threshold: '',
    threshold_direction: 'above' as 'above' | 'below' | 'between',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kriData, riskData] = await Promise.all([
        loadKRIDefinitions(),
        loadRisks()
      ]);
      setKris(kriData);
      setRisks(riskData);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    const nextCode = await generateNextKRICode();
    setFormData({
      kri_code: nextCode,
      kri_name: '',
      description: '',
      category: '',
      linked_risk_code: '',
      indicator_type: 'lagging',
      measurement_unit: '',
      data_source: '',
      collection_frequency: 'monthly',
      responsible_user: '',
      target_value: '',
      lower_threshold: '',
      upper_threshold: '',
      threshold_direction: 'above',
    });
    setEditingKRI(null);
    setShowDialog(true);
  };

  const handleEdit = (kri: KRIDefinition) => {
    setFormData({
      kri_code: kri.kri_code,
      kri_name: kri.kri_name,
      description: kri.description || '',
      category: kri.category || '',
      linked_risk_code: kri.linked_risk_code || '',
      indicator_type: kri.indicator_type,
      measurement_unit: kri.measurement_unit,
      data_source: kri.data_source || '',
      collection_frequency: kri.collection_frequency,
      responsible_user: kri.responsible_user || '',
      target_value: kri.target_value?.toString() || '',
      lower_threshold: kri.lower_threshold?.toString() || '',
      upper_threshold: kri.upper_threshold?.toString() || '',
      threshold_direction: kri.threshold_direction,
    });
    setEditingKRI(kri);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.kri_name || !formData.measurement_unit) {
      alert('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const data = {
        kri_code: formData.kri_code,
        kri_name: formData.kri_name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        linked_risk_code: formData.linked_risk_code || undefined,
        indicator_type: formData.indicator_type,
        measurement_unit: formData.measurement_unit,
        data_source: formData.data_source || undefined,
        collection_frequency: formData.collection_frequency,
        responsible_user: formData.responsible_user || undefined,
        target_value: formData.target_value ? parseFloat(formData.target_value) : undefined,
        lower_threshold: formData.lower_threshold ? parseFloat(formData.lower_threshold) : undefined,
        upper_threshold: formData.upper_threshold ? parseFloat(formData.upper_threshold) : undefined,
        threshold_direction: formData.threshold_direction,
        enabled: true,
      };

      if (editingKRI) {
        await updateKRIDefinition(editingKRI.id, data);
      } else {
        await createKRIDefinition(data);
      }

      await loadData();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving KRI:', error);
      alert('Failed to save KRI');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kri: KRIDefinition) => {
    if (!confirm(`Are you sure you want to delete KRI "${kri.kri_name}"?`)) {
      return;
    }

    try {
      await deleteKRIDefinition(kri.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting KRI:', error);
      alert('Failed to delete KRI');
    }
  };

  // AI Risk Linking handlers
  const handleLinkToRisk = async (kri: KRIDefinition) => {
    setLinkingKRI(kri);
    setShowLinkDialog(true);
    setAISuggestions([]);

    // Start AI analysis
    setAnalyzingRisks(true);
    try {
      const suggestions = await suggestRisksForKRI(kri);
      setAISuggestions(suggestions);
    } catch (error) {
      console.error('Error analyzing KRI for risk suggestions:', error);
      alert('Failed to analyze KRI for risk suggestions');
    } finally {
      setAnalyzingRisks(false);
    }
  };

  const handleConfirmLink = async (riskCode: string, confidence: number) => {
    if (!linkingKRI) return;

    setLinkingRiskCode(riskCode);
    try {
      await linkKRIToRisk(linkingKRI.id, riskCode, confidence);
      await loadData();
      setShowLinkDialog(false);
    } catch (error) {
      console.error('Error linking KRI to risk:', error);
      alert('Failed to link KRI to risk');
    } finally {
      setLinkingRiskCode(null);
    }
  };

  const handleUnlink = async (kri: KRIDefinition) => {
    if (!confirm(`Remove link between ${kri.kri_code} and its risk?`)) {
      return;
    }

    try {
      await unlinkKRIFromRisk(kri.id);
      await loadData();
    } catch (error) {
      console.error('Error unlinking KRI:', error);
      alert('Failed to unlink KRI');
    }
  };

  // Helper to get linked risk for a KRI
  const getLinkedRisk = (kri: KRIDefinition): RiskRow | undefined => {
    if (!kri.linked_risk_code) return undefined;
    return risks.find(r => r.risk_code === kri.linked_risk_code);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading KRIs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KRI Definitions</h2>
        {canEdit && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add KRI
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active KRIs ({kris.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {kris.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No KRIs defined</p>
              <p className="text-sm mt-2">Click "Add KRI" to create your first indicator</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kris.map((kri) => {
                const linkedRisk = risks.find(r => r.risk_code === kri.linked_risk_code);
                return (
                  <div key={kri.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{kri.kri_code} - {kri.kri_name}</div>
                      <div className="text-sm text-gray-600">{kri.description}</div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Category: {kri.category || 'N/A'}</span>
                        <span>Type: {kri.indicator_type}</span>
                        <span>Frequency: {kri.collection_frequency}</span>
                        <span>Unit: {kri.measurement_unit}</span>
                      </div>
                      {linkedRisk && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                            <LinkIcon className="h-3 w-3" />
                            Linked to: {linkedRisk.risk_code} - {linkedRisk.risk_title}
                          </span>
                          {kri.ai_link_confidence && (
                            <span className="text-gray-500">
                              ({kri.ai_link_confidence}% confidence)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {kri.linked_risk_code ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlink(kri)}
                            title="Unlink from risk"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLinkToRisk(kri)}
                            title="Link to risk with AI"
                          >
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(kri)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(kri)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKRI ? 'Edit KRI' : 'Create New KRI'}</DialogTitle>
            <DialogDescription>
              Define a Key Risk Indicator to track over time
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kri_code">KRI Code *</Label>
                <Input
                  id="kri_code"
                  value={formData.kri_code}
                  onChange={(e) => setFormData({ ...formData, kri_code: e.target.value })}
                  disabled={!!editingKRI}
                />
              </div>
              <div>
                <Label htmlFor="kri_name">KRI Name *</Label>
                <Input
                  id="kri_name"
                  value={formData.kri_name}
                  onChange={(e) => setFormData({ ...formData, kri_name: e.target.value })}
                  placeholder="e.g., Customer Complaints Count"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this KRI measure?"
              />
            </div>

            {/* Classification */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Risk Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Operational, Financial"
                />
              </div>
              <div>
                <Label htmlFor="indicator_type">Indicator Type *</Label>
                <Select
                  value={formData.indicator_type}
                  onValueChange={(value: any) => setFormData({ ...formData, indicator_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leading">Leading</SelectItem>
                    <SelectItem value="lagging">Lagging</SelectItem>
                    <SelectItem value="concurrent">Concurrent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Measurement */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="measurement_unit">Measurement Unit *</Label>
                <Input
                  id="measurement_unit"
                  value={formData.measurement_unit}
                  onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
                  placeholder="e.g., count, %, days"
                />
              </div>
              <div>
                <Label htmlFor="collection_frequency">Collection Frequency *</Label>
                <Select
                  value={formData.collection_frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, collection_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="target_value">Target Value</Label>
                <Input
                  id="target_value"
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="Ideal value"
                />
              </div>
              <div>
                <Label htmlFor="lower_threshold">Lower Threshold</Label>
                <Input
                  id="lower_threshold"
                  type="number"
                  value={formData.lower_threshold}
                  onChange={(e) => setFormData({ ...formData, lower_threshold: e.target.value })}
                  placeholder="Warning level"
                />
              </div>
              <div>
                <Label htmlFor="upper_threshold">Upper Threshold</Label>
                <Input
                  id="upper_threshold"
                  type="number"
                  value={formData.upper_threshold}
                  onChange={(e) => setFormData({ ...formData, upper_threshold: e.target.value })}
                  placeholder="Critical level"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="threshold_direction">Threshold Direction</Label>
              <Select
                value={formData.threshold_direction}
                onValueChange={(value: any) => setFormData({ ...formData, threshold_direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above (higher is bad)</SelectItem>
                  <SelectItem value="below">Below (lower is bad)</SelectItem>
                  <SelectItem value="between">Between (outside range is bad)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingKRI ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Risk Linking Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Powered Risk Linking
            </DialogTitle>
            <DialogDescription>
              AI analyzed KRI "{linkingKRI?.kri_name}" against your Risk Register.
              Select a risk to link for integrated monitoring.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {analyzingRisks ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                <p className="text-sm text-gray-600">Analyzing KRI against risks...</p>
                <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm font-medium">No strong matches found</p>
                <p className="text-xs text-gray-500 mt-1">
                  AI couldn't find risks that strongly match this KRI. You can create a manual link later.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-900 font-medium">AI Recommendations</p>
                  <p className="text-xs text-purple-800 mt-1">
                    Top {aiSuggestions.length} risk{aiSuggestions.length > 1 ? 's' : ''} that this KRI can monitor effectively
                  </p>
                </div>

                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.risk.risk_code}
                      className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              #{index + 1} {suggestion.risk.risk_code}: {suggestion.risk.risk_title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                suggestion.confidence >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : suggestion.confidence >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {suggestion.confidence}% match
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {suggestion.risk.risk_description}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                        <p className="text-xs text-blue-900 font-medium mb-1">AI Reasoning:</p>
                        <p className="text-xs text-blue-800">{suggestion.reasoning}</p>
                      </div>

                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => handleConfirmLink(suggestion.risk.risk_code, suggestion.confidence)}
                        disabled={linkingRiskCode !== null}
                      >
                        {linkingRiskCode === suggestion.risk.risk_code && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Link to {suggestion.risk.risk_code}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)} disabled={linkingRiskCode !== null}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
