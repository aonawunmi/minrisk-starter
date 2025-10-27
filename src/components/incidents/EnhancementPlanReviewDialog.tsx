// src/components/incidents/EnhancementPlanReviewDialog.tsx
// Dialog for reviewing and accepting/rejecting enhancement plan recommendations

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Target,
  Shield,
  Info,
} from 'lucide-react';
import {
  type ControlEnhancementPlan,
  type ControlRecommendation,
  updateRecommendationStatus,
  acceptAllRecommendations,
  rejectAllRecommendations,
} from '../../lib/controlEnhancements';
import { format } from 'date-fns';

type EnhancementPlanReviewDialogProps = {
  plan: ControlEnhancementPlan | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export function EnhancementPlanReviewDialog({
  plan,
  open,
  onClose,
  onUpdate,
}: EnhancementPlanReviewDialogProps) {
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [actionNotes, setActionNotes] = useState<{ [key: number]: string }>({});
  const [processingRec, setProcessingRec] = useState<number | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  if (!plan) return null;

  const handleAccept = async (index: number) => {
    setProcessingRec(index);
    const notes = actionNotes[index] || '';
    const { success, error } = await updateRecommendationStatus(plan.id, index, 'accepted', notes);

    if (success) {
      onUpdate();
      setActionNotes(prev => ({ ...prev, [index]: '' }));
      setExpandedRec(null);
    } else {
      alert('Failed to accept recommendation. Please try again.');
      console.error(error);
    }
    setProcessingRec(null);
  };

  const handleReject = async (index: number) => {
    setProcessingRec(index);
    const notes = actionNotes[index] || '';
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      setProcessingRec(null);
      return;
    }

    const { success, error } = await updateRecommendationStatus(plan.id, index, 'rejected', notes);

    if (success) {
      onUpdate();
      setActionNotes(prev => ({ ...prev, [index]: '' }));
      setExpandedRec(null);
    } else {
      alert('Failed to reject recommendation. Please try again.');
      console.error(error);
    }
    setProcessingRec(null);
  };

  const handleAcceptAll = async () => {
    if (!confirm('Accept all pending recommendations?')) return;

    setProcessingAll(true);
    const { success, error } = await acceptAllRecommendations(plan.id, 'Bulk accepted');

    if (success) {
      onUpdate();
      setActionNotes({});
      setExpandedRec(null);
    } else {
      alert('Failed to accept all recommendations. Please try again.');
      console.error(error);
    }
    setProcessingAll(false);
  };

  const handleRejectAll = async () => {
    const reason = prompt('Provide a reason for rejecting all recommendations:');
    if (!reason?.trim()) return;

    setProcessingAll(true);
    const { success, error } = await rejectAllRecommendations(plan.id, reason);

    if (success) {
      onUpdate();
      setActionNotes({});
      setExpandedRec(null);
    } else {
      alert('Failed to reject all recommendations. Please try again.');
      console.error(error);
    }
    setProcessingAll(false);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'assessment':
        return <Info className="h-4 w-4" />;
      case 'improvement':
        return <Target className="h-4 w-4" />;
      case 'new_control':
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'implemented':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Implemented
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = plan.recommendations.filter(r => r.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Control Enhancement Plan Review</DialogTitle>
          <DialogDescription>
            Assessment from {format(new Date(plan.assessment_date), 'MMMM d, yyyy h:mm a')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overall Control Adequacy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{plan.overall_adequacy_score}/10</span>
                <Badge
                  variant="outline"
                  className={
                    plan.overall_adequacy_score >= 7
                      ? 'bg-green-50 text-green-700'
                      : plan.overall_adequacy_score >= 4
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700'
                  }
                >
                  {plan.overall_adequacy_score >= 7
                    ? 'Strong'
                    : plan.overall_adequacy_score >= 4
                    ? 'Moderate'
                    : 'Weak'}
                </Badge>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    plan.overall_adequacy_score >= 7
                      ? 'bg-green-500'
                      : plan.overall_adequacy_score >= 4
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(plan.overall_adequacy_score / 10) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Findings */}
          {plan.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Key Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.findings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Bulk Actions */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {pendingCount} recommendation{pendingCount !== 1 ? 's' : ''} pending review
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={processingAll}
                >
                  Reject All
                </Button>
                <Button size="sm" onClick={handleAcceptAll} disabled={processingAll}>
                  {processingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Accept All'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Recommendations ({plan.recommendations.length})
            </h4>

            {plan.recommendations.map((rec, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader
                  className={`pb-3 cursor-pointer hover:bg-gray-50 ${
                    expandedRec === idx ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => setExpandedRec(expandedRec === idx ? null : idx)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded ${getPriorityColor(rec.priority)}`}>
                        {getRecommendationIcon(rec.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {rec.type.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(rec.priority)}`}
                          >
                            {rec.priority} priority
                          </Badge>
                          {getStatusBadge(rec.status)}
                        </div>
                        <p className="text-sm text-gray-900">{rec.description}</p>
                        {rec.risk_code && (
                          <p className="text-xs text-gray-500 mt-1">Related to: {rec.risk_code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {expandedRec === idx && rec.status === 'pending' && (
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes (optional for accept, required for reject)
                        </label>
                        <Textarea
                          placeholder="Add implementation notes or rejection reason..."
                          value={actionNotes[idx] || ''}
                          onChange={e =>
                            setActionNotes(prev => ({ ...prev, [idx]: e.target.value }))
                          }
                          className="text-sm"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(idx)}
                          disabled={processingRec === idx}
                          className="text-red-600 hover:bg-red-50"
                        >
                          {processingRec === idx ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(idx)}
                          disabled={processingRec === idx}
                        >
                          {processingRec === idx ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Accept
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}

                {expandedRec === idx && rec.status !== 'pending' && (
                  <CardContent className="pt-0 border-t">
                    <div className="text-sm text-gray-600">
                      {rec.implementation_notes && (
                        <div>
                          <span className="font-medium">Notes:</span> {rec.implementation_notes}
                        </div>
                      )}
                      {rec.accepted_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {rec.status} on {format(new Date(rec.accepted_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Linked Risks Snapshot */}
          {plan.linked_risks_snapshot.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Risks Analyzed ({plan.linked_risks_snapshot.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.linked_risks_snapshot.map((risk, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{risk.risk_code}</span>
                        <span className="text-gray-600 ml-2">{risk.risk_title}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {risk.category} • L{risk.likelihood_inherent}/I{risk.impact_inherent}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
