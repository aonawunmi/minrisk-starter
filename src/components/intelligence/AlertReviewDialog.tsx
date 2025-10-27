// src/components/intelligence/AlertReviewDialog.tsx
// Dialog for reviewing and accepting/rejecting risk intelligence alerts

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
import { Checkbox } from '../ui/checkbox';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ExternalLink,
  Globe,
  Calendar,
  Tag,
  Target,
} from 'lucide-react';
import { type RiskAlertWithEvent, updateAlertStatus } from '../../lib/riskIntelligence';
import { format } from 'date-fns';

type AlertReviewDialogProps = {
  alert: RiskAlertWithEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export function AlertReviewDialog({ alert, open, onClose, onUpdate }: AlertReviewDialogProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [applyToRisk, setApplyToRisk] = useState(true);
  const [processing, setProcessing] = useState(false);

  if (!alert) return null;

  const handleAccept = async () => {
    setProcessing(true);
    const { success, error } = await updateAlertStatus(
      alert.id,
      'accepted',
      reviewNotes || 'Alert accepted',
      applyToRisk
    );

    if (success) {
      onUpdate();
      onClose();
      setReviewNotes('');
    } else {
      alert(`Failed to accept alert: ${error}`);
      console.error(error);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    const { success, error } = await updateAlertStatus(alert.id, 'rejected', reviewNotes, false);

    if (success) {
      onUpdate();
      onClose();
      setReviewNotes('');
    } else {
      alert(`Failed to reject alert: ${error}`);
      console.error(error);
    }
    setProcessing(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cybersecurity':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'regulatory':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'market':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'environmental':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'operational':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Risk Intelligence Alert</DialogTitle>
          <DialogDescription>
            Evaluate whether this event affects the risk's likelihood
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    {alert.risk_code}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {alert.suggested_likelihood_change > 0 ? (
                    <Badge className="bg-red-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{alert.suggested_likelihood_change} Likelihood
                    </Badge>
                  ) : alert.suggested_likelihood_change < 0 ? (
                    <Badge className="bg-green-600">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {alert.suggested_likelihood_change} Likelihood
                    </Badge>
                  ) : (
                    <Badge variant="outline">No Change</Badge>
                  )}
                  <Badge
                    className={
                      alert.confidence_score >= 0.8
                        ? 'bg-green-600'
                        : alert.confidence_score >= 0.6
                        ? 'bg-yellow-600'
                        : 'bg-gray-600'
                    }
                  >
                    {Math.round(alert.confidence_score * 100)}% Confidence
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{alert.event.title}</h4>
                <p className="text-sm text-gray-700">{alert.event.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Globe className="h-4 w-4" />
                  {alert.event.source_name}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(alert.event.published_date), 'MMM d, yyyy h:mm a')}
                </div>
                <Badge variant="outline" className={getCategoryColor(alert.event.event_category)}>
                  <Tag className="h-3 w-3 mr-1" />
                  {alert.event.event_category}
                </Badge>
                {alert.event.country && (
                  <Badge variant="outline">
                    {alert.event.country}
                  </Badge>
                )}
              </div>

              {alert.event.source_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(alert.event.source_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Source
                </Button>
              )}

              {alert.event.keywords && alert.event.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {alert.event.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1">Reasoning:</h5>
                <p className="text-sm text-gray-700">{alert.reasoning}</p>
              </div>

              {alert.impact_assessment && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="text-xs font-medium text-blue-900 mb-1">Impact Assessment:</h5>
                  <p className="text-sm text-blue-800">{alert.impact_assessment}</p>
                </div>
              )}

              {alert.suggested_controls && alert.suggested_controls.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Suggested Controls:
                  </h5>
                  <ul className="space-y-2">
                    {alert.suggested_controls.map((control, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{control}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Actions */}
          {alert.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Review Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes {alert.status === 'pending' && '(required for rejection)'}
                  </label>
                  <Textarea
                    placeholder="Add your review notes or reason for rejection..."
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                </div>

                {alert.suggested_likelihood_change !== 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Checkbox
                      id="apply-to-risk"
                      checked={applyToRisk}
                      onCheckedChange={(checked) => setApplyToRisk(checked as boolean)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="apply-to-risk"
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        Apply likelihood change to risk
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        If accepted, this will automatically update the risk's inherent likelihood by{' '}
                        {alert.suggested_likelihood_change > 0 ? '+' : ''}
                        {alert.suggested_likelihood_change}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <Button variant="outline" onClick={onClose} disabled={processing}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={processing}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button onClick={handleAccept} disabled={processing}>
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Accept Alert
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Reviewed */}
          {alert.status !== 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Review History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        alert.status === 'accepted'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }
                    >
                      {alert.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </Badge>
                    {alert.reviewed_at && (
                      <span className="text-sm text-gray-500">
                        on {format(new Date(alert.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                  </div>
                  {alert.review_notes && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {alert.review_notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
