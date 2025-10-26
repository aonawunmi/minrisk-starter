import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ListOrdered, FileText, X } from 'lucide-react';
import type { AppConfig } from '../App';

type ProcessedRisk = {
  risk_code: string;
  risk_title: string;
  risk_description: string;
  division: string;
  department: string;
  category: string;
  owner: string;
  likelihood_inherent: number;
  impact_inherent: number;
  likelihood_residual: number;
  impact_residual: number;
  inherent_score: number;
  residual_score: number;
  status: "Open" | "In Progress" | "Closed";
};

type RiskReportTabProps = {
  risks: ProcessedRisk[];
  config: AppConfig;
};

export function RiskReportTab({ risks, config }: RiskReportTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [sortColumn, setSortColumn] = useState<'category' | 'avgLikelihood' | 'avgImpact' | 'avgScore' | 'riskCount'>('avgScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCategoryMap, setShowCategoryMap] = useState(true); // Show map first, then list

  // Handle category click
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setShowCategoryMap(true); // Reset to show map first
    setShowCategoryDialog(true);
  };

  // Get risks for selected category
  const categoryRisks = selectedCategory
    ? risks.filter(r => r.category === selectedCategory)
    : [];

  // Calculate residual risk profile data
  const residualRiskProfile = risks.reduce((acc, risk) => {
    const key = `L${risk.likelihood_residual}-I${risk.impact_residual}`;
    if (!acc[key]) {
      acc[key] = {
        likelihood: risk.likelihood_residual,
        impact: risk.impact_residual,
        count: 0,
        risks: []
      };
    }
    acc[key].count++;
    acc[key].risks.push(risk);
    return acc;
  }, {} as Record<string, { likelihood: number; impact: number; count: number; risks: ProcessedRisk[] }>);

  // Calculate residual risk ranking by category (aggregated averages)
  const categoryRanking = Object.entries(
    risks.reduce((acc, risk) => {
      if (!acc[risk.category]) {
        acc[risk.category] = {
          category: risk.category,
          totalLikelihood: 0,
          totalImpact: 0,
          count: 0,
        };
      }
      acc[risk.category].totalLikelihood += risk.likelihood_residual;
      acc[risk.category].totalImpact += risk.impact_residual;
      acc[risk.category].count++;
      return acc;
    }, {} as Record<string, { category: string; totalLikelihood: number; totalImpact: number; count: number }>)
  ).map(([_, data]) => ({
    category: data.category,
    avgLikelihood: data.totalLikelihood / data.count,
    avgImpact: data.totalImpact / data.count,
    avgScore: (data.totalLikelihood / data.count) * (data.totalImpact / data.count),
    riskCount: data.count,
  }));

  // Sort category ranking
  const sortedCategoryRanking = [...categoryRanking].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calculate risk profile summary
  const summary = {
    totalRisks: risks.length,
    byCategory: risks.reduce((acc, risk) => {
      acc[risk.category] = (acc[risk.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byDivision: risks.reduce((acc, risk) => {
      acc[risk.division] = (acc[risk.division] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: risks.reduce((acc, risk) => {
      acc[risk.status] = (acc[risk.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgInherentScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.inherent_score, 0) / risks.length : 0,
    avgResidualScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.residual_score, 0) / risks.length : 0,
  };

  const getScoreColor = (score: number) => {
    if (score >= 20) return 'bg-red-600 text-white';
    if (score >= 12) return 'bg-orange-500 text-white';
    if (score >= 6) return 'bg-yellow-400 text-black';
    if (score >= 3) return 'bg-lime-400 text-black';
    return 'bg-green-400 text-black';
  };

  const getScoreColorHex = (score: number) => {
    if (score >= 20) return '#dc2626'; // red-600
    if (score >= 12) return '#f97316'; // orange-500
    if (score >= 6) return '#facc15'; // yellow-400
    if (score >= 3) return '#a3e635'; // lime-400
    return '#4ade80'; // green-400
  };

  const getScoreLabel = (score: number) => {
    if (score >= 20) return 'Severe';
    if (score >= 12) return 'High';
    if (score >= 6) return 'Moderate';
    if (score >= 3) return 'Low';
    return 'Minimal';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Report</CardTitle>
          <CardDescription>
            Comprehensive analysis of residual risks across the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <BarChart3 className="h-4 w-4 mr-2" />
                Residual Risk Profile
              </TabsTrigger>
              <TabsTrigger value="ranking">
                <ListOrdered className="h-4 w-4 mr-2" />
                Residual Risk Ranking
              </TabsTrigger>
              <TabsTrigger value="summary">
                <FileText className="h-4 w-4 mr-2" />
                Risk Profile Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Residual Risk Profile</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Distribution of risks by residual likelihood and impact levels
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm">Likelihood</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm">Impact</th>
                      <th className="border border-gray-300 px-3 py-2 text-right text-sm">Risk Count</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm">Risk Codes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(residualRiskProfile)
                      .sort((a, b) => (b[1].likelihood * b[1].impact) - (a[1].likelihood * a[1].impact))
                      .map(([key, data]) => (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">
                            {Number(data.likelihood).toFixed(2)} - {config.likelihoodLabels[Math.round(data.likelihood) - 1] || data.likelihood}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm whitespace-nowrap">
                            {Number(data.impact).toFixed(2)} - {config.impactLabels[Math.round(data.impact) - 1] || data.impact}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">
                            {data.count}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {data.risks.map(risk => (
                                <span
                                  key={risk.risk_code}
                                  className={`px-2 py-1 rounded text-xs ${getScoreColor(risk.residual_score)}`}
                                  title={risk.risk_title}
                                >
                                  {risk.risk_code}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="space-y-4 mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Residual Risk Ranking by Category</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Average residual likelihood, impact, and severity by risk category
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-center">Rank</th>
                      <th
                        className="border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-2">
                          Risk Category
                          {sortColumn === 'category' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('riskCount')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          # Risks
                          {sortColumn === 'riskCount' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('avgLikelihood')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Avg L
                          {sortColumn === 'avgLikelihood' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('avgImpact')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Avg I
                          {sortColumn === 'avgImpact' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200"
                        onClick={() => handleSort('avgScore')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Avg Score
                          {sortColumn === 'avgScore' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategoryRanking.map((category, index) => (
                      <tr key={category.category} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {category.category}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {category.riskCount}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {category.avgLikelihood.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {category.avgImpact.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center font-bold">
                          {category.avgScore.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getScoreColor(category.avgScore)}`}>
                            {getScoreLabel(category.avgScore)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Risk Category Heatmap */}
              <div className="mt-8">
                <h4 className="text-base font-semibold mb-4">Risk Category Positioning Map</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Categories positioned by average residual likelihood (horizontal) and impact (vertical).
                  Circle size represents number of risks in each category.
                </p>

                <div className="relative bg-gray-50 border-2 border-gray-300 rounded-lg" style={{ height: '600px', width: '100%' }}>
                  {/* Axis labels */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
                    Average Likelihood →
                  </div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-800 origin-center">
                    Average Impact →
                  </div>

                  {/* Chart area with padding */}
                  <div className="absolute" style={{ left: '80px', right: '200px', top: '60px', bottom: '60px' }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 bg-white border border-gray-300">
                      {/* Vertical grid lines */}
                      {[...Array(config.matrixSize - 1)].map((_, i) => (
                        <div
                          key={`v-${i}`}
                          className="absolute top-0 bottom-0 border-l border-gray-200"
                          style={{ left: `${((i + 1) / config.matrixSize) * 100}%` }}
                        />
                      ))}
                      {/* Horizontal grid lines */}
                      {[...Array(config.matrixSize - 1)].map((_, i) => (
                        <div
                          key={`h-${i}`}
                          className="absolute left-0 right-0 border-t border-gray-200"
                          style={{ top: `${((i + 1) / config.matrixSize) * 100}%` }}
                        />
                      ))}
                    </div>

                    {/* Y-axis labels */}
                    <div className="absolute -left-10 inset-y-0 flex flex-col justify-between py-1">
                      {[...Array(config.matrixSize)].map((_, i) => (
                        <div key={i} className="text-sm font-medium text-gray-700 text-right">
                          {config.matrixSize - i}
                        </div>
                      ))}
                    </div>

                    {/* X-axis labels */}
                    <div className="absolute inset-x-0 -bottom-8 flex justify-between px-1">
                      {[...Array(config.matrixSize)].map((_, i) => (
                        <div key={i} className="text-sm font-medium text-gray-700">
                          {i + 1}
                        </div>
                      ))}
                    </div>

                    {/* Bubbles */}
                    <div className="absolute inset-0">
                      {categoryRanking.length > 0 ? (
                        categoryRanking.map((category) => {
                          const xPercent = ((category.avgLikelihood - 1) / (config.matrixSize - 1)) * 100;
                          const yPercent = ((config.matrixSize - category.avgImpact) / (config.matrixSize - 1)) * 100;
                          const size = Math.max(30, Math.min(70, 25 + category.riskCount * 6));
                          const bgColor = getScoreColorHex(category.avgScore);

                          return (
                            <div
                              key={category.category}
                              className="absolute rounded-full cursor-pointer transition-all hover:scale-110 hover:z-10 shadow-lg hover:shadow-2xl"
                              style={{
                                left: `${xPercent}%`,
                                top: `${yPercent}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: bgColor,
                                border: '2px solid white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={`${category.category}\nAvg L: ${category.avgLikelihood.toFixed(2)}, Avg I: ${category.avgImpact.toFixed(2)}\n${category.riskCount} risks, Score: ${category.avgScore.toFixed(2)}\n\nClick to view risks`}
                              onClick={() => handleCategoryClick(category.category)}
                            >
                              <div className="text-center px-2">
                                <div
                                  className="text-xs font-bold text-white leading-tight"
                                  style={{
                                    fontSize: size > 60 ? '11px' : '9px',
                                    lineHeight: '1.1',
                                  }}
                                >
                                  {category.category.length > 12 ? category.category.substring(0, 10) + '...' : category.category}
                                </div>
                                <div className="text-xs font-bold text-white mt-0.5">
                                  ({category.riskCount})
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                          No risk categories to display
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="absolute right-8 top-16 bg-white border-2 border-gray-300 p-4 rounded-lg shadow-lg">
                    <div className="text-sm font-bold mb-3 text-gray-900">Risk Severity</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow"></div>
                        <span className="text-xs font-medium">Severe</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                        <span className="text-xs font-medium">High</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-white shadow"></div>
                        <span className="text-xs font-medium">Moderate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-lime-400 border-2 border-white shadow"></div>
                        <span className="text-xs font-medium">Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-white shadow"></div>
                        <span className="text-xs font-medium">Minimal</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="text-xs text-gray-600 italic">Size = # of risks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4 mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Risk Profile Summary</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Overview of risk distribution and key metrics
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overall Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Risks:</span>
                      <span className="font-bold">{summary.totalRisks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Average Inherent Score:</span>
                      <span className="font-bold">{summary.avgInherentScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Average Residual Score:</span>
                      <span className="font-bold">{summary.avgResidualScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Risk Reduction:</span>
                      <span className="font-bold text-green-600">
                        {((1 - summary.avgResidualScore / summary.avgInherentScore) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(summary.byStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="font-medium">{status}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(summary.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, count]) => (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="font-medium">{category}:</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Division</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(summary.byDivision)
                      .sort((a, b) => b[1] - a[1])
                      .map(([division, count]) => (
                        <div key={division} className="flex justify-between text-sm">
                          <span className="font-medium">{division}:</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Detail Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCategory} - Risk Distribution</span>
              <Badge variant="outline" className="ml-2">
                {categoryRisks.length} Risks
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={showCategoryMap ? 'map' : 'list'} onValueChange={(v) => setShowCategoryMap(v === 'map')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="map">Risk Heatmap</TabsTrigger>
              <TabsTrigger value="list">Risk List</TabsTrigger>
            </TabsList>

            {/* Heatmap View */}
            <TabsContent value="map" className="flex-1 overflow-y-auto mt-4">
              <div className="relative bg-gray-50 border-2 border-gray-300 rounded-lg" style={{ height: '500px', width: '100%' }}>
                {/* Axis labels */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
                  Likelihood →
                </div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-800 origin-center">
                  Impact →
                </div>

                {/* Chart area */}
                <div className="absolute" style={{ left: '60px', right: '60px', top: '40px', bottom: '40px' }}>
                  {/* Background grid */}
                  <div className="absolute inset-0 bg-white border border-gray-300">
                    {/* Vertical grid lines */}
                    {[...Array(config.matrixSize - 1)].map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute border-l border-gray-200"
                        style={{
                          left: `${((i + 1) / config.matrixSize) * 100}%`,
                          top: 0,
                          bottom: 0
                        }}
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {[...Array(config.matrixSize - 1)].map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute border-t border-gray-200"
                        style={{
                          top: `${((i + 1) / config.matrixSize) * 100}%`,
                          left: 0,
                          right: 0
                        }}
                      />
                    ))}
                  </div>

                  {/* Y-axis labels */}
                  <div className="absolute -left-8 inset-y-0 flex flex-col justify-between py-1">
                    {[...Array(config.matrixSize)].map((_, i) => (
                      <div key={i} className="text-xs font-medium text-gray-700 text-right">
                        {config.matrixSize - i}
                      </div>
                    ))}
                  </div>

                  {/* X-axis labels */}
                  <div className="absolute inset-x-0 -bottom-6 flex justify-between px-1">
                    {[...Array(config.matrixSize)].map((_, i) => (
                      <div key={i} className="text-xs font-medium text-gray-700">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Risk bubbles */}
                  <div className="absolute inset-0">
                    {categoryRisks.length > 0 ? (
                      categoryRisks.map((risk) => {
                        const xPercent = ((risk.likelihood_residual - 1) / (config.matrixSize - 1)) * 100;
                        const yPercent = ((config.matrixSize - risk.impact_residual) / (config.matrixSize - 1)) * 100;
                        const bgColor = risk.residual_score >= 12 ? '#dc2626' :
                                       risk.residual_score >= 6 ? '#f97316' :
                                       risk.residual_score >= 3 ? '#facc15' : '#84cc16';

                        return (
                          <div
                            key={risk.risk_code}
                            className="absolute rounded-lg cursor-pointer transition-all hover:scale-110 hover:z-10 shadow-md hover:shadow-xl"
                            style={{
                              left: `${xPercent}%`,
                              top: `${yPercent}%`,
                              width: '60px',
                              height: '60px',
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: bgColor,
                              border: '2px solid white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                            }}
                            title={`${risk.risk_code}: ${risk.risk_title}\nL: ${risk.likelihood_residual}, I: ${risk.impact_residual}\nScore: ${risk.residual_score}`}
                          >
                            <div className="text-center">
                              <div className="text-xs font-bold text-white leading-tight">
                                {risk.risk_code}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        No risks in this category
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                {categoryRisks.length > 0 ? (
                  categoryRisks.map((risk) => (
                    <Card key={risk.risk_code} className="border-l-4" style={{
                      borderLeftColor: risk.residual_score >= 12 ? '#dc2626' :
                                      risk.residual_score >= 6 ? '#f97316' :
                                      risk.residual_score >= 3 ? '#facc15' : '#84cc16'
                    }}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">[{risk.risk_code}]</span>
                              <span className="font-semibold text-gray-800">{risk.risk_title}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{risk.risk_description}</p>
                          </div>
                          <Badge variant={risk.status === 'Open' ? 'destructive' : risk.status === 'In Progress' ? 'default' : 'secondary'}>
                            {risk.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 font-medium">Owner:</span>
                            <div className="text-gray-900">{risk.owner}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Division:</span>
                            <div className="text-gray-900">{risk.division}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Residual L×I:</span>
                            <div className="text-gray-900 font-semibold">
                              {risk.likelihood_residual} × {risk.impact_residual} = {risk.residual_score}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Inherent L×I:</span>
                            <div className="text-gray-400">
                              {risk.likelihood_inherent} × {risk.impact_inherent} = {risk.inherent_score}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No risks found in this category
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
