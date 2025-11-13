import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { FileText, Plus, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface ReportDraft {
  id: string;
  audience: 'board' | 'ceo' | 'regulator';
  regulator_type?: string;
  period: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
}

interface ReportsListProps {
  organizationId: string;
  userId: string;
  onCreateNew: () => void;
  onOpenReport: (reportId: string) => void;
}

export function ReportsList({ organizationId, userId, onCreateNew, onOpenReport }: ReportsListProps) {
  const [reports, setReports] = useState<ReportDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [organizationId]);

  async function loadReports() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_drafts')
        .select('id, audience, regulator_type, period, created_at, updated_at, status')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setReports(data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  function getReportTypeLabel(report: ReportDraft): string {
    if (report.audience === 'board') return 'Board Report';
    if (report.audience === 'ceo') return 'CEO Report';
    if (report.audience === 'regulator') {
      return report.regulator_type ? `${report.regulator_type} Report` : 'Regulator Report';
    }
    return 'Report';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'draft': return <Clock className="h-3 w-3 mr-1" />;
      case 'in_review': return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'approved': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'published': return <CheckCircle className="h-3 w-3 mr-1" />;
      default: return null;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Reports</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadReports} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ERM Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage your Board, CEO, and Regulator reports
          </p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h3>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Get started by generating your first report. You can create Board reports, CEO reports,
              or regulatory reports for CBN, SEC, or PENCOM.
            </p>
            <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Generate Your First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <CardTitle className="text-lg">{getReportTypeLabel(report)}</CardTitle>
                  </div>
                  <Badge className={`${getStatusColor(report.status)} flex items-center`}>
                    {getStatusIcon(report.status)}
                    {report.status}
                  </Badge>
                </div>
                <CardDescription>
                  Period: {report.period}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Created: {formatDate(report.created_at)}
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated: {formatDate(report.updated_at)}
                  </div>
                </div>
                <Button
                  onClick={() => onOpenReport(report.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
