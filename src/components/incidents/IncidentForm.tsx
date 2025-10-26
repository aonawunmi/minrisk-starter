// src/components/incidents/IncidentForm.tsx
// Form for creating/editing incidents

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Save, X } from 'lucide-react';
import { createIncident, updateIncident, type Incident, type IncidentType, type IncidentStatus } from '@/lib/incidents';
import { loadConfig, type AppConfig } from '@/lib/database';

// =====================================================
// TYPES
// =====================================================

type IncidentFormProps = {
  incident?: Incident; // If editing existing incident
  onSaved: () => void;
  onCancel: () => void;
};

type FormData = {
  title: string;
  description: string;
  incident_date: string;
  reported_by: string;
  reporter_email: string;
  division: string;
  department: string;
  incident_type: IncidentType;
  severity: number;
  financial_impact: string;
  impact_description: string;
  status: IncidentStatus;
  root_cause: string;
  corrective_actions: string;
};

type ValidationErrors = Partial<Record<keyof FormData, string>>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const incidentTypes: IncidentType[] = ['Loss Event', 'Near Miss', 'Control Failure', 'Breach', 'Other'];
const incidentStatuses: IncidentStatus[] = ['Reported', 'Under Investigation', 'Resolved', 'Closed'];
const severityLevels = [
  { value: 5, label: 'Critical (5)', color: 'text-red-600' },
  { value: 4, label: 'High (4)', color: 'text-orange-600' },
  { value: 3, label: 'Medium (3)', color: 'text-yellow-600' },
  { value: 2, label: 'Low (2)', color: 'text-blue-600' },
  { value: 1, label: 'Minimal (1)', color: 'text-green-600' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export function IncidentForm({ incident, onSaved, onCancel }: IncidentFormProps) {
  const isEditing = !!incident;

  // State
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Get current user email
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const loadUserAndConfig = async () => {
      // Load config for divisions/departments
      const configData = await loadConfig();
      if (configData) {
        setConfig(configData);
      }

      // Get current user email
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    };

    loadUserAndConfig();
  }, []);

  // Form data with defaults
  const [formData, setFormData] = useState<FormData>({
    title: incident?.title || '',
    description: incident?.description || '',
    incident_date: incident?.incident_date ? new Date(incident.incident_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    reported_by: incident?.reported_by || currentUserEmail || '',
    reporter_email: incident?.reporter_email || currentUserEmail || '',
    division: incident?.division || '',
    department: incident?.department || '',
    incident_type: incident?.incident_type || 'Other',
    severity: incident?.severity || 3,
    financial_impact: incident?.financial_impact ? incident.financial_impact.toString() : '',
    impact_description: incident?.impact_description || '',
    status: incident?.status || 'Reported',
    root_cause: incident?.root_cause || '',
    corrective_actions: incident?.corrective_actions || '',
  });

  // Update reported_by when currentUserEmail loads
  useEffect(() => {
    if (currentUserEmail && !isEditing) {
      setFormData(prev => ({
        ...prev,
        reported_by: prev.reported_by || currentUserEmail,
        reporter_email: prev.reporter_email || currentUserEmail,
      }));
    }
  }, [currentUserEmail, isEditing]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.incident_date) {
      newErrors.incident_date = 'Incident date is required';
    }

    if (!formData.reported_by.trim()) {
      newErrors.reported_by = 'Reporter name is required';
    }

    if (!formData.incident_type) {
      newErrors.incident_type = 'Incident type is required';
    }

    if (formData.financial_impact && isNaN(parseFloat(formData.financial_impact))) {
      newErrors.financial_impact = 'Must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const incidentData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        incident_date: new Date(formData.incident_date).toISOString(),
        reported_by: formData.reported_by.trim(),
        reporter_email: formData.reporter_email.trim() || undefined,
        division: formData.division || undefined,
        department: formData.department || undefined,
        incident_type: formData.incident_type,
        severity: formData.severity,
        financial_impact: formData.financial_impact ? parseFloat(formData.financial_impact) : undefined,
        impact_description: formData.impact_description.trim() || undefined,
        status: formData.status,
        root_cause: formData.root_cause.trim() || undefined,
        corrective_actions: formData.corrective_actions.trim() || undefined,
        linked_risk_codes: incident?.linked_risk_codes || [],
        ai_suggested_risks: incident?.ai_suggested_risks || [],
        ai_control_recommendations: incident?.ai_control_recommendations || {},
        manual_risk_links: incident?.manual_risk_links || [],
      };

      if (isEditing && incident) {
        const { data, error } = await updateIncident(incident.id, incidentData);
        if (error) {
          console.error('Error updating incident:', error);
          alert('Failed to update incident. Please try again.');
          return;
        }
      } else {
        const { data, error } = await createIncident(incidentData);
        if (error) {
          console.error('Error creating incident:', error);
          alert('Failed to create incident. Please try again.');
          return;
        }
      }

      onSaved();
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle field change
  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Incident' : 'Report New Incident'}
        </h3>
        {isEditing && incident && (
          <span className="text-sm text-gray-500">Code: {incident.incident_code}</span>
        )}
      </div>

      {/* Form Fields */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Title */}
        <div>
          <Label htmlFor="title" className="required">Incident Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Brief description of the incident"
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="required">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Detailed description of what happened, when, where, and who was involved"
            rows={4}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Row: Date and Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incident_date" className="required">Incident Date</Label>
            <Input
              id="incident_date"
              type="date"
              value={formData.incident_date}
              onChange={e => handleChange('incident_date', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={errors.incident_date ? 'border-red-500' : ''}
            />
            {errors.incident_date && (
              <p className="text-sm text-red-600 mt-1">{errors.incident_date}</p>
            )}
          </div>

          <div>
            <Label htmlFor="severity" className="required">Severity Level</Label>
            <Select value={formData.severity.toString()} onValueChange={v => handleChange('severity', parseInt(v))}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map(level => (
                  <SelectItem key={level.value} value={level.value.toString()}>
                    <span className={level.color}>{level.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row: Type and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incident_type" className="required">Incident Type</Label>
            <Select value={formData.incident_type} onValueChange={v => handleChange('incident_type', v)}>
              <SelectTrigger id="incident_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {incidentStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row: Division and Department */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="division">Division</Label>
            <Select value={formData.division} onValueChange={v => handleChange('division', v)}>
              <SelectTrigger id="division">
                <SelectValue placeholder="Select division..." />
              </SelectTrigger>
              <SelectContent>
                {config.divisions.map(div => (
                  <SelectItem key={div} value={div}>{div}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={formData.department} onValueChange={v => handleChange('department', v)}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {config.departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row: Reporter Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reported_by" className="required">Reported By</Label>
            <Input
              id="reported_by"
              value={formData.reported_by}
              onChange={e => handleChange('reported_by', e.target.value)}
              placeholder="Your name"
              className={errors.reported_by ? 'border-red-500' : ''}
            />
            {errors.reported_by && (
              <p className="text-sm text-red-600 mt-1">{errors.reported_by}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reporter_email">Reporter Email</Label>
            <Input
              id="reporter_email"
              type="email"
              value={formData.reporter_email}
              onChange={e => handleChange('reporter_email', e.target.value)}
              placeholder="your.email@company.com"
            />
          </div>
        </div>

        {/* Financial Impact */}
        <div>
          <Label htmlFor="financial_impact">Financial Impact (NGN)</Label>
          <Input
            id="financial_impact"
            type="number"
            step="0.01"
            value={formData.financial_impact}
            onChange={e => handleChange('financial_impact', e.target.value)}
            placeholder="0.00"
            className={errors.financial_impact ? 'border-red-500' : ''}
          />
          {errors.financial_impact && (
            <p className="text-sm text-red-600 mt-1">{errors.financial_impact}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Leave blank if not applicable or unknown</p>
        </div>

        {/* Impact Description */}
        <div>
          <Label htmlFor="impact_description">Impact Description</Label>
          <Textarea
            id="impact_description"
            value={formData.impact_description}
            onChange={e => handleChange('impact_description', e.target.value)}
            placeholder="Describe the impact on operations, customers, reputation, etc."
            rows={3}
          />
        </div>

        {/* Divider */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Analysis & Resolution</h4>
        </div>

        {/* Root Cause */}
        <div>
          <Label htmlFor="root_cause">Root Cause Analysis</Label>
          <Textarea
            id="root_cause"
            value={formData.root_cause}
            onChange={e => handleChange('root_cause', e.target.value)}
            placeholder="What was the underlying cause of this incident?"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Can be filled in later during investigation</p>
        </div>

        {/* Corrective Actions */}
        <div>
          <Label htmlFor="corrective_actions">Corrective Actions</Label>
          <Textarea
            id="corrective_actions"
            value={formData.corrective_actions}
            onChange={e => handleChange('corrective_actions', e.target.value)}
            placeholder="What actions have been or will be taken to prevent recurrence?"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Can be filled in later when actions are identified</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-xs text-gray-500">
          <span className="text-red-500">*</span> Required fields
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Incident' : 'Create Incident'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
