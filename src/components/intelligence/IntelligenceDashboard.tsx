// src/components/intelligence/IntelligenceDashboard.tsx
// Main dashboard widget for Risk Intelligence Monitor

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  type RiskAlertWithEvent,
  type AlertStatus,
  loadRiskAlerts,
  getAlertsStatistics,
} from '../../lib/riskIntelligence';
import { IntelligenceAlertCard } from './IntelligenceAlertCard';
import { AlertReviewDialog } from './AlertReviewDialog';

type IntelligenceDashboardProps = {
  riskCode?: string; // Optional: filter by specific risk
};

export function IntelligenceDashboard({ riskCode }: IntelligenceDashboardProps) {
  const [alerts, setAlerts] = useState<RiskAlertWithEvent[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<RiskAlertWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | AlertStatus>('all');
  const [selectedAlert, setSelectedAlert] = useState<RiskAlertWithEvent | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    high_confidence: 0,
  });

  useEffect(() => {
    loadData();
    loadStats();
  }, [riskCode]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, activeFilter]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await loadRiskAlerts(undefined, riskCode);

    if (!error && data) {
      setAlerts(data);
    } else {
      console.error('Error loading alerts:', error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { data, error } = await getAlertsStatistics();
    if (!error && data) {
      setStatistics(data);
    }
  };

  const filterAlerts = () => {
    if (activeFilter === 'all') {
      setFilteredAlerts(alerts);
    } else {
      setFilteredAlerts(alerts.filter(a => a.status === activeFilter));
    }
  };

  const handleReview = (alert: RiskAlertWithEvent) => {
    setSelectedAlert(alert);
    setShowReviewDialog(true);
  };

  const handleUpdate = () => {
    loadData();
    loadStats();
  };

  const getFilterCount = (filter: 'all' | AlertStatus) => {
    if (filter === 'all') return alerts.length;
    return alerts.filter(a => a.status === filter).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading intelligence alerts...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Risk Intelligence Monitor</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  AI-powered risk intelligence from global news sources
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleUpdate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">{statistics.total}</span>
              <span className="text-xs text-gray-500">Total Alerts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-yellow-600">{statistics.pending}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-green-600">{statistics.accepted}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Accepted
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-red-600">{statistics.rejected}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Rejected
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-blue-600">{statistics.high_confidence}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                High Confidence
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List with Filters */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
            <TabsList>
              <TabsTrigger value="all" className="relative">
                All
                {getFilterCount('all') > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {getFilterCount('all')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                <Clock className="h-3 w-3 mr-1" />
                Pending
                {getFilterCount('pending') > 0 && (
                  <Badge className="ml-2 h-5 px-1.5 text-xs bg-yellow-600">
                    {getFilterCount('pending')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Accepted
                {getFilterCount('accepted') > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {getFilterCount('accepted')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="h-3 w-3 mr-1" />
                Rejected
                {getFilterCount('rejected') > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {getFilterCount('rejected')}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">
                {activeFilter === 'all'
                  ? 'No intelligence alerts yet'
                  : `No ${activeFilter} alerts`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeFilter === 'pending'
                  ? 'Alerts will appear here when events are detected'
                  : 'Check back later for updates'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => (
                <IntelligenceAlertCard
                  key={alert.id}
                  alert={alert}
                  onReview={handleReview}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <AlertReviewDialog
        alert={selectedAlert}
        open={showReviewDialog}
        onClose={() => {
          setShowReviewDialog(false);
          setSelectedAlert(null);
        }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
