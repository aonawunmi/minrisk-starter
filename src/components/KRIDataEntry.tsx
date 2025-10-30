// src/components/KRIDataEntry.tsx
// KRI Data Entry - Record KRI measurements

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import {
  loadKRIDefinitions,
  loadKRIData,
  createKRIDataEntry,
  type KRIDefinition,
  type KRIDataEntry as KRIDataEntryType
} from '@/lib/kri';

export function KRIDataEntry() {
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [selectedKRI, setSelectedKRI] = useState<string>('');
  const [entries, setEntries] = useState<KRIDataEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    measurement_date: new Date().toISOString().split('T')[0],
    measurement_value: '',
    notes: '',
    data_quality: 'verified' as 'verified' | 'estimated' | 'provisional',
  });

  useEffect(() => {
    loadKRIDefinitions().then((data) => {
      setKris(data.filter(k => k.enabled));
      if (data.length > 0 && data[0].enabled) {
        setSelectedKRI(data[0].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedKRI) {
      loadKRIData(selectedKRI, 30).then(setEntries);
    }
  }, [selectedKRI]);

  const selectedKRIData = kris.find(k => k.id === selectedKRI);

  const handleAddEntry = () => {
    setFormData({
      measurement_date: new Date().toISOString().split('T')[0],
      measurement_value: '',
      notes: '',
      data_quality: 'verified',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedKRI || !formData.measurement_value) {
      alert('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      await createKRIDataEntry(selectedKRI, {
        measurement_date: formData.measurement_date,
        measurement_value: parseFloat(formData.measurement_value),
        notes: formData.notes || undefined,
        data_quality: formData.data_quality,
      });

      // Reload entries
      const updatedEntries = await loadKRIData(selectedKRI, 30);
      setEntries(updatedEntries);
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading KRIs...</div>;
  }

  if (kris.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No KRIs defined yet</p>
        <p className="text-sm mt-2">Create KRIs in the Management tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KRI Data Entry</h2>
      </div>

      {/* KRI Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select KRI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="kri-select">Key Risk Indicator</Label>
              <Select value={selectedKRI} onValueChange={setSelectedKRI}>
                <SelectTrigger id="kri-select">
                  <SelectValue placeholder="Select a KRI" />
                </SelectTrigger>
                <SelectContent>
                  {kris.map((kri) => (
                    <SelectItem key={kri.id} value={kri.id}>
                      {kri.kri_code} - {kri.kri_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddEntry} disabled={!selectedKRI}>
              <Plus className="mr-2 h-4 w-4" />
              Add Measurement
            </Button>
          </div>

          {selectedKRIData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Unit:</span> {selectedKRIData.measurement_unit}
                </div>
                <div>
                  <span className="font-medium">Frequency:</span> {selectedKRIData.collection_frequency}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {selectedKRIData.indicator_type}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedKRIData.risk_category || 'N/A'}
                </div>
              </div>
              {selectedKRIData.description && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedKRIData.description}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Measurements ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No measurements recorded yet</p>
              <p className="text-sm mt-2">Click "Add Measurement" to record the first value</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="font-medium text-lg">
                        {entry.measurement_value} {selectedKRIData?.measurement_unit}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(entry.measurement_date).toLocaleDateString()}
                      </div>
                      {entry.alert_status && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.alert_status === 'red' ? 'bg-red-100 text-red-800' :
                          entry.alert_status === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {entry.alert_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {entry.data_quality}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Measurement</DialogTitle>
            <DialogDescription>
              {selectedKRIData && `${selectedKRIData.kri_code} - ${selectedKRIData.kri_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="measurement_date">Measurement Date *</Label>
              <Input
                id="measurement_date"
                type="date"
                value={formData.measurement_date}
                onChange={(e) => setFormData({ ...formData, measurement_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="measurement_value">
                Measurement Value * ({selectedKRIData?.measurement_unit})
              </Label>
              <Input
                id="measurement_value"
                type="number"
                step="any"
                value={formData.measurement_value}
                onChange={(e) => setFormData({ ...formData, measurement_value: e.target.value })}
                placeholder="Enter the measured value"
              />
            </div>

            <div>
              <Label htmlFor="data_quality">Data Quality</Label>
              <Select
                value={formData.data_quality}
                onValueChange={(value: any) => setFormData({ ...formData, data_quality: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="estimated">Estimated</SelectItem>
                  <SelectItem value="provisional">Provisional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any context or observations about this measurement"
              />
            </div>

            {selectedKRIData && (selectedKRIData.lower_threshold || selectedKRIData.upper_threshold) && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="font-medium mb-1">Thresholds:</div>
                {selectedKRIData.target_value && (
                  <div>Target: {selectedKRIData.target_value}</div>
                )}
                {selectedKRIData.lower_threshold && (
                  <div>Lower: {selectedKRIData.lower_threshold}</div>
                )}
                {selectedKRIData.upper_threshold && (
                  <div>Upper: {selectedKRIData.upper_threshold}</div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Measurement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
