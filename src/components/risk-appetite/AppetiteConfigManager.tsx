// src/components/risk-appetite/AppetiteConfigManager.tsx
// Admin UI for managing Risk Appetite configurations (Phase 5A)

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table } from '@/components/ui/table';
import { Plus, Edit, Trash2, Save, X, AlertCircle, TrendingUp, Shield } from 'lucide-react';
import {
  loadAppetiteConfigs,
  saveAppetiteConfig,
  updateAppetiteConfig,
  deleteAppetiteConfig,
  getDefaultAppetiteThresholds,
  type RiskAppetiteConfig,
} from '@/lib/risk-appetite';
import type { AppConfig } from '@/App';

type AppetiteConfigManagerProps = {
  config: AppConfig;
  showToast: (message: string, type?: 'success' | 'error') => void;
};

type FormData = {
  category: string;
  appetite_threshold: number;
  tolerance_min: number;
  tolerance_max: number;
  rationale: string;
  effective_from: string;
  effective_to?: string;
};

export default function AppetiteConfigManager({ config, showToast }: AppetiteConfigManagerProps) {
  const [configs, setConfigs] = useState<RiskAppetiteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RiskAppetiteConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({
    category: '',
    appetite_threshold: 15,
    tolerance_min: 12,
    tolerance_max: 18,
    rationale: '',
    effective_from: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load appetite configurations
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await loadAppetiteConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('Error loading appetite configs:', error);
      showToast('Failed to load appetite configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.appetite_threshold < 1 || formData.appetite_threshold > 30) {
      newErrors.appetite_threshold = 'Appetite threshold must be between 1 and 30';
    }

    if (formData.tolerance_min < 1) {
      newErrors.tolerance_min = 'Minimum tolerance must be at least 1';
    }

    if (formData.tolerance_max > 30) {
      newErrors.tolerance_max = 'Maximum tolerance cannot exceed 30';
    }

    if (formData.tolerance_min > formData.appetite_threshold) {
      newErrors.tolerance_min = 'Minimum tolerance cannot exceed appetite threshold';
    }

    if (formData.appetite_threshold > formData.tolerance_max) {
      newErrors.tolerance_max = 'Appetite threshold cannot exceed maximum tolerance';
    }

    if (!formData.effective_from) {
      newErrors.effective_from = 'Effective from date is required';
    }

    if (formData.effective_to && formData.effective_to <= formData.effective_from) {
      newErrors.effective_to = 'Effective to date must be after effective from date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingConfig) {
        // Update existing config
        await updateAppetiteConfig(editingConfig.id, formData);
        showToast('Appetite configuration updated successfully', 'success');
      } else {
        // Create new config
        await saveAppetiteConfig(formData);
        showToast('Appetite configuration created successfully', 'success');
      }

      setShowDialog(false);
      resetForm();
      loadConfigs();
    } catch (error) {
      console.error('Error saving appetite config:', error);
      showToast('Failed to save appetite configuration', 'error');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appetite configuration?')) {
      return;
    }

    try {
      await deleteAppetiteConfig(id);
      showToast('Appetite configuration deleted successfully', 'success');
      loadConfigs();
    } catch (error) {
      console.error('Error deleting appetite config:', error);
      showToast('Failed to delete appetite configuration', 'error');
    }
  };

  // Handle edit
  const handleEdit = (configItem: RiskAppetiteConfig) => {
    setEditingConfig(configItem);
    setFormData({
      category: configItem.category,
      appetite_threshold: configItem.appetite_threshold,
      tolerance_min: configItem.tolerance_min,
      tolerance_max: configItem.tolerance_max,
      rationale: configItem.rationale || '',
      effective_from: configItem.effective_from,
      effective_to: configItem.effective_to,
    });
    setShowDialog(true);
  };

  // Handle new config
  const handleNew = () => {
    resetForm();
    setEditingConfig(null);
    setShowDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      category: '',
      appetite_threshold: 15,
      tolerance_min: 12,
      tolerance_max: 18,
      rationale: '',
      effective_from: new Date().toISOString().split('T')[0],
    });
    setErrors({});
  };

  // Load default thresholds for a category
  const loadDefaults = () => {
    const defaults = getDefaultAppetiteThresholds();
    const categoryDefault = defaults[formData.category];

    if (categoryDefault) {
      setFormData({
        ...formData,
        appetite_threshold: categoryDefault.threshold,
        tolerance_min: categoryDefault.min,
        tolerance_max: categoryDefault.max,
        rationale: categoryDefault.rationale,
      });
      showToast('Default thresholds loaded', 'success');
    } else {
      showToast('No defaults available for this category', 'error');
    }
  };

  // Get status badge color
  const getStatusColor = (effectiveFrom: string, effectiveTo?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const from = effectiveFrom;
    const to = effectiveTo;

    if (today < from) {
      return 'bg-blue-100 text-blue-800';
    } else if (to && today > to) {
      return 'bg-gray-100 text-gray-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStatusText = (effectiveFrom: string, effectiveTo?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const from = effectiveFrom;
    const to = effectiveTo;

    if (today < from) {
      return 'Future';
    } else if (to && today > to) {
      return 'Expired';
    } else {
      return 'Active';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Risk Appetite Configuration
          </h2>
          <p className="text-gray-600 mt-1">
            Define risk appetite thresholds by category
          </p>
        </div>
        <Button onClick={handleNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Configuration
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Risk Appetite Framework:</strong> Set thresholds that define your organization's
              acceptable risk levels. Appetite is the target level, while tolerance defines the acceptable range.
              Risks exceeding tolerance require exception approval.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configurations</CardTitle>
          <CardDescription>
            {configs.length} configuration{configs.length !== 1 ? 's' : ''} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading configurations...</div>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No appetite configurations defined</p>
              <p className="text-sm">Click "New Configuration" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Appetite</th>
                    <th className="pb-2 font-medium">Tolerance Range</th>
                    <th className="pb-2 font-medium">Effective Period</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((configItem) => (
                    <tr key={configItem.id} className="border-b">
                      <td className="py-3 font-medium">{configItem.category}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {configItem.appetite_threshold}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-600">
                          {configItem.tolerance_min} - {configItem.tolerance_max}
                        </span>
                      </td>
                      <td className="py-3 text-sm">
                        <div>{configItem.effective_from}</div>
                        {configItem.effective_to && (
                          <div className="text-gray-500">to {configItem.effective_to}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(configItem.effective_from, configItem.effective_to)}`}>
                          {getStatusText(configItem.effective_from, configItem.effective_to)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(configItem)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(configItem.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Appetite Configuration' : 'New Appetite Configuration'}
            </DialogTitle>
            <DialogDescription>
              Define the risk appetite threshold and tolerance range for a category
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <Label htmlFor="category">Risk Category</Label>
              <div className="flex gap-2">
                <select
                  id="category"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={!!editingConfig}
                >
                  <option value="">Select a category...</option>
                  {config.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadDefaults}
                  disabled={!formData.category}
                >
                  Load Defaults
                </Button>
              </div>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tolerance_min">Minimum Tolerance</Label>
                <Input
                  id="tolerance_min"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.tolerance_min}
                  onChange={(e) => setFormData({ ...formData, tolerance_min: parseInt(e.target.value) })}
                />
                {errors.tolerance_min && (
                  <p className="text-sm text-red-600 mt-1">{errors.tolerance_min}</p>
                )}
              </div>

              <div>
                <Label htmlFor="appetite_threshold">Appetite Threshold</Label>
                <Input
                  id="appetite_threshold"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.appetite_threshold}
                  onChange={(e) => setFormData({ ...formData, appetite_threshold: parseInt(e.target.value) })}
                />
                {errors.appetite_threshold && (
                  <p className="text-sm text-red-600 mt-1">{errors.appetite_threshold}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tolerance_max">Maximum Tolerance</Label>
                <Input
                  id="tolerance_max"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.tolerance_max}
                  onChange={(e) => setFormData({ ...formData, tolerance_max: parseInt(e.target.value) })}
                />
                {errors.tolerance_max && (
                  <p className="text-sm text-red-600 mt-1">{errors.tolerance_max}</p>
                )}
              </div>
            </div>

            {/* Visual threshold indicator */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Visual Guide:</div>
              <div className="h-8 flex items-center">
                <div className="flex-1 h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded relative">
                  <div
                    className="absolute h-full w-0.5 bg-blue-600"
                    style={{ left: `${(formData.tolerance_min / 30) * 100}%` }}
                  >
                    <span className="absolute -top-6 -left-2 text-xs text-blue-600">Min</span>
                  </div>
                  <div
                    className="absolute h-full w-0.5 bg-orange-600"
                    style={{ left: `${(formData.appetite_threshold / 30) * 100}%` }}
                  >
                    <span className="absolute -bottom-6 -left-4 text-xs text-orange-600">Appetite</span>
                  </div>
                  <div
                    className="absolute h-full w-0.5 bg-blue-600"
                    style={{ left: `${(formData.tolerance_max / 30) * 100}%` }}
                  >
                    <span className="absolute -top-6 -left-2 text-xs text-blue-600">Max</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div>
              <Label htmlFor="rationale">Rationale</Label>
              <Textarea
                id="rationale"
                placeholder="Explain why these thresholds are appropriate for this risk category..."
                value={formData.rationale}
                onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                rows={3}
              />
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_from">Effective From</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
                {errors.effective_from && (
                  <p className="text-sm text-red-600 mt-1">{errors.effective_from}</p>
                )}
              </div>

              <div>
                <Label htmlFor="effective_to">Effective To (Optional)</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to || ''}
                  onChange={(e) => setFormData({ ...formData, effective_to: e.target.value || undefined })}
                />
                {errors.effective_to && (
                  <p className="text-sm text-red-600 mt-1">{errors.effective_to}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingConfig ? 'Update' : 'Create'} Configuration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
