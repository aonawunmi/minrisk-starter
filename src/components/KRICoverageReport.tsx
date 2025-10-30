// src/components/KRICoverageReport.tsx
// KRI Coverage Analysis Report - Shows which risks have KRI monitoring

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import {
  getKRICoverageAnalysis,
  type KRICoverageAnalysis,
} from '@/lib/kri';

export function KRICoverageReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<KRICoverageAnalysis[]>([]);

  useEffect(() => {
    loadCoverageData();
  }, []);

  const loadCoverageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getKRICoverageAnalysis();
      setCoverage(data);
    } catch (err) {
      console.error('Failed to load KRI coverage:', err);
      setError('Failed to load KRI coverage analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Loading coverage analysis...</p>
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

  const noCoverage = coverage.filter(c => c.coverage_status === 'No Coverage');
  const basicCoverage = coverage.filter(c => c.coverage_status === 'Basic Coverage');
  const goodCoverage = coverage.filter(c => c.coverage_status === 'Good Coverage');

  const getCoverageIcon = (status: string) => {
    switch (status) {
      case 'Good Coverage':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'Basic Coverage':
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getCoverageBadgeColor = (status: string) => {
    switch (status) {
      case 'Good Coverage':
        return 'bg-green-100 text-green-800';
      case 'Basic Coverage':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">No KRI Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{noCoverage.length}</div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">High priority for KRI setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Basic Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-600">{basicCoverage.length}</div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">1 KRI monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Good Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{goodCoverage.length}</div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">2+ KRIs monitoring</p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Risk-KRI Coverage Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {coverage.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No risks found in register</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coverage.map((item) => (
                <div
                  key={item.risk_id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getCoverageIcon(item.coverage_status)}
                      <span className="font-semibold text-sm">
                        {item.risk_code} - {item.risk_title}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600 mb-2">
                      <span>Category: {item.risk_category || 'N/A'}</span>
                      <span>L: {item.inherent_likelihood || 'N/A'}</span>
                      <span>I: {item.inherent_impact || 'N/A'}</span>
                    </div>
                    {item.kri_count > 0 && item.linked_kri_codes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.linked_kri_codes.map((code, idx) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}: {item.linked_kri_names?.[idx]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCoverageBadgeColor(item.coverage_status)}`}>
                      {item.coverage_status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.kri_count} KRI{item.kri_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {noCoverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm font-medium text-orange-900">
                  {noCoverage.length} risk{noCoverage.length !== 1 ? 's' : ''} without KRI monitoring
                </p>
                <p className="text-xs text-orange-800 mt-1">
                  Consider creating KRIs for high-impact risks: {noCoverage.slice(0, 3).map(r => r.risk_code).join(', ')}
                  {noCoverage.length > 3 && ` and ${noCoverage.length - 3} more`}
                </p>
              </div>
              {basicCoverage.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-900">
                    {basicCoverage.length} risk{basicCoverage.length !== 1 ? 's' : ''} with only 1 KRI
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Consider adding additional KRIs for more comprehensive monitoring
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">High-Impact Risks</p>
                <p className="text-gray-600 text-xs">Should have 2-3 KRIs for comprehensive monitoring</p>
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Leading Indicators</p>
                <p className="text-gray-600 text-xs">Prioritize leading KRIs for early warning</p>
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Regular Reviews</p>
                <p className="text-gray-600 text-xs">Review KRI coverage quarterly to identify gaps</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
