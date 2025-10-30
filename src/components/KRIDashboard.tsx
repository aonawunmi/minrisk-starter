// src/components/KRIDashboard.tsx
// KRI Dashboard - Overview of KRIs, trends, and alerts

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import {
  loadKRIDefinitions,
  getKRIDashboardSummary,
  loadKRIAlerts,
  type KRIDefinition,
  type KRIAlert,
  type KRIDashboardSummary,
} from '@/lib/kri';

export function KRIDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<KRIDashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<KRIAlert[]>([]);
  const [kris, setKris] = useState<KRIDefinition[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, alertsData, krisData] = await Promise.all([
        getKRIDashboardSummary(),
        loadKRIAlerts(),
        loadKRIDefinitions(false),
      ]);

      setSummary(summaryData);
      setAlerts(alertsData);
      setKris(krisData);
    } catch (err) {
      console.error('Failed to load KRI dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading KRI Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total KRIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{summary?.totalKRIs || 0}</div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.activeKRIs || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{summary?.openAlerts || 0}</div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary?.redAlerts || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Within Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{summary?.greenKRIs || 0}</div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Performing well</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-600">{summary?.atRiskKRIs || 0}</div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => {
                const kri = kris.find(k => k.id === alert.kri_id);
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.alert_level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{kri?.kri_name || 'Unknown KRI'}</div>
                        <div className="text-sm mt-1">
                          Measured: <span className="font-semibold">{alert.measured_value}</span> |
                          Threshold: <span className="font-semibold">{alert.threshold_breached}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(alert.alert_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.alert_level === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        {alert.alert_level === 'red' ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {alerts.length > 5 && (
              <p className="text-sm text-gray-500 mt-3 text-center">
                +{alerts.length - 5} more alerts
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* KRI Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>KRI Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {kris.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No KRIs defined yet</p>
              <p className="text-sm mt-1">Start by creating your first Key Risk Indicator</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kris.slice(0, 6).map((kri) => (
                <div key={kri.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm">{kri.kri_code}</div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      kri.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {kri.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-900 font-medium mb-1">{kri.kri_name}</div>
                  <div className="text-xs text-gray-500">
                    {kri.risk_category || 'Uncategorized'}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Frequency: {kri.collection_frequency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Getting Started */}
      {kris.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started with KRIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <div className="font-medium">Define Your KRIs</div>
                  <div className="text-gray-600">
                    Go to KRI Management and create Key Risk Indicators with thresholds
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <div className="font-medium">Enter Measurements</div>
                  <div className="text-gray-600">
                    Record KRI values regularly in the Data Entry tab
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <div className="font-medium">Monitor Alerts</div>
                  <div className="text-gray-600">
                    Get automatic alerts when KRIs breach thresholds
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
