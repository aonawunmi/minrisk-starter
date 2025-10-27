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
  Rss,
  Database,
  Settings,
  Tag,
} from 'lucide-react';
import {
  type RiskAlertWithEvent,
  type AlertStatus,
  loadRiskAlerts,
  getAlertsStatistics,
} from '../../lib/riskIntelligence';
import { IntelligenceAlertCard } from './IntelligenceAlertCard';
import { AlertReviewDialog } from './AlertReviewDialog';
import { ScanResultsDialog } from './ScanResultsDialog';
import { EventBrowser } from './EventBrowser';
import { NewsSourcesManager } from './NewsSourcesManager';
import { RiskKeywordsManager } from './RiskKeywordsManager';

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
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [showScanResults, setShowScanResults] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanStats, setScanStats] = useState<any>(null);
  const [showEventBrowser, setShowEventBrowser] = useState(false);
  const [showSourcesManager, setShowSourcesManager] = useState(false);
  const [showKeywordsManager, setShowKeywordsManager] = useState(false);
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

  const handleScanNews = async () => {
    setScanning(true);
    setScanMessage('Scanning news feeds...');

    try {
      // Call backend API endpoint instead of running scanner in browser
      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Store scan results and stats
        setScanResults(result.scanResults || []);
        setScanStats(result.stats);

        setScanMessage(
          `✅ Scan complete! Processed ${result.stats.feeds_processed} feeds, ` +
          `found ${result.stats.events_found} events, ` +
          `stored ${result.stats.events_stored} events, ` +
          `created ${result.stats.alerts_created} alerts.`
        );

        // Show scan results dialog
        setShowScanResults(true);

        // Reload data after a short delay
        setTimeout(() => {
          loadData();
          loadStats();
        }, 1000);
      } else {
        setScanMessage(`❌ Scan failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error running news scanner:', error);
      setScanMessage('❌ Error connecting to news scanner API. Check console for details.');
    } finally {
      setScanning(false);
    }
  };

  const getFilterCount = (filter: 'all' | AlertStatus) => {
    if (filter === 'all') return alerts.length;
    return alerts.filter(a => a.status === filter).length;
  };

  const handleRetainEvent = async (item: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retain',
          eventData: item,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setScanMessage('✅ Event saved successfully!');
        setTimeout(() => setScanMessage(''), 3000);
        return true;
      } else {
        setScanMessage(`❌ Failed to save event: ${result.error}`);
        setTimeout(() => setScanMessage(''), 5000);
        return false;
      }
    } catch (error) {
      console.error('Error retaining event:', error);
      setScanMessage('❌ Error saving event. Check console for details.');
      setTimeout(() => setScanMessage(''), 5000);
      return false;
    }
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeywordsManager(!showKeywordsManager)}
                title="Manage Risk Keywords"
              >
                <Tag className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSourcesManager(!showSourcesManager)}
                title="Manage News Sources"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventBrowser(!showEventBrowser)}
                title="Browse Stored Events"
              >
                <Database className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleScanNews}
                disabled={scanning}
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Rss className="h-4 w-4 mr-2" />
                    Scan News
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleUpdate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
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
          {scanMessage && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              {scanMessage}
            </div>
          )}
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

      {/* Event Browser */}
      {showEventBrowser && (
        <EventBrowser />
      )}

      {/* News Sources Manager */}
      {showSourcesManager && (
        <NewsSourcesManager />
      )}

      {/* Risk Keywords Manager */}
      {showKeywordsManager && (
        <RiskKeywordsManager />
      )}

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

      {/* Scan Results Dialog */}
      {scanStats && (
        <ScanResultsDialog
          open={showScanResults}
          onClose={() => setShowScanResults(false)}
          results={scanResults}
          stats={scanStats}
          onRetain={handleRetainEvent}
        />
      )}
    </div>
  );
}
