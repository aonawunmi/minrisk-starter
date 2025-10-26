// src/components/AnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  PieChart,
  LineChart,
  Shield,
  Minus,
} from 'lucide-react';
import type { ProcessedRisk } from '../App';
import type { Incident } from '../lib/incidents';

interface AnalyticsDashboardProps {
  risks: ProcessedRisk[];
  incidents: Incident[];
  selectedPeriod: string[];
}

export function AnalyticsDashboard({ risks, incidents, selectedPeriod }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('executive');

  // Filter risks by selected period
  const filteredRisks = useMemo(() => {
    if (selectedPeriod.length === 0) return risks;
    return risks.filter(r => r.relevant_period && selectedPeriod.includes(r.relevant_period));
  }, [risks, selectedPeriod]);

  // Calculate Executive Summary KPIs
  const executiveMetrics = useMemo(() => {
    const totalRisks = filteredRisks.length;
    const criticalRisks = filteredRisks.filter(r => {
      const score = r.likelihood_residual * r.impact_residual;
      return score >= 20; // Severe
    }).length;
    const highRisks = filteredRisks.filter(r => {
      const score = r.likelihood_residual * r.impact_residual;
      return score >= 12 && score < 20; // High
    }).length;
    const openRisks = filteredRisks.filter(r => r.status === 'Open').length;
    const closedRisks = filteredRisks.filter(r => r.status === 'Closed').length;

    const avgInherentScore = totalRisks > 0
      ? filteredRisks.reduce((sum, r) => sum + (r.likelihood_inherent * r.impact_inherent), 0) / totalRisks
      : 0;

    const avgResidualScore = totalRisks > 0
      ? filteredRisks.reduce((sum, r) => sum + (r.likelihood_residual * r.impact_residual), 0) / totalRisks
      : 0;

    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter(i => i.status === 'Reported' || i.status === 'Under Investigation').length;
    const highSeverityIncidents = incidents.filter(i => i.severity >= 4).length;

    const totalFinancialImpact = incidents.reduce((sum, i) =>
      sum + (i.financial_impact || 0), 0
    );

    return {
      totalRisks,
      criticalRisks,
      highRisks,
      openRisks,
      closedRisks,
      avgInherentScore,
      avgResidualScore,
      totalIncidents,
      openIncidents,
      highSeverityIncidents,
      totalFinancialImpact,
    };
  }, [filteredRisks, incidents]);

  // Risk Distribution by Severity (based on residual score)
  const riskBySeverity = useMemo(() => {
    const distribution = {
      'Severe': 0,
      'High': 0,
      'Moderate': 0,
      'Low': 0,
      'Minimal': 0,
    };

    filteredRisks.forEach(r => {
      const score = r.likelihood_residual * r.impact_residual;
      if (score >= 20) {
        distribution['Severe']++;
      } else if (score >= 12) {
        distribution['High']++;
      } else if (score >= 6) {
        distribution['Moderate']++;
      } else if (score >= 3) {
        distribution['Low']++;
      } else {
        distribution['Minimal']++;
      }
    });

    return distribution;
  }, [filteredRisks]);

  // Risk Distribution by Category
  const riskByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredRisks.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });
    return categories;
  }, [filteredRisks]);

  // Risk Distribution by Division
  const riskByDivision = useMemo(() => {
    const divisions: Record<string, number> = {};
    filteredRisks.forEach(r => {
      divisions[r.division] = (divisions[r.division] || 0) + 1;
    });
    return divisions;
  }, [filteredRisks]);

  // Incident Distribution by Type
  const incidentByType = useMemo(() => {
    const types: Record<string, number> = {};
    incidents.forEach(i => {
      types[i.incident_type] = (types[i.incident_type] || 0) + 1;
    });
    return types;
  }, [incidents]);

  // Incident Distribution by Severity
  const incidentBySeverity = useMemo(() => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    incidents.forEach(i => {
      distribution[i.severity as keyof typeof distribution]++;
    });
    return distribution;
  }, [incidents]);

  // Control Effectiveness Metrics
  const controlMetrics = useMemo(() => {
    const allControls = filteredRisks.flatMap(r => r.controls || []);
    if (allControls.length === 0) {
      return {
        avgDesign: 0,
        avgImplementation: 0,
        avgMonitoring: 0,
        avgEffectiveness: 0,
        totalControls: 0,
      };
    }

    const avgDesign = allControls.reduce((sum, c) => sum + c.design, 0) / allControls.length;
    const avgImplementation = allControls.reduce((sum, c) => sum + c.implementation, 0) / allControls.length;
    const avgMonitoring = allControls.reduce((sum, c) => sum + c.monitoring, 0) / allControls.length;
    const avgEffectiveness = allControls.reduce((sum, c) => sum + c.effectiveness_evaluation, 0) / allControls.length;

    return {
      avgDesign,
      avgImplementation,
      avgMonitoring,
      avgEffectiveness,
      totalControls: allControls.length,
    };
  }, [filteredRisks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive risk and incident analytics
            {selectedPeriod.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                (Filtered by: {selectedPeriod.join(', ')})
              </span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-300">
          <BarChart3 className="h-4 w-4 mr-1" />
          Real-time Analytics
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="executive">
            <Activity className="h-4 w-4 mr-2" />
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="risks">
            <PieChart className="h-4 w-4 mr-2" />
            Risk Analytics
          </TabsTrigger>
          <TabsTrigger value="trends">
            <LineChart className="h-4 w-4 mr-2" />
            Trend Analysis
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Incident Analytics
          </TabsTrigger>
          <TabsTrigger value="controls">
            <Shield className="h-4 w-4 mr-2" />
            Control Effectiveness
          </TabsTrigger>
        </TabsList>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-6">
          <ExecutiveSummary metrics={executiveMetrics} />
        </TabsContent>

        {/* Risk Analytics Tab */}
        <TabsContent value="risks" className="space-y-6">
          <RiskAnalytics
            riskBySeverity={riskBySeverity}
            riskByCategory={riskByCategory}
            riskByDivision={riskByDivision}
            risks={filteredRisks}
          />
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysis risks={filteredRisks} />
        </TabsContent>

        {/* Incident Analytics Tab */}
        <TabsContent value="incidents" className="space-y-6">
          <IncidentAnalytics
            incidentByType={incidentByType}
            incidentBySeverity={incidentBySeverity}
            totalFinancialImpact={executiveMetrics.totalFinancialImpact}
          />
        </TabsContent>

        {/* Control Effectiveness Tab */}
        <TabsContent value="controls" className="space-y-6">
          <ControlEffectiveness metrics={controlMetrics} risks={filteredRisks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Executive Summary Component
function ExecutiveSummary({ metrics }: { metrics: any }) {
  const riskReductionPercent = metrics.avgInherentScore > 0
    ? ((metrics.avgInherentScore - metrics.avgResidualScore) / metrics.avgInherentScore * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.totalRisks}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                {metrics.criticalRisks} Critical
              </Badge>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {metrics.highRisks} High
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Risk Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metrics.openRisks}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Open</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-green-600">{metrics.closedRisks} Closed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {metrics.avgResidualScore.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">/ 25</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">
                {riskReductionPercent.toFixed(0)}% reduction
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.totalIncidents}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                {metrics.openIncidents} Open
              </Badge>
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                {metrics.highSeverityIncidents} High
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Impact Card */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Financial Impact Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-700">
            ₦{(metrics.totalFinancialImpact / 1_000_000).toFixed(2)}M
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Total financial impact from all incidents
          </p>
        </CardContent>
      </Card>

      {/* Inherent vs Residual Risk Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Mitigation Effectiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-2">Inherent Risk</div>
              <div className="text-4xl font-bold text-red-600">
                {metrics.avgInherentScore.toFixed(1)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <TrendingDown className="h-8 w-8 text-green-600" />
              <span className="text-sm text-green-600 font-medium mt-1">
                {riskReductionPercent.toFixed(0)}% Reduction
              </span>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-2">Residual Risk</div>
              <div className="text-4xl font-bold text-blue-600">
                {metrics.avgResidualScore.toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Risk Analytics Component
function RiskAnalytics({ riskBySeverity, riskByCategory, riskByDivision, risks }: any) {
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleFilterClick = (type: string, value: string) => {
    setSelectedFilter({ type, value });
    setShowDialog(true);
  };

  const getSeverityFromScore = (score: number): string => {
    if (score >= 20) return 'Severe';
    if (score >= 12) return 'High';
    if (score >= 6) return 'Moderate';
    if (score >= 3) return 'Low';
    return 'Minimal';
  };

  const filteredRisks = useMemo(() => {
    if (!selectedFilter) return [];

    switch (selectedFilter.type) {
      case 'severity':
        return risks.filter((r: ProcessedRisk) => {
          const score = r.likelihood_residual * r.impact_residual;
          return getSeverityFromScore(score) === selectedFilter.value;
        });
      case 'category':
        return risks.filter((r: ProcessedRisk) => r.category === selectedFilter.value);
      case 'division':
        return risks.filter((r: ProcessedRisk) => r.division === selectedFilter.value);
      default:
        return [];
    }
  }, [selectedFilter, risks]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Severe': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-lime-100 text-lime-800 border-lime-300';
      case 'Minimal': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Calculate max count for proper bar scaling
  const maxSeverityCount = Math.max(...Object.values(riskBySeverity) as number[], 1);
  const maxCategoryCount = Math.max(...Object.values(riskByCategory) as number[], 1);
  const maxDivisionCount = Math.max(...Object.values(riskByDivision) as number[], 1);

  return (
    <div className="space-y-6">
      {/* Risk by Severity */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution by Severity</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Click on any bar to view risks</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(riskBySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-gray-700">{severity}</div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-8 cursor-pointer hover:bg-gray-300 transition-colors" onClick={() => handleFilterClick('severity', severity)}>
                    <div
                      className={`h-8 rounded-full flex items-center px-3 text-sm font-medium transition-all hover:shadow-lg ${
                        severity === 'Severe' ? 'bg-red-600 hover:bg-red-700 text-white' :
                        severity === 'High' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                        severity === 'Moderate' ? 'bg-yellow-400 hover:bg-yellow-500 text-black' :
                        severity === 'Low' ? 'bg-lime-400 hover:bg-lime-500 text-black' :
                        'bg-green-400 hover:bg-green-500 text-black'
                      }`}
                      style={{
                        width: `${Math.max(((count as number) / maxSeverityCount) * 100, (count as number) > 0 ? 10 : 0)}%`,
                        minWidth: (count as number) > 0 ? '40px' : '0px'
                      }}
                      title={`Click to view ${count} ${severity} risk(s)`}
                    >
                      {count as number}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution by Category</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Click on any bar to view risks</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(riskByCategory)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium text-gray-700 truncate" title={category}>{category}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-6 cursor-pointer hover:bg-gray-300 transition-colors" onClick={() => handleFilterClick('category', category)}>
                      <div
                        className="bg-blue-600 hover:bg-blue-700 h-6 rounded-full flex items-center px-3 text-white text-xs font-medium transition-all hover:shadow-lg"
                        style={{
                          width: `${Math.max(((count as number) / maxCategoryCount) * 100, (count as number) > 0 ? 8 : 0)}%`,
                          minWidth: (count as number) > 0 ? '35px' : '0px'
                        }}
                        title={`Click to view ${count} risk(s) in ${category}`}
                      >
                        {count as number}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk by Division */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution by Division</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Click on any bar to view risks</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(riskByDivision)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([division, count]) => (
                <div key={division} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium text-gray-700 truncate" title={division}>{division}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-6 cursor-pointer hover:bg-gray-300 transition-colors" onClick={() => handleFilterClick('division', division)}>
                      <div
                        className="bg-purple-600 hover:bg-purple-700 h-6 rounded-full flex items-center px-3 text-white text-xs font-medium transition-all hover:shadow-lg"
                        style={{
                          width: `${Math.max(((count as number) / maxDivisionCount) * 100, (count as number) > 0 ? 8 : 0)}%`,
                          minWidth: (count as number) > 0 ? '35px' : '0px'
                        }}
                        title={`Click to view ${count} risk(s) in ${division}`}
                      >
                        {count as number}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtered Risks Dialog */}
      {selectedFilter && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {selectedFilter.type === 'severity' && `${selectedFilter.value} Priority Risks`}
                  {selectedFilter.type === 'category' && `${selectedFilter.value} Category`}
                  {selectedFilter.type === 'division' && `${selectedFilter.value} Division`}
                </span>
                <Badge variant="outline" className="ml-2">
                  {filteredRisks.length} Risks
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-3">
                {filteredRisks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No risks found for this filter
                  </div>
                ) : (
                  filteredRisks.map((risk: ProcessedRisk) => {
                    const residualScore = risk.likelihood_residual * risk.impact_residual;
                    const severity = getSeverityFromScore(residualScore);

                    return (
                      <Card key={risk.risk_code} className="border hover:border-blue-300 transition-colors">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                                  {risk.risk_code}
                                </Badge>
                                <Badge variant="outline" className={getSeverityColor(severity)}>
                                  {severity}
                                </Badge>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                  {risk.category}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-1">{risk.risk_title}</h4>
                              <p className="text-sm text-gray-700 mb-2">{risk.risk_description}</p>
                            </div>
                          </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Division:</span>
                            <span className="ml-1 font-medium text-gray-900">{risk.division}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Department:</span>
                            <span className="ml-1 font-medium text-gray-900">{risk.department}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Owner:</span>
                            <span className="ml-1 font-medium text-gray-900">{risk.owner}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Inherent Risk</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-red-600">
                                L: {risk.likelihood_inherent} × I: {risk.impact_inherent} = {risk.likelihood_inherent * risk.impact_inherent}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Residual Risk</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-blue-600">
                                L: {risk.likelihood_residual} × I: {risk.impact_residual} = {risk.likelihood_residual * risk.impact_residual}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Trend Analysis Component
function TrendAnalysis({ risks }: { risks: ProcessedRisk[] }) {
  // Group risks by period
  const risksByPeriod = useMemo(() => {
    const periods: Record<string, ProcessedRisk[]> = {};
    risks.forEach(r => {
      const period = r.relevant_period || 'No Period';
      if (!periods[period]) periods[period] = [];
      periods[period].push(r);
    });
    return periods;
  }, [risks]);

  const periodStats = useMemo(() => {
    return Object.entries(risksByPeriod).map(([period, periodRisks]) => {
      const avgInherent = periodRisks.reduce((sum, r) => sum + (r.likelihood_inherent * r.impact_inherent), 0) / periodRisks.length;
      const avgResidual = periodRisks.reduce((sum, r) => sum + (r.likelihood_residual * r.impact_residual), 0) / periodRisks.length;
      const critical = periodRisks.filter(r => {
        const score = r.likelihood_residual * r.impact_residual;
        return score >= 20; // Severe
      }).length;
      const high = periodRisks.filter(r => {
        const score = r.likelihood_residual * r.impact_residual;
        return score >= 12 && score < 20; // High
      }).length;

      return {
        period,
        count: periodRisks.length,
        avgInherent,
        avgResidual,
        critical,
        high,
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }, [risksByPeriod]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Trends by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Period</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Total Risks</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Critical</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">High</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Avg Inherent</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Avg Residual</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Trend</th>
                </tr>
              </thead>
              <tbody>
                {periodStats.map((stat, idx) => {
                  const prevStat = idx > 0 ? periodStats[idx - 1] : null;
                  const trend = prevStat
                    ? stat.avgResidual - prevStat.avgResidual
                    : 0;

                  return (
                    <tr key={stat.period} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm font-medium">{stat.period}</td>
                      <td className="py-3 px-3 text-center text-sm">{stat.count}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                          {stat.critical}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          {stat.high}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-medium text-red-600">
                        {stat.avgInherent.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-medium text-blue-600">
                        {stat.avgResidual.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {idx === 0 ? (
                          <Minus className="h-4 w-4 text-gray-400 mx-auto" />
                        ) : trend < 0 ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-xs">Improving</span>
                          </div>
                        ) : trend > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs">Worsening</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-gray-600">
                            <Minus className="h-4 w-4" />
                            <span className="text-xs">Stable</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Incident Analytics Component
function IncidentAnalytics({ incidentByType, incidentBySeverity, totalFinancialImpact }: any) {
  return (
    <div className="space-y-6">
      {/* Incident by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(incidentByType)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-medium text-gray-700 truncate">{type}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-orange-600 h-6 rounded-full flex items-center px-3 text-white text-xs font-medium"
                        style={{ width: `${Math.min((count as number) * 10, 100)}%` }}
                      >
                        {count as number}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident by Severity */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Distribution by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(incidentBySeverity)
              .reverse()
              .map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-gray-700">Level {severity}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-8">
                      <div
                        className={`h-8 rounded-full flex items-center px-3 text-white text-sm font-medium ${
                          Number(severity) >= 4 ? 'bg-red-600' :
                          Number(severity) === 3 ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min((count as number) * 15, 100)}%` }}
                      >
                        {count as number}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial Impact Card */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Total Financial Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-red-700">
            ₦{(totalFinancialImpact / 1_000_000).toFixed(2)}M
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Cumulative financial loss from all incidents
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Control Effectiveness Component
function ControlEffectiveness({ metrics, risks }: { metrics: any; risks: ProcessedRisk[] }) {
  const dimeLabels = ['Not Implemented', 'Partially', 'Substantially', 'Fully'];

  const getDimeColor = (score: number) => {
    if (score >= 2.5) return 'bg-green-600';
    if (score >= 1.5) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  // Find controls with low scores
  const lowScoringControls = useMemo(() => {
    const controls: Array<{ risk: ProcessedRisk; control: any; avgScore: number }> = [];

    risks.forEach(risk => {
      risk.controls?.forEach(control => {
        const avg = (control.design + control.implementation + control.monitoring + control.effectiveness_evaluation) / 4;
        if (avg < 2) {
          controls.push({ risk, control, avgScore: avg });
        }
      });
    });

    return controls.sort((a, b) => a.avgScore - b.avgScore).slice(0, 10);
  }, [risks]);

  return (
    <div className="space-y-6">
      {/* DIME Scores Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Design</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.avgDesign.toFixed(1)}</div>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getDimeColor(metrics.avgDesign)}`}
                  style={{ width: `${(metrics.avgDesign / 3) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {dimeLabels[Math.round(metrics.avgDesign)]}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.avgImplementation.toFixed(1)}</div>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getDimeColor(metrics.avgImplementation)}`}
                  style={{ width: `${(metrics.avgImplementation / 3) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {dimeLabels[Math.round(metrics.avgImplementation)]}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.avgMonitoring.toFixed(1)}</div>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getDimeColor(metrics.avgMonitoring)}`}
                  style={{ width: `${(metrics.avgMonitoring / 3) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {dimeLabels[Math.round(metrics.avgMonitoring)]}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.avgEffectiveness.toFixed(1)}</div>
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getDimeColor(metrics.avgEffectiveness)}`}
                  style={{ width: `${(metrics.avgEffectiveness / 3) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {dimeLabels[Math.round(metrics.avgEffectiveness)]}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Controls Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Total Active Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-blue-700">
            {metrics.totalControls}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Control measures across all risks
          </p>
        </CardContent>
      </Card>

      {/* Low-Scoring Controls */}
      {lowScoringControls.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Controls Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowScoringControls.map((item, idx) => (
                <div key={idx} className="border-l-4 border-orange-500 pl-3 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        [{item.risk.risk_code}] {item.risk.risk_title}
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {item.control.description}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="text-gray-600">D: {item.control.design}</span>
                        <span className="text-gray-600">I: {item.control.implementation}</span>
                        <span className="text-gray-600">M: {item.control.monitoring}</span>
                        <span className="text-gray-600">E: {item.control.effectiveness_evaluation}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                      Avg: {item.avgScore.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
