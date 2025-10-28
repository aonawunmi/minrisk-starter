// src/components/intelligence/IntelligenceAlertCard.tsx
// Card display for individual risk intelligence alerts

import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { type RiskAlertWithEvent } from '../../lib/riskIntelligence';
import { format, formatDistanceToNow } from 'date-fns';

type IntelligenceAlertCardProps = {
  alert: RiskAlertWithEvent;
  onReview?: (alert: RiskAlertWithEvent) => void;
};

export function IntelligenceAlertCard({ alert, onReview }: IntelligenceAlertCardProps) {
  const getStatusBadge = () => {
    switch (alert.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{alert.status}</Badge>;
    }
  };

  const getConfidenceBadge = () => {
    const confidence = alert.confidence_score;
    if (confidence >= 0.8) {
      return <Badge className="bg-green-600">High Confidence ({Math.round(confidence * 100)}%)</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="bg-yellow-600">Medium Confidence ({Math.round(confidence * 100)}%)</Badge>;
    } else {
      return <Badge className="bg-gray-600">Low Confidence ({Math.round(confidence * 100)}%)</Badge>;
    }
  };

  const getLikelihoodChangeIndicator = () => {
    const change = alert.suggested_likelihood_change;
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <span className="text-sm font-medium">No change</span>
        </div>
      );
    }
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
    <Card className={`hover:shadow-md transition-shadow ${alert.status === 'pending' ? 'border-l-4 border-l-yellow-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="space-y-1 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <h4 className="font-medium text-sm text-gray-900">
                  {alert.risk_code}
                </h4>
                {getStatusBadge()}
              </div>
              {alert.risk_title && (
                <p className="text-xs font-medium text-gray-700 ml-6">{alert.risk_title}</p>
              )}
              {alert.risk_description && (
                <p className="text-xs text-gray-600 ml-6 line-clamp-1">{alert.risk_description}</p>
              )}
            </div>

            {/* Event Title */}
            <h5 className="text-sm font-medium text-gray-700 mb-1">
              {alert.event.title}
            </h5>

            {/* Event Details */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <Badge variant="outline" className={getCategoryColor(alert.event.event_category)}>
                {alert.event.event_category}
              </Badge>
              <span>{alert.event.source_name}</span>
              <span>{formatDistanceToNow(new Date(alert.event.published_date), { addSuffix: true })}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {getLikelihoodChangeIndicator()}
            {getConfidenceBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* AI Reasoning */}
        <div>
          <p className="text-sm text-gray-700 line-clamp-2">{alert.reasoning}</p>
        </div>

        {/* Impact Assessment */}
        {alert.impact_assessment && (
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-800">{alert.impact_assessment}</p>
          </div>
        )}

        {/* Suggested Controls */}
        {alert.suggested_controls && alert.suggested_controls.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Suggested Controls:</p>
            <ul className="space-y-1">
              {alert.suggested_controls.slice(0, 2).map((control, idx) => (
                <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="line-clamp-1">{control}</span>
                </li>
              ))}
              {alert.suggested_controls.length > 2 && (
                <li className="text-xs text-gray-500 italic">
                  +{alert.suggested_controls.length - 2} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {alert.event.source_url && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => window.open(alert.event.source_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Source
              </Button>
            )}
          </div>

          {alert.status === 'pending' && onReview && (
            <Button size="sm" className="h-7 text-xs" onClick={() => onReview(alert)}>
              <Eye className="h-3 w-3 mr-1" />
              Review
            </Button>
          )}

          {alert.status !== 'pending' && alert.reviewed_at && (
            <span className="text-xs text-gray-500">
              Reviewed {format(new Date(alert.reviewed_at), 'MMM d')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
