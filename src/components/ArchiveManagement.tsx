// src/components/ArchiveManagement.tsx
// Archive Management component for ADMIN

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Archive, Trash2, RefreshCw, AlertTriangle, Eye } from 'lucide-react';
import {
  loadArchivedRisks,
  loadArchivedControls,
  permanentDeleteArchivedRisk,
  type ArchivedRisk,
  type ArchivedControl,
} from '@/lib/archive';
import { supabase } from '@/lib/supabase';

export default function ArchiveManagement() {
  const [archivedRisks, setArchivedRisks] = useState<ArchivedRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<ArchivedRisk | null>(null);
  const [controls, setControls] = useState<ArchivedControl[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const risks = await loadArchivedRisks();
      setArchivedRisks(risks);

      // Load risk_history count
      const { data: history } = await supabase.from('risk_history').select('id');
      setHistoryCount(history?.length || 0);
    } catch (error) {
      console.error('Error loading archived risks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewDetails = async (risk: ArchivedRisk) => {
    setSelectedRisk(risk);
    const riskControls = await loadArchivedControls(risk.id);
    setControls(riskControls);
    setShowDetailsDialog(true);
  };

  const handleDeleteClick = (risk: ArchivedRisk) => {
    setSelectedRisk(risk);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteDialog(true);
  };

  const handlePermanentDelete = async () => {
    if (!selectedRisk) return;
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setDeleteError('User not authenticated');
        setDeleting(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (signInError) {
        setDeleteError('Invalid password');
        setDeleting(false);
        return;
      }

      // Password verified, proceed with deletion
      const result = await permanentDeleteArchivedRisk(selectedRisk.id);

      if (!result.success) {
        setDeleteError(result.error || 'Failed to delete archived risk');
        setDeleting(false);
        return;
      }

      // Success
      setShowDeleteDialog(false);
      setDeletePassword('');
      await loadData();
    } catch (error: any) {
      setDeleteError(error.message || 'An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteAllHistory = async () => {
    if (!confirm(`⚠️ ADMIN BULK DELETE - DELETE ALL COMMITTED PERIOD HISTORY?\n\nThis will PERMANENTLY DELETE ALL committed periods from ALL users in risk_history. This action CANNOT be undone!\n\nAre you absolutely sure?`)) {
      return;
    }

    if (!confirm(`FINAL CONFIRMATION: This will delete ${historyCount} history records. Click OK to proceed.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('risk_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      alert(`✅ Successfully deleted all ${historyCount} history records.`);
      await loadData();
    } catch (error: any) {
      console.error('Error bulk deleting history:', error);
      alert('Failed to delete history: ' + error.message);
    }
  };

  const handleBulkDeleteAllArchived = async () => {
    if (!confirm(`⚠️ ADMIN BULK DELETE - DELETE ALL ARCHIVED RISKS?\n\nThis will PERMANENTLY DELETE ALL ${archivedRisks.length} archived risks and their controls. This action CANNOT be undone!\n\nAre you absolutely sure?`)) {
      return;
    }

    if (!confirm(`FINAL CONFIRMATION: This will delete ${archivedRisks.length} archived risks. Click OK to proceed.`)) {
      return;
    }

    try {
      // Delete all archived risks (controls will cascade)
      const { error } = await supabase
        .from('archived_risks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      alert(`✅ Successfully deleted all ${archivedRisks.length} archived risks.`);
      await loadData();
    } catch (error: any) {
      console.error('Error bulk deleting archived risks:', error);
      alert('Failed to delete archived risks: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archive Management
              </CardTitle>
              <CardDescription>
                View and manage archived risks. Archived risks are preserved for audit purposes.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{archivedRisks.length}</div>
            <p className="text-xs text-gray-500">Total Archived Risks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {archivedRisks.filter(r => r.archive_reason === 'user_deleted').length}
            </div>
            <p className="text-xs text-gray-500">From User Deletions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {archivedRisks.filter(r => r.archive_reason === 'config_change').length}
            </div>
            <p className="text-xs text-gray-500">From Config Changes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6 space-y-2">
            <div className="text-2xl font-bold text-red-600">{historyCount}</div>
            <p className="text-xs text-gray-500">Committed Period History</p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleBulkDeleteAllHistory}
              disabled={historyCount === 0}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete All History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Archived Risks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Archived Risks</CardTitle>
              <CardDescription>
                All archived risks are preserved here. Use caution when permanently deleting.
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDeleteAllArchived}
              disabled={archivedRisks.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Archived
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Risk Code</th>
                  <th className="text-left p-2 font-medium">Risk Title</th>
                  <th className="text-left p-2 font-medium">Division</th>
                  <th className="text-left p-2 font-medium">Archived Date</th>
                  <th className="text-left p-2 font-medium">Reason</th>
                  <th className="text-center p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archivedRisks.map((risk) => (
                  <tr key={risk.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-xs">{risk.risk_code}</td>
                    <td className="p-2">{risk.risk_title}</td>
                    <td className="p-2 text-gray-600">{risk.division}</td>
                    <td className="p-2 text-xs text-gray-600">
                      {new Date(risk.archived_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        risk.archive_reason === 'user_deleted' ? 'bg-blue-100 text-blue-800' :
                        risk.archive_reason === 'config_change' ? 'bg-orange-100 text-orange-800' :
                        risk.archive_reason === 'admin_archived' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {risk.archive_reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(risk)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(risk)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Permanently delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {archivedRisks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No archived risks found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Risk Details</DialogTitle>
            <DialogDescription>
              Risk Code: {selectedRisk?.risk_code}
            </DialogDescription>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Risk Title</Label>
                  <p className="font-medium">{selectedRisk.risk_title}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <p>{selectedRisk.status}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Division</Label>
                  <p>{selectedRisk.division}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Department</Label>
                  <p>{selectedRisk.department}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Category</Label>
                  <p>{selectedRisk.category}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Owner</Label>
                  <p>{selectedRisk.owner}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Risk Description</Label>
                <p className="text-sm">{selectedRisk.risk_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Likelihood (Inherent)</Label>
                  <p>{selectedRisk.likelihood_inherent}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Impact (Inherent)</Label>
                  <p>{selectedRisk.impact_inherent}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Archive Reason</Label>
                <p>{selectedRisk.archive_reason.replace(/_/g, ' ')}</p>
              </div>

              {selectedRisk.archive_notes && (
                <div>
                  <Label className="text-xs text-gray-500">Archive Notes</Label>
                  <p className="text-sm">{selectedRisk.archive_notes}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-500">Archived At</Label>
                <p className="text-sm">{new Date(selectedRisk.archived_at).toLocaleString()}</p>
              </div>

              {/* Controls */}
              <div>
                <Label className="font-semibold">Controls ({controls.length})</Label>
                {controls.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {controls.map((control, idx) => (
                      <div key={control.id} className="p-3 border rounded text-sm">
                        <div className="font-medium">Control {idx + 1}</div>
                        <p className="text-gray-600">{control.description}</p>
                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Design:</span> {control.design}
                          </div>
                          <div>
                            <span className="text-gray-500">Implementation:</span> {control.implementation}
                          </div>
                          <div>
                            <span className="text-gray-500">Monitoring:</span> {control.monitoring}
                          </div>
                          <div>
                            <span className="text-gray-500">Effectiveness:</span> {control.effectiveness_evaluation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No controls</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanent Deletion Warning
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The archived risk and all its controls will be permanently deleted from the database.
            </DialogDescription>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="font-medium">Risk Code: {selectedRisk.risk_code}</p>
                <p className="text-sm text-gray-600">{selectedRisk.risk_title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-password">Confirm your password to proceed</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={deleting}
                />
                {deleteError && (
                  <p className="text-sm text-red-600">{deleteError}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleting || !deletePassword}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
