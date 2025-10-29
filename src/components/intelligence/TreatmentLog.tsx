// src/components/intelligence/TreatmentLog.tsx
// Treatment Log - Track and apply accepted alerts to risk register

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import {  type RiskAlertWithEvent, loadRiskAlerts, applyAlertTreatment } from '../../lib/riskIntelligence';
import { format } from 'date-fns';

export function TreatmentLog() {
  const [pendingAlerts, setPendingAlerts] = useState<RiskAlertWithEvent[]>([]);
  const [appliedAlerts, setAppliedAlerts] = useState<RiskAlertWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [treatmentNotes, setTreatmentNotes] = useState<Record<string, string>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    loadTreatmentData();
  }, []);

  const loadTreatmentData = async () => {
    setLoading(true);
    try {
      // Load all accepted alerts
      const { data: allAccepted } = await loadRiskAlerts(['accepted']);

      if (allAccepted) {
        // Filter by applied_to_risk status
        const pending = allAccepted.filter(a => !a.applied_to_risk);
        const applied = allAccepted.filter(a => a.applied_to_risk);

        setPendingAlerts(pending);
        setAppliedAlerts(applied);
      }
    } catch (error) {
      console.error('Error loading treatment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTreatment = async (alertId: string) => {
    setApplyingId(alertId);
    try {
      const notes = treatmentNotes[alertId] || '';
      const result = await applyAlertTreatment(alertId, notes);

      if (result.success) {
        // Refresh data
        await loadTreatmentData();
        // Clear notes
        setTreatmentNotes(prev => {
          const updated = { ...prev };
          delete updated[alertId];
          return updated;
        });
        // Switch to applied tab to see the result
        setActiveTab('applied');
      } else {
        alert(`Failed to apply treatment: ${result.error}`);
      }
    } catch (error) {
      console.error('Error applying treatment:', error);
      alert(`Error: ${error}`);
    } finally {
      setApplyingId(null);
    }
  };

  const getLikelihoodChangeIndicator = (change: number) => {
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
    }
    return null;
  };

  const TreatmentCard = ({ alert, isPending }: { alert: RiskAlertWithEvent; isPending: boolean }) => (
    <Card key={alert.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {alert.risk_code}
              </Badge>
              {getLikelihoodChangeIndicator(alert.suggested_likelihood_change)}
              {!isPending && (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Applied
                </Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Application
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm">
              {alert.risk_title || alert.risk_code}
            </h3>
            {alert.risk_description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {alert.risk_description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Event Information */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Triggering Event</h4>
          <p className="text-sm font-medium">{alert.event.title}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{alert.event.description}</p>
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">AI Analysis</h4>
          <p className="text-sm text-gray-700">{alert.reasoning}</p>
        </div>

        {/* Impact Assessment */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Impact Assessment</h4>
          <p className="text-sm text-gray-700">{alert.impact_assessment}</p>
        </div>

        {/* Suggested Controls */}
        {alert.suggested_controls && alert.suggested_controls.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Suggested Controls</h4>
            <ul className="text-sm space-y-1">
              {alert.suggested_controls.map((control, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">{control}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Applied Information */}
        {!isPending && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>Applied: {alert.applied_at ? format(new Date(alert.applied_at), 'PPp') : 'Unknown'}</span>
            </div>
            {alert.treatment_notes && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase">Treatment Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">{alert.treatment_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Treatment Form (Pending only) */}
        {isPending && (
          <div className="pt-4 border-t space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`notes-${alert.id}`} className="text-sm font-medium">
                Treatment Notes (Optional)
              </Label>
              <Textarea
                id={`notes-${alert.id}`}
                placeholder="Document how you applied this alert to the risk register (e.g., updated likelihood, added controls, notified stakeholders...)"
                value={treatmentNotes[alert.id] || ''}
                onChange={(e) => setTreatmentNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                rows={3}
                className="text-sm"
              />
            </div>

            <Button
              onClick={() => handleApplyTreatment(alert.id)}
              disabled={applyingId === alert.id}
              className="w-full"
              size="sm"
            >
              {applyingId === alert.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply to Risk Register
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              This will update the risk's likelihood by {alert.suggested_likelihood_change > 0 ? '+' : ''}{alert.suggested_likelihood_change} and mark the alert as applied.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Treatment Log
          </h2>
          <p className="text-sm text-gray-600">
            Track and apply accepted alerts to your risk register
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Application
            {pendingAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="applied" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Applied
            {appliedAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {appliedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : pendingAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-sm text-gray-600">
                  No accepted alerts are pending application to the risk register.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-medium text-orange-900">
                      Action Required
                    </h4>
                    <p className="text-sm text-orange-800">
                      {pendingAlerts.length} accepted {pendingAlerts.length === 1 ? 'alert' : 'alerts'} waiting to be applied to the risk register.
                      Review the details below and click "Apply to Risk Register" to update the corresponding risk.
                    </p>
                  </div>
                </div>
              </div>
              {pendingAlerts.map(alert => (
                <TreatmentCard key={alert.id} alert={alert} isPending={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applied" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          ) : appliedAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileCheck className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Applied Treatments Yet</h3>
                <p className="text-sm text-gray-600">
                  Alerts you apply to the risk register will appear here with their treatment history.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appliedAlerts.map(alert => (
                <TreatmentCard key={alert.id} alert={alert} isPending={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
