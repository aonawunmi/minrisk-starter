/**
 * Organization Settings Component
 * Configure institution type and default regulator
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Building2, Shield } from 'lucide-react';
import {
  getOrganizationSettings,
  saveOrganizationSettings,
  getDefaultRegulator,
  getInstitutionTypes,
  getRegulatorTypes,
  getRegulatorName,
} from '@/lib/regulator-routing';
import { InstitutionType, RegulatorType, OrganizationSettings as OrgSettings } from '@/types/report-types';

interface OrganizationSettingsProps {
  organizationId: string;
  organizationName: string;
  userEmail: string;
}

export function OrganizationSettings({ organizationId, organizationName, userEmail }: OrganizationSettingsProps) {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [orgName, setOrgName] = useState(organizationName);
  const [institutionType, setInstitutionType] = useState<InstitutionType>('Bank');
  const [defaultRegulator, setDefaultRegulator] = useState<RegulatorType>('CBN');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  // Auto-update default regulator when institution type changes
  useEffect(() => {
    const autoRegulator = getDefaultRegulator(institutionType);
    setDefaultRegulator(autoRegulator);
  }, [institutionType]);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const data = await getOrganizationSettings(organizationId);
      if (data) {
        setSettings(data);
        setOrgName(data.organization_name);
        setInstitutionType(data.institution_type);
        setDefaultRegulator(data.default_regulator);
      }
    } catch (err: any) {
      setError('Failed to load organization settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await saveOrganizationSettings({
        organization_id: organizationId,
        institution_type: institutionType,
        default_regulator: defaultRegulator,
        organization_name: orgName,
        updated_by: userEmail,
      });

      if (result.success) {
        setSuccess(true);
        await loadSettings();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError('An error occurred while saving');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Settings
        </CardTitle>
        <CardDescription>
          Configure your institution type and default regulatory reporting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organization Name */}
        <div className="space-y-2">
          <Label htmlFor="org-name" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization Name
          </Label>
          <Input
            id="org-name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g., FMDQ Securities Exchange"
          />
          <p className="text-sm text-muted-foreground">
            Your organization's official name for reports
          </p>
        </div>

        {/* Institution Type */}
        <div className="space-y-2">
          <Label htmlFor="institution-type" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Institution Type
          </Label>
          <Select value={institutionType} onValueChange={(value) => setInstitutionType(value as InstitutionType)}>
            <SelectTrigger id="institution-type">
              <SelectValue placeholder="Select institution type" />
            </SelectTrigger>
            <SelectContent>
              {getInstitutionTypes().map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Your organization's classification for regulatory purposes
          </p>
        </div>

        {/* Default Regulator */}
        <div className="space-y-2">
          <Label htmlFor="default-regulator" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Default Regulator
          </Label>
          <Select value={defaultRegulator} onValueChange={(value) => setDefaultRegulator(value as RegulatorType)}>
            <SelectTrigger id="default-regulator">
              <SelectValue placeholder="Select default regulator" />
            </SelectTrigger>
            <SelectContent>
              {getRegulatorTypes().map((reg) => (
                <SelectItem key={reg} value={reg}>
                  {reg} - {getRegulatorName(reg)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Automatically set to {getDefaultRegulator(institutionType)} for {institutionType} institutions
          </p>
        </div>

        {/* Mapping Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Regulatory Mapping:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Bank → CBN (Central Bank of Nigeria)</li>
              <li>• Capital Markets → SEC (Securities and Exchange Commission)</li>
              <li>• Pensions → PENCOM (National Pension Commission)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Current Settings (if exists) */}
        {settings && (
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium">Current Settings</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Institution:</span>
                <span className="ml-2 font-medium">{settings.institution_type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Regulator:</span>
                <span className="ml-2 font-medium">{settings.default_regulator}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2 font-medium">
                  {new Date(settings.updated_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Updated By:</span>
                <span className="ml-2 font-medium">{settings.updated_by}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Organization settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
