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
import { Plus, Pencil, Trash2, Loader2, Link as LinkIcon, Unlink, Sparkles, AlertCircle, X } from 'lucide-react';
import { loadKRIDefinitions, createKRIDefinition, updateKRIDefinition, deleteKRIDefinition, generateNextKRICode, suggestRisksForKRI, linkKRIToRisk, unlinkKRIFromRisk, getLinkedRisksForKRI, type KRIDefinition, type RiskSuggestion, type LinkedRisk } from '@/lib/kri';
import { loadRisks, type RiskRow } from '@/lib/database';
import { Badge } from '@/components/ui/badge';

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
  const [manualRiskCode, setManualRiskCode] = useState<string>('');
  const [linkedRisksMap, setLinkedRisksMap] = useState<Map<string, LinkedRisk[]>>(new Map());

  // Form state
  const [formData, setFormData] = useState({
    kri_code: '',
    kri_name: '',
    description: '',
    category: '',
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

      // Load linked risks for each KRI
      const linksMap = new Map<string, LinkedRisk[]>();
      for (const kri of kriData) {
        try {
          const linkedRisks = await getLinkedRisksForKRI(kri.id);
          if (linkedRisks.length > 0) {
            linksMap.set(kri.id, linkedRisks);
          }
        } catch (error) {
          console.error(`Failed to load linked risks for KRI ${kri.kri_code}:`, error);
        }
      }
      setLinkedRisksMap(linksMap);
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
    setManualRiskCode('');

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

  const handleConfirmLink = async (riskCode: string, confidence?: number) => {
    if (!linkingKRI) return;

    setLinkingRiskCode(riskCode);
    try {
      await linkKRIToRisk(linkingKRI.id, riskCode, confidence);

      // Reload linked risks for this KRI
      const linkedRisks = await getLinkedRisksForKRI(linkingKRI.id);
      setLinkedRisksMap(prev => new Map(prev).set(linkingKRI.id, linkedRisks));

      // Re-run AI analysis to get fresh suggestions (filtering out newly linked risk)
      setAnalyzingRisks(true);
      const suggestions = await suggestRisksForKRI(linkingKRI);
      setAISuggestions(suggestions);
      setAnalyzingRisks(false);

      // Clear manual selection
      setManualRiskCode('');

      // DON'T close dialog - allow linking to multiple risks
    } catch (error) {
      console.error('Error linking KRI to risk:', error);
      alert('Failed to link KRI to risk');
    } finally {
      setLinkingRiskCode(null);
    }
  };

  const handleManualLink = () => {
    if (!manualRiskCode) {
      alert('Please select a risk to link');
      return;
    }
    // Manual links have no AI confidence score
    handleConfirmLink(manualRiskCode, undefined);
  };

  const handleUnlink = async (kriId: string, riskCode: string, riskTitle: string) => {
    if (!confirm(`Remove link to ${riskCode} (${riskTitle})?`)) {
      return;
    }

    try {
      await unlinkKRIFromRisk(kriId, riskCode);

      // Reload linked risks for this KRI
      const linkedRisks = await getLinkedRisksForKRI(kriId);
      if (linkedRisks.length > 0) {
        setLinkedRisksMap(prev => new Map(prev).set(kriId, linkedRisks));
      } else {
        setLinkedRisksMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(kriId);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error unlinking KRI:', error);
      alert('Failed to unlink KRI');
    }
  };

  // Helper to get linked risks for a KRI
  const getLinkedRisks = (kri: KRIDefinition): LinkedRisk[] => {
    return linkedRisksMap.get(kri.id) || [];
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
                const linkedRisks = getLinkedRisks(kri);
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
                      {linkedRisks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {linkedRisks.map((linkedRisk) => (
                            <Badge
                              key={linkedRisk.risk_code}
                              variant="outline"
                              className="bg-blue-50 text-blue-800 border-blue-200 text-xs"
                            >
                              <LinkIcon className="h-3 w-3 mr-1 inline" />
                              {linkedRisk.risk_code}: {linkedRisk.risk_title}
                              {linkedRisk.ai_link_confidence && ` (${linkedRisk.ai_link_confidence}%)`}
                              {canEdit && (
                                <button
                                  onClick={() => handleUnlink(kri.id, linkedRisk.risk_code, linkedRisk.risk_title)}
                                  className="ml-1 hover:text-red-600"
                                  title="Unlink"
                                >
                                  <X className="h-3 w-3 inline" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkToRisk(kri)}
                          title="Link to more risks with AI"
                        >
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        </Button>
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
            {/* Currently Linked Risks */}
            {linkingKRI && getLinkedRisks(linkingKRI).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-900 font-medium mb-2">✅ Currently Linked Risks ({getLinkedRisks(linkingKRI).length})</p>
                <div className="flex flex-wrap gap-1">
                  {getLinkedRisks(linkingKRI).map((linkedRisk) => (
                    <Badge
                      key={linkedRisk.risk_code}
                      variant="outline"
                      className="bg-green-100 text-green-800 border-green-300 text-xs"
                    >
                      {linkedRisk.risk_code}: {linkedRisk.risk_title}
                      <button
                        onClick={() => handleUnlink(linkingKRI.id, linkedRisk.risk_code, linkedRisk.risk_title)}
                        className="ml-1 hover:text-red-600"
                        title="Unlink"
                      >
                        <X className="h-3 w-3 inline" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analyzingRisks ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                <p className="text-sm text-gray-600">Analyzing KRI against risks...</p>
                <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
              </div>
            ) : (
              // Show both AI suggestions and manual selection
              <>
                {aiSuggestions.length > 0 && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm text-purple-900 font-medium">🤖 AI Recommendations</p>
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

              {/* Manual Selection Section */}
              <div className="border-t pt-4 mt-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-900 font-medium">📝 Manual Selection</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Select any risk from your register if the AI suggestions don't match
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="manual-risk-select">Select Risk from Register</Label>
                    <Select value={manualRiskCode} onValueChange={setManualRiskCode}>
                      <SelectTrigger id="manual-risk-select">
                        <SelectValue placeholder="Choose a risk to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        {risks
                          .filter(risk => {
                            if (!linkingKRI) return true;
                            const linked = linkedRisksMap.get(linkingKRI.id) || [];
                            return !linked.some(lr => lr.risk_code === risk.risk_code);
                          })
                          .map((risk) => (
                            <SelectItem key={risk.risk_code} value={risk.risk_code}>
                              {risk.risk_code}: {risk.risk_title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {manualRiskCode && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs font-medium text-blue-900 mb-1">Selected Risk:</p>
                      <p className="text-sm text-blue-800">
                        {risks.find(r => r.risk_code === manualRiskCode)?.risk_title}
                      </p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleManualLink}
                    disabled={!manualRiskCode || linkingRiskCode !== null}
                  >
                    {linkingRiskCode === manualRiskCode && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Link to Selected Risk
                  </Button>
                </div>
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
