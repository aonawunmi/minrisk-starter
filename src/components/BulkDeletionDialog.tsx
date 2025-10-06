import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Trash2, Archive, AlertTriangle } from 'lucide-react';
import { archiveRisk } from '@/lib/archive';
import { supabase } from '@/lib/supabase';

type BulkDeletionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRisks: Array<{ risk_code: string; risk_title: string }>;
  onComplete: () => void;
};

export default function BulkDeletionDialog({
  open,
  onOpenChange,
  selectedRisks,
  onComplete,
}: BulkDeletionDialogProps) {
  const [action, setAction] = useState<'archive' | 'permanent'>('archive');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleSubmit = async () => {
    setLoading(true);
    setProgress({ current: 0, total: selectedRisks.length });

    try {
      for (let i = 0; i < selectedRisks.length; i++) {
        const risk = selectedRisks[i];
        setProgress({ current: i + 1, total: selectedRisks.length });

        if (action === 'archive') {
          // Archive the risk
          const result = await archiveRisk(
            risk.risk_code,
            'user_requested',
            reason || 'Bulk archive operation'
          );

          if (!result.success) {
            console.error(`Failed to archive risk ${risk.risk_code}:`, result.error);
            // Continue with other risks
          }
        } else {
          // Permanent deletion - delete from database directly
          const { error } = await supabase
            .from('risks')
            .delete()
            .eq('risk_code', risk.risk_code);

          if (error) {
            console.error(`Failed to delete risk ${risk.risk_code}:`, error);
            // Continue with other risks
          }
        }
      }

      alert(`Successfully processed ${selectedRisks.length} risks`);
      onComplete();
      onOpenChange(false);

      // Reset form
      setAction('archive');
      setReason('');
      setPassword('');
    } catch (error: any) {
      console.error('Bulk deletion error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAction('archive');
      setReason('');
      setConfirmText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Bulk Delete Risks ({selectedRisks.length} selected)
          </DialogTitle>
          <DialogDescription>
            Choose whether to archive or permanently delete the selected risks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected risks preview */}
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
            <div className="text-sm font-medium mb-2">Selected Risks:</div>
            <ul className="space-y-1">
              {selectedRisks.map((risk) => (
                <li key={risk.risk_code} className="text-sm">
                  <span className="font-mono font-medium">{risk.risk_code}</span> - {risk.risk_title}
                </li>
              ))}
            </ul>
          </div>

          {/* Action selection */}
          <div className="space-y-3">
            <Label>Action</Label>
            <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="archive" id="archive" />
                <div className="flex-1">
                  <Label htmlFor="archive" className="cursor-pointer font-medium flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archive (Recommended)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Risks will be moved to archive and can be restored later. This is the safe option.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-red-50 cursor-pointer">
                <RadioGroupItem value="permanent" id="permanent" />
                <div className="flex-1">
                  <Label htmlFor="permanent" className="cursor-pointer font-medium flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Permanent Delete
                  </Label>
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Risks will be permanently deleted from the database. This cannot be undone!
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Reason (for archive) */}
          {action === 'archive' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., End of quarter cleanup, outdated risks, etc."
                rows={3}
              />
            </div>
          )}

          {/* Confirmation text (for permanent delete) */}
          {action === 'permanent' && (
            <div className="space-y-2 bg-red-50 p-4 rounded-lg border border-red-200">
              <Label htmlFor="confirmText" className="text-red-700 font-medium">
                Type DELETE to Confirm
              </Label>
              <Input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE in capital letters"
                className="border-red-300"
              />
              <p className="text-xs text-red-600">
                ⚠️ This will permanently delete {selectedRisks.length} risks and all their controls. This action cannot be undone!
              </p>
            </div>
          )}

          {/* Progress indicator */}
          {loading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium mb-2">
                Processing: {progress.current} of {progress.total} risks
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || (action === 'permanent' && confirmText.toUpperCase() !== 'DELETE')}
            variant={action === 'permanent' ? 'destructive' : 'default'}
          >
            {loading ? (
              <>Processing...</>
            ) : action === 'archive' ? (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive {selectedRisks.length} Risks
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Permanently Delete {selectedRisks.length} Risks
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
