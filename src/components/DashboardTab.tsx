// src/components/DashboardTab.tsx
// Main Dashboard with Executive Overview and Risk Appetite

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Shield, BarChart3, AlertTriangle } from 'lucide-react';
import AppetiteDashboard from '@/components/risk-appetite/AppetiteDashboard';
import type { ProcessedRisk } from '@/App';
import type { Incident } from '@/lib/incidents';

type DashboardTabProps = {
  risks: ProcessedRisk[];
  incidents: Incident[];
  showToast: (message: string, type?: 'success' | 'error') => void;
};

export function DashboardTab({ risks, incidents, showToast }: DashboardTabProps) {
  // Calculate summary statistics
  const totalRisks = risks.length;
  const highRisks = risks.filter(r => r.residual_score >= 12).length;
  const totalIncidents = incidents.length;
  const recentIncidents = incidents.filter(i => {
    const incidentDate = new Date(i.incident_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return incidentDate >= thirtyDaysAgo;
  }).length;

  const avgResidualScore = risks.length > 0
    ? (risks.reduce((sum, r) => sum + r.residual_score, 0) / risks.length).toFixed(1)
    : '0.0';

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList>
        <TabsTrigger value="overview">📊 Overview</TabsTrigger>
        <TabsTrigger value="appetite">🎯 Risk Appetite</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Executive Dashboard</h2>
          <p className="text-gray-600">Real-time overview of your risk management status</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Risks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRisks}</div>
              <p className="text-xs text-gray-500 mt-1">Active in portfolio</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                High Priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{highRisks}</div>
              <p className="text-xs text-gray-600 mt-1">
                {totalRisks > 0 ? `${((highRisks / totalRisks) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Risk Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">{avgResidualScore}</div>
              <p className="text-xs text-gray-600 mt-1">Residual risk level</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardDescription>Incidents (30d)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{recentIncidents}</div>
              <p className="text-xs text-gray-600 mt-1">
                {totalIncidents} total recorded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  const event = new CustomEvent('minrisk:navigate', { detail: 'register' });
                  window.dispatchEvent(event);
                }}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-medium">Risk Register</div>
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('minrisk:navigate', { detail: 'analytics' });
                  window.dispatchEvent(event);
                }}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">📈</div>
                <div className="font-medium">Analytics</div>
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('minrisk:navigate', { detail: 'operations' });
                  window.dispatchEvent(event);
                }}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">🚨</div>
                <div className="font-medium">Operations</div>
              </button>
              <button
                onClick={() => {
                  const event = new CustomEvent('minrisk:navigate', { detail: 'ai_assistant' });
                  window.dispatchEvent(event);
                }}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center transition-colors"
              >
                <div className="text-2xl mb-2">✨</div>
                <div className="font-medium">AI Assistant</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Welcome to MinRisk</strong> - Your enterprise risk management platform.
                Navigate using the tabs above to access risk register, analytics, operations, and more.
                View Risk Appetite status in the tab above.
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appetite">
        <AppetiteDashboard showToast={showToast} />
      </TabsContent>
    </Tabs>
  );
}
