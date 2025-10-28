// src/components/intelligence/IntelligenceDashboard.tsx
// Main dashboard widget for Risk Intelligence Monitor

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
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
  Trash2,
} from 'lucide-react';
import {
  type RiskAlertWithEvent,
  type AlertStatus,
  loadRiskAlerts,
  getAlertsStatistics,
  bulkDeletePendingAlerts,
} from '../../lib/riskIntelligence';
import { IntelligenceAlertCard } from './IntelligenceAlertCard';
import { AlertReviewDialog } from './AlertReviewDialog';
import { ScanResultsDialog } from './ScanResultsDialog';
import { EventBrowser } from './EventBrowser';
import { NewsSourcesManager } from './NewsSourcesManager';
import { RiskKeywordsManager } from './RiskKeywordsManager';
import { supabase } from '../../lib/supabase';

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
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    high_confidence: 0,
  });
  const [showKeywordDialog, setShowKeywordDialog] = useState(false);
  const [availableKeywords, setAvailableKeywords] = useState<Array<{ id: string; keyword: string; category: string }>>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

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

  const loadAvailableKeywords = async () => {
    setLoadingKeywords(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Load active keywords for this organization
      const { data: keywords, error } = await supabase
        .from('risk_keywords')
        .select('id, keyword, category')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('keyword', { ascending: true });

      if (!error && keywords) {
        setAvailableKeywords(keywords);
        // Select all keywords by default
        setSelectedKeywords(keywords.map(k => k.keyword));
      }
    } catch (error) {
      console.error('Error loading keywords:', error);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const handleOpenKeywordDialog = () => {
    loadAvailableKeywords();
    setShowKeywordDialog(true);
  };

  const handleScanNews = async (keywordsToUse?: string[]) => {
    setScanning(true);
    setScanMessage('Scanning news feeds...');

    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScanMessage('❌ Not authenticated. Please log in.');
        setScanning(false);
        return;
      }

      // Call backend API endpoint instead of running scanner in browser
      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          selectedKeywords: keywordsToUse,
        }),
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

  const handleAnalyzeExisting = async () => {
    setAnalyzing(true);
    setAnalyzeMessage('Analyzing existing events...');

    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAnalyzeMessage('❌ Not authenticated. Please log in.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'analyzeExisting',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalyzeMessage(
          `✅ Analysis complete! Analyzed ${result.events_analyzed} events, ` +
          `created ${result.alerts_created} alerts.`
        );

        // Reload data after a short delay
        setTimeout(() => {
          loadData();
          loadStats();
          setAnalyzeMessage('');
        }, 3000);
      } else {
        setAnalyzeMessage(`❌ Analysis failed: ${result.error || 'Unknown error'}`);
        setTimeout(() => setAnalyzeMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error analyzing events:', error);
      setAnalyzeMessage('❌ Error analyzing events. Check console for details.');
      setTimeout(() => setAnalyzeMessage(''), 5000);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetAnalysis = async () => {
    if (!confirm(
      'This will reset all analyzed events so they can be re-analyzed. ' +
      'Use this if you\'ve added new risks and want to re-match existing events. Continue?'
    )) return;

    setResetting(true);
    setResetMessage('Resetting analysis timestamps...');

    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResetMessage('❌ Not authenticated. Please log in.');
        setResetting(false);
        return;
      }

      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'resetAnalysis',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResetMessage(`✅ Reset ${result.events_reset} events. Click "Analyze Events" to re-analyze.`);
        setTimeout(() => {
          setResetMessage('');
        }, 5000);
      } else {
        setResetMessage(`❌ Reset failed: ${result.error || 'Unknown error'}`);
        setTimeout(() => setResetMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error resetting analysis:', error);
      setResetMessage('❌ Error resetting analysis. Check console for details.');
      setTimeout(() => setResetMessage(''), 5000);
    } finally {
      setResetting(false);
    }
  };

  const handleBulkDeletePending = async () => {
    if (!confirm(
      'This will delete ALL pending alerts. This action cannot be undone. Continue?'
    )) return;

    setBulkDeleting(true);
    setBulkDeleteMessage('Deleting pending alerts...');

    const { success, count, error } = await bulkDeletePendingAlerts();

    if (success) {
      setBulkDeleteMessage(`✅ Deleted ${count} pending alerts`);
      setTimeout(() => {
        setBulkDeleteMessage('');
        loadData();
        loadStats();
      }, 2000);
    } else {
      setBulkDeleteMessage(`❌ Failed to delete alerts: ${error}`);
      setTimeout(() => setBulkDeleteMessage(''), 5000);
    }

    setBulkDeleting(false);
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
                onClick={handleOpenKeywordDialog}
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
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAnalyzeExisting}
                disabled={analyzing}
                title="Analyze existing unanalyzed events for risk alerts"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Events
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAnalysis}
                disabled={resetting}
                title="Reset analyzed events to re-analyze them (useful after adding new risks)"
              >
                {resetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Analysis
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleUpdate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {statistics.pending > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeletePending}
                  disabled={bulkDeleting}
                  title="Delete all pending alerts"
                >
                  {bulkDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Pending
                    </>
                  )}
                </Button>
              )}
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
          {analyzeMessage && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900">
              {analyzeMessage}
            </div>
          )}
          {resetMessage && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-900">
              {resetMessage}
            </div>
          )}
          {bulkDeleteMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
              {bulkDeleteMessage}
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

      {/* Keyword Selection Dialog */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Risk Keywords for Scanning</DialogTitle>
            <DialogDescription>
              Choose which keywords to use when scanning news feeds. By default, all active keywords are selected.
            </DialogDescription>
          </DialogHeader>

          {loadingKeywords ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Loading keywords...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All / Deselect All */}
              <div className="flex items-center gap-4 pb-3 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKeywords(availableKeywords.map(k => k.keyword))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKeywords([])}
                >
                  Deselect All
                </Button>
                <span className="text-sm text-gray-500 ml-auto">
                  {selectedKeywords.length} of {availableKeywords.length} selected
                </span>
              </div>

              {/* Keywords grouped by category */}
              {availableKeywords.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  No active keywords found. Please add keywords in the Keywords Manager.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(
                    availableKeywords.reduce((acc, kw) => {
                      if (!acc[kw.category]) acc[kw.category] = [];
                      acc[kw.category].push(kw);
                      return acc;
                    }, {} as Record<string, typeof availableKeywords>)
                  ).map(([category, keywords]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 capitalize">
                        {category}
                      </h4>
                      <div className="space-y-2 pl-2">
                        {keywords.map((kw) => (
                          <div key={kw.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`kw-${kw.id}`}
                              checked={selectedKeywords.includes(kw.keyword)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedKeywords([...selectedKeywords, kw.keyword]);
                                } else {
                                  setSelectedKeywords(selectedKeywords.filter(k => k !== kw.keyword));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`kw-${kw.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {kw.keyword}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowKeywordDialog(false);
                setSelectedKeywords([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowKeywordDialog(false);
                handleScanNews(selectedKeywords.length > 0 ? selectedKeywords : undefined);
              }}
              disabled={selectedKeywords.length === 0}
            >
              <Rss className="h-4 w-4 mr-2" />
              Scan with {selectedKeywords.length} Keyword{selectedKeywords.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
