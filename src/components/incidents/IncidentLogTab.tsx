// src/components/incidents/IncidentLogTab.tsx
// Main Incidents Log Tab Component

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Link as LinkIcon,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { loadIncidents, getIncidentStatistics, type Incident, type IncidentStatus, type IncidentType } from '@/lib/incidents';
import { IncidentForm } from './IncidentForm';
import { IncidentDetailDialog } from './IncidentDetailDialog';

// =====================================================
// TYPES
// =====================================================

type SortConfig = {
  key: keyof Incident | 'severity';
  direction: 'asc' | 'desc';
};

type FilterConfig = {
  status: IncidentStatus | 'all';
  type: IncidentType | 'all';
  severity: number | 'all';
  hasLinkedRisks: boolean | 'all';
  dateFrom?: string;
  dateTo?: string;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const getSeverityColor = (severity: number): string => {
  switch (severity) {
    case 5: return 'bg-red-600 text-white';
    case 4: return 'bg-orange-500 text-white';
    case 3: return 'bg-yellow-400 text-gray-900';
    case 2: return 'bg-blue-400 text-white';
    case 1: return 'bg-green-400 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

const getStatusIcon = (status: IncidentStatus) => {
  switch (status) {
    case 'Reported': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'Under Investigation': return <Clock className="h-4 w-4 text-blue-600" />;
    case 'Resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'Closed': return <XCircle className="h-4 w-4 text-gray-600" />;
    default: return null;
  }
};

const formatCurrency = (amount: number | undefined): string => {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// =====================================================
// MAIN COMPONENT
// =====================================================

type IncidentLogTabProps = {
  onRisksUpdate?: () => void;
};

export function IncidentLogTab({ onRisksUpdate }: IncidentLogTabProps = {}) {
  // State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'incident_date', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: 'all',
    type: 'all',
    severity: 'all',
    hasLinkedRisks: 'all',
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Load incidents
  useEffect(() => {
    loadIncidentsData();
    loadStatistics();
  }, []);

  const loadIncidentsData = async () => {
    setLoading(true);
    const { data, error } = await loadIncidents();
    if (error) {
      console.error('Error loading incidents:', error);
    } else if (data) {
      setIncidents(data);
    }
    setLoading(false);
  };

  const loadStatistics = async () => {
    const { data, error } = await getIncidentStatistics();
    if (data) {
      setStatistics(data);
    }
  };

  // Filter and sort incidents
  const filteredAndSortedIncidents = useMemo(() => {
    let filtered = incidents;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        inc =>
          inc.title.toLowerCase().includes(query) ||
          inc.description.toLowerCase().includes(query) ||
          inc.incident_code.toLowerCase().includes(query) ||
          inc.reported_by?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterConfig.status !== 'all') {
      filtered = filtered.filter(inc => inc.status === filterConfig.status);
    }

    // Type filter
    if (filterConfig.type !== 'all') {
      filtered = filtered.filter(inc => inc.incident_type === filterConfig.type);
    }

    // Severity filter
    if (filterConfig.severity !== 'all') {
      filtered = filtered.filter(inc => inc.severity === filterConfig.severity);
    }

    // Linked risks filter
    if (filterConfig.hasLinkedRisks === true) {
      filtered = filtered.filter(inc => inc.linked_risk_codes && inc.linked_risk_codes.length > 0);
    } else if (filterConfig.hasLinkedRisks === false) {
      filtered = filtered.filter(inc => !inc.linked_risk_codes || inc.linked_risk_codes.length === 0);
    }

    // Date range filter
    if (filterConfig.dateFrom) {
      filtered = filtered.filter(inc => new Date(inc.incident_date) >= new Date(filterConfig.dateFrom!));
    }
    if (filterConfig.dateTo) {
      filtered = filtered.filter(inc => new Date(inc.incident_date) <= new Date(filterConfig.dateTo!));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Incident];
      const bVal = b[sortConfig.key as keyof Incident];

      if (sortConfig.key === 'severity') {
        return sortConfig.direction === 'asc' ? a.severity - b.severity : b.severity - a.severity;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [incidents, searchQuery, filterConfig, sortConfig]);

  // Handle incident created/updated
  const handleIncidentSaved = () => {
    setShowCreateDialog(false);
    setSelectedIncident(null);
    loadIncidentsData();
    loadStatistics();
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['Code', 'Title', 'Date', 'Type', 'Severity', 'Status', 'Financial Impact', 'Linked Risks'];
    const rows = filteredAndSortedIncidents.map(inc => [
      inc.incident_code,
      inc.title,
      formatDate(inc.incident_date),
      inc.incident_type,
      inc.severity.toString(),
      inc.status,
      inc.financial_impact ? formatCurrency(inc.financial_impact) : 'N/A',
      inc.linked_risk_codes.join(', ') || 'None',
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open/In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(statistics.by_status['Reported'] || 0) + (statistics.by_status['Under Investigation'] || 0)}
                  </p>
                </div>
                <Clock className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Severity</p>
                  <p className="text-3xl font-bold text-red-600">
                    {(statistics.by_severity[5] || 0) + (statistics.by_severity[4] || 0)}
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Financial Impact</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(statistics.total_financial_impact)}
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incidents Log
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Incident
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Report New Incident</DialogTitle>
                  </DialogHeader>
                  <IncidentForm onSaved={handleIncidentSaved} onCancel={() => setShowCreateDialog(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterConfig.status} onValueChange={v => setFilterConfig({ ...filterConfig, status: v as any })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Reported">Reported</SelectItem>
                <SelectItem value="Under Investigation">Investigating</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterConfig.type} onValueChange={v => setFilterConfig({ ...filterConfig, type: v as any })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Loss Event">Loss Event</SelectItem>
                <SelectItem value="Near Miss">Near Miss</SelectItem>
                <SelectItem value="Control Failure">Control Failure</SelectItem>
                <SelectItem value="Breach">Breach</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterConfig.severity === 'all' ? 'all' : filterConfig.severity.toString()}
              onValueChange={v => setFilterConfig({ ...filterConfig, severity: v === 'all' ? 'all' : parseInt(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="5">Critical (5)</SelectItem>
                <SelectItem value="4">High (4)</SelectItem>
                <SelectItem value="3">Medium (3)</SelectItem>
                <SelectItem value="2">Low (2)</SelectItem>
                <SelectItem value="1">Minimal (1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredAndSortedIncidents.length} of {incidents.length} incidents
            </span>
            {(searchQuery || filterConfig.status !== 'all' || filterConfig.type !== 'all' || filterConfig.severity !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterConfig({ status: 'all', type: 'all', severity: 'all', hasLinkedRisks: 'all' });
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Incidents Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Risks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {incidents.length === 0 ? (
                          <div className="space-y-2">
                            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto" />
                            <p className="font-medium">No incidents reported yet</p>
                            <p className="text-sm">Click "New Incident" to report your first incident</p>
                          </div>
                        ) : (
                          'No incidents match your filters'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedIncidents.map(incident => (
                      <tr
                        key={incident.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">{incident.incident_code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{incident.title}</div>
                          {incident.department && (
                            <div className="text-xs text-gray-500">{incident.department}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(incident.incident_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {incident.incident_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(incident.status)}
                            <span className="text-sm text-gray-700">{incident.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {incident.financial_impact ? formatCurrency(incident.financial_impact) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {incident.linked_risk_codes && incident.linked_risk_codes.length > 0 ? (
                            <div className="flex items-center gap-1 text-sm">
                              <LinkIcon className="h-3 w-3 text-blue-500" />
                              <span className="text-blue-600 font-medium">{incident.linked_risk_codes.length}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      {selectedIncident && (
        <IncidentDetailDialog
          incident={selectedIncident}
          open={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdate={loadIncidentsData}
          onRisksUpdate={onRisksUpdate}
        />
      )}
    </div>
  );
}
