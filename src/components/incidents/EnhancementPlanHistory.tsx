// src/components/incidents/EnhancementPlanHistory.tsx
// Shows saved Control Enhancement Plans for an incident

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, FileText, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import {
  type ControlEnhancementPlan,
  loadEnhancementPlans,
} from '../../lib/controlEnhancements';
import { format } from 'date-fns';

type EnhancementPlanHistoryProps = {
  incidentId: string;
  onSelectPlan?: (plan: ControlEnhancementPlan) => void;
};

export function EnhancementPlanHistory({ incidentId, onSelectPlan }: EnhancementPlanHistoryProps) {
  const [plans, setPlans] = useState<ControlEnhancementPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, [incidentId]);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error } = await loadEnhancementPlans(incidentId);
    if (!error && data) {
      setPlans(data);
    } else {
      console.error('Error loading enhancement plans:', error);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'partially_accepted':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Partially Accepted
          </Badge>
        );
      case 'fully_accepted':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Fully Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecommendationStats = (plan: ControlEnhancementPlan) => {
    const accepted = plan.recommendations.filter(r => r.status === 'accepted').length;
    const rejected = plan.recommendations.filter(r => r.status === 'rejected').length;
    const implemented = plan.recommendations.filter(r => r.status === 'implemented').length;
    const pending = plan.recommendations.filter(r => r.status === 'pending').length;
    const total = plan.recommendations.length;

    return { accepted, rejected, implemented, pending, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading assessment history...</span>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No saved control assessments yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Run the AI Control Assessment and save it to see history here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Saved Assessments ({plans.length})</h4>
      </div>

      {plans.map(plan => {
        const stats = getRecommendationStats(plan);
        return (
          <Card
            key={plan.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectPlan?.(plan)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium text-gray-900">
                    Assessment from {format(new Date(plan.assessment_date), 'MMM d, yyyy h:mm a')}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.total} recommendation{stats.total !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(plan.status)}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Adequacy Score */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Overall Adequacy</span>
                  <span className="font-medium text-gray-900">{plan.overall_adequacy_score}/10</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      plan.overall_adequacy_score >= 7
                        ? 'bg-green-500'
                        : plan.overall_adequacy_score >= 4
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${(plan.overall_adequacy_score / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Recommendation Stats */}
              <div className="flex items-center gap-3 text-xs">
                {stats.accepted > 0 && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {stats.accepted} accepted
                  </div>
                )}
                {stats.implemented > 0 && (
                  <div className="flex items-center text-blue-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {stats.implemented} implemented
                  </div>
                )}
                {stats.pending > 0 && (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {stats.pending} pending
                  </div>
                )}
                {stats.rejected > 0 && (
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    {stats.rejected} rejected
                  </div>
                )}
              </div>

              {/* Linked Risks */}
              {plan.linked_risks_snapshot.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">
                    Analyzed against {plan.linked_risks_snapshot.length} risk
                    {plan.linked_risks_snapshot.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
