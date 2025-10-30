// src/components/risk-appetite/AppetiteDashboard.tsx
// Executive Dashboard for Risk Appetite Monitoring (Phase 5A)

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import {
  calculateAppetiteUtilization,
  loadAppetiteHistory,
  loadAppetiteExceptions,
  generateAppetiteSnapshot,
  type AppetiteUtilization,
  type RiskAppetiteHistory,
  type RiskAppetiteException,
} from '@/lib/risk-appetite';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type AppetiteDashboardProps = {
  showToast: (message: string, type?: 'success' | 'error') => void;
};

export default function AppetiteDashboard({ showToast }: AppetiteDashboardProps) {
  const [utilization, setUtilization] = useState<AppetiteUtilization | null>(null);
  const [history, setHistory] = useState<RiskAppetiteHistory[]>([]);
  const [exceptions, setExceptions] = useState<RiskAppetiteException[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [utilizationData, historyData, exceptionsData] = await Promise.all([
        calculateAppetiteUtilization(),
        loadAppetiteHistory(30),
        loadAppetiteExceptions('pending'),
      ]);

      setUtilization(utilizationData);
      setHistory(historyData);
      setExceptions(exceptionsData);
    } catch (error) {
      console.error('Error loading appetite dashboard:', error);
      showToast('Failed to load appetite dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await generateAppetiteSnapshot();
      await loadData();
      showToast('Dashboard refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Gauge chart component
  const AppetiteGauge = ({ value, max = 100 }: { value: number; max?: number }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const rotation = (percentage / 100) * 180 - 90;

    const getColor = () => {
      if (percentage <= 50) return 'text-green-600';
      if (percentage <= 75) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getLabel = () => {
      if (percentage <= 50) return 'Within Appetite';
      if (percentage <= 75) return 'Approaching Limit';
      return 'Over Appetite';
    };

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-24">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 80 A 80 80 0 0 1 180 80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Colored segments */}
            <path
              d="M 20 80 A 80 80 0 0 1 100 20"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d="M 100 20 A 80 80 0 0 1 140 35"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="20"
              strokeLinecap="round"
            />
            <path
              d="M 140 35 A 80 80 0 0 1 180 80"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Needle */}
            <g transform={`rotate(${rotation}, 100, 80)`}>
              <line
                x1="100"
                y1="80"
                x2="100"
                y2="30"
                stroke="#1f2937"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="80" r="5" fill="#1f2937" />
            </g>
          </svg>
        </div>
        <div className="text-center mt-2">
          <div className={`text-3xl font-bold ${getColor()}`}>{value.toFixed(1)}%</div>
          <div className="text-sm text-gray-600 mt-1">{getLabel()}</div>
        </div>
      </div>
    );
  };

  // Format history data for chart
  const chartData = history.map((item) => ({
    date: new Date(item.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    utilization: item.appetite_utilization,
    within: item.risks_within_appetite,
    over: item.risks_over_appetite,
  })).reverse();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading appetite dashboard...</div>
      </div>
    );
  }

  if (!utilization) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">No appetite data available</p>
        <p className="text-sm">Configure appetite thresholds to start monitoring</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Risk Appetite Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of organizational risk appetite utilization
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Risks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{utilization.total_risks}</div>
            <p className="text-xs text-gray-500 mt-1">Active risks in portfolio</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription>Within Appetite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{utilization.risks_within_appetite}</div>
            <p className="text-xs text-gray-600 mt-1">
              {utilization.total_risks > 0
                ? `${((utilization.risks_within_appetite / utilization.total_risks) * 100).toFixed(1)}%`
                : '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardDescription>Over Appetite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{utilization.risks_over_appetite}</div>
            <p className="text-xs text-gray-600 mt-1">
              {utilization.total_risks > 0
                ? `${((utilization.risks_over_appetite / utilization.total_risks) * 100).toFixed(1)}%`
                : '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardDescription>Average Risk Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{utilization.avg_score.toFixed(1)}</div>
            <p className="text-xs text-gray-600 mt-1">Out of 30.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appetite Utilization Gauge */}
        <Card>
          <CardHeader>
            <CardTitle>Appetite Utilization</CardTitle>
            <CardDescription>Overall risk appetite consumption</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <AppetiteGauge value={utilization.utilization} />
          </CardContent>
        </Card>

        {/* Pending Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Exceptions
            </CardTitle>
            <CardDescription>
              {exceptions.length} exception{exceptions.length !== 1 ? 's' : ''} awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No pending exceptions</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {exceptions.slice(0, 5).map((exception) => (
                  <div
                    key={exception.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Risk ID: {exception.risk_id.slice(0, 8)}...</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Review: {new Date(exception.review_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
                {exceptions.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      View All {exceptions.length} Exceptions
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend Chart */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Appetite Utilization Trend</CardTitle>
            <CardDescription>Last 30 days of appetite monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="Utilization %"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk Distribution Chart */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution Trend</CardTitle>
            <CardDescription>Within vs. Over Appetite comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Number of Risks', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="within"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Within Appetite"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="over"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Over Appetite"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Info Footer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Dashboard Updates:</strong> This dashboard displays real-time appetite utilization.
              Click "Refresh" to generate a new snapshot and update historical trends. Pending exceptions
              require admin approval before risks can exceed tolerance thresholds.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
