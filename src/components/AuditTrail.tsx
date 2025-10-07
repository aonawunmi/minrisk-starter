// src/components/AuditTrail.tsx
// Audit Trail component for ADMIN

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, RefreshCw, Filter, Eye, Download } from 'lucide-react';
import { loadAuditTrail, type AuditTrailEntry } from '@/lib/archive';

// Helper component to display risk details in a formatted way
function RiskDetailsCard({ title, data }: { title: string; data: any }) {
  if (!data) return null;

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h4 className="font-medium mb-3">{title}</h4>
      <div className="space-y-2 text-sm">
        {data.risk_code && (
          <div>
            <Label className="text-xs text-gray-500">Risk Code</Label>
            <p className="font-mono font-medium">{data.risk_code}</p>
          </div>
        )}
        {data.risk_title && (
          <div>
            <Label className="text-xs text-gray-500">Title</Label>
            <p className="font-medium">{data.risk_title}</p>
          </div>
        )}
        {data.risk_description && (
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <p className="text-gray-700">{data.risk_description}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {data.division && (
            <div>
              <Label className="text-xs text-gray-500">Division</Label>
              <p>{data.division}</p>
            </div>
          )}
          {data.department && (
            <div>
              <Label className="text-xs text-gray-500">Department</Label>
              <p>{data.department}</p>
            </div>
          )}
          {data.category && (
            <div>
              <Label className="text-xs text-gray-500">Category</Label>
              <p>{data.category}</p>
            </div>
          )}
          {data.owner && (
            <div>
              <Label className="text-xs text-gray-500">Owner</Label>
              <p>{data.owner}</p>
            </div>
          )}
          {data.likelihood_inherent && (
            <div>
              <Label className="text-xs text-gray-500">Likelihood (Inherent)</Label>
              <p className="font-medium">{data.likelihood_inherent}</p>
            </div>
          )}
          {data.impact_inherent && (
            <div>
              <Label className="text-xs text-gray-500">Impact (Inherent)</Label>
              <p className="font-medium">{data.impact_inherent}</p>
            </div>
          )}
          {data.status && (
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <p>{data.status}</p>
            </div>
          )}
          {data.is_priority !== undefined && (
            <div>
              <Label className="text-xs text-gray-500">Priority</Label>
              <p>{data.is_priority ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component to display control details in a formatted way
function ControlDetailsCard({ title, data }: { title: string; data: any }) {
  if (!data) return null;

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h4 className="font-medium mb-3">{title}</h4>
      <div className="space-y-2 text-sm">
        {data.description && (
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <p className="text-gray-700">{data.description}</p>
          </div>
        )}
        {data.target && (
          <div>
            <Label className="text-xs text-gray-500">Target</Label>
            <p className="font-medium">{data.target}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {data.design !== undefined && (
            <div>
              <Label className="text-xs text-gray-500">Design</Label>
              <p className="font-medium">{data.design}/3</p>
            </div>
          )}
          {data.implementation !== undefined && (
            <div>
              <Label className="text-xs text-gray-500">Implementation</Label>
              <p className="font-medium">{data.implementation}/3</p>
            </div>
          )}
          {data.monitoring !== undefined && (
            <div>
              <Label className="text-xs text-gray-500">Monitoring</Label>
              <p className="font-medium">{data.monitoring}/3</p>
            </div>
          )}
          {data.effectiveness_evaluation !== undefined && (
            <div>
              <Label className="text-xs text-gray-500">Effectiveness Evaluation</Label>
              <p className="font-medium">{data.effectiveness_evaluation}/3</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [riskCodeFilter, setRiskCodeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(100);

  const loadData = async () => {
    setLoading(true);
    try {
      const auditEntries = await loadAuditTrail(limit);
      setEntries(auditEntries);
      setFilteredEntries(auditEntries);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [limit]);

  // Apply filters
  useEffect(() => {
    let filtered = entries;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.entity_code?.toLowerCase().includes(query) ||
        e.user_email?.toLowerCase().includes(query) ||
        e.action_type.toLowerCase().includes(query) ||
        e.entity_type.toLowerCase().includes(query)
      );
    }

    // Risk code filter
    if (riskCodeFilter) {
      const query = riskCodeFilter.toLowerCase();
      filtered = filtered.filter(e => e.entity_code?.toLowerCase().includes(query));
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(e => e.user_email === userFilter);
    }

    // Action type filter
    if (actionTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.action_type === actionTypeFilter);
    }

    // Entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.entity_type === entityTypeFilter);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(e => new Date(e.performed_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(e => new Date(e.performed_at) <= end);
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, riskCodeFilter, userFilter, actionTypeFilter, entityTypeFilter, startDate, endDate]);

  const handleViewDetails = (entry: AuditTrailEntry) => {
    setSelectedEntry(entry);
    setShowDetailsDialog(true);
  };

  // CSV Export function
  const handleExportCSV = () => {
    const csvRows = [];
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity Code', 'User Email', 'Details'];
    csvRows.push(headers.join(','));

    filteredEntries.forEach(entry => {
      const row = [
        new Date(entry.performed_at).toLocaleString(),
        entry.action_type,
        entry.entity_type,
        entry.entity_code || '',
        entry.user_email || '',
        JSON.stringify(entry.new_values || entry.old_values || {}).replace(/"/g, '""') // Escape quotes
      ];
      csvRows.push(row.map(cell => `"${cell}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get unique action types, entity types, and users
  const actionTypes = ['all', ...Array.from(new Set(entries.map(e => e.action_type)))];
  const entityTypes = ['all', ...Array.from(new Set(entries.map(e => e.entity_type)))];
  const uniqueUsers = ['all', ...Array.from(new Set(entries.map(e => e.user_email).filter((email): email is string => Boolean(email))))];

  // Get action color
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'archive': return 'bg-orange-100 text-orange-800';
      case 'restore': return 'bg-purple-100 text-purple-800';
      case 'config_change': return 'bg-yellow-100 text-yellow-800';
      case 'user_approved': return 'bg-green-100 text-green-800';
      case 'user_rejected': return 'bg-red-100 text-red-800';
      case 'user_deleted': return 'bg-red-100 text-red-800';
      case 'request_deletion': return 'bg-orange-100 text-orange-800';
      case 'permanent_delete': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>
                Complete log of all system actions and changes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by user, code, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-code" className="text-xs">Risk Code</Label>
                <Input
                  id="risk-code"
                  placeholder="Filter by risk code..."
                  value={riskCodeFilter}
                  onChange={(e) => setRiskCodeFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-filter" className="text-xs">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger id="user-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueUsers.map(user => (
                      <SelectItem key={user} value={user}>
                        {user === 'all' ? 'All Users' : user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-type" className="text-xs">Action Type</Label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger id="action-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Actions' : type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-type" className="text-xs">Entity Type</Label>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger id="entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Entities' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit" className="text-xs">Load Limit</Label>
                <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                  <SelectTrigger id="limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">Last 50</SelectItem>
                    <SelectItem value="100">Last 100</SelectItem>
                  <SelectItem value="200">Last 200</SelectItem>
                  <SelectItem value="500">Last 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
            <p className="text-xs text-gray-500">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredEntries.filter(e => e.action_type === 'create').length}
            </div>
            <p className="text-xs text-gray-500">Created</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredEntries.filter(e => e.action_type === 'update').length}
            </div>
            <p className="text-xs text-gray-500">Updated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredEntries.filter(e => ['delete', 'archive', 'permanent_delete'].includes(e.action_type)).length}
            </div>
            <p className="text-xs text-gray-500">Deleted/Archived</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Trail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredEntries.length} of {entries.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Timestamp</th>
                  <th className="text-left p-2 font-medium">User</th>
                  <th className="text-left p-2 font-medium">Action</th>
                  <th className="text-left p-2 font-medium">Entity</th>
                  <th className="text-left p-2 font-medium">Entity Code</th>
                  <th className="text-center p-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs text-gray-600">
                      {new Date(entry.performed_at).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-xs">
                          {entry.user_email || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {entry.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${getActionColor(entry.action_type)}`}>
                        {entry.action_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="text-xs font-medium">{entry.entity_type}</span>
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {entry.entity_code || entry.entity_id?.slice(0, 8) || 'N/A'}
                    </td>
                    <td className="p-2">
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(entry)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No audit entries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
            <DialogDescription>
              {selectedEntry && new Date(selectedEntry.performed_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">User</Label>
                  <p className="font-medium">{selectedEntry.user_email || 'Unknown'}</p>
                  <p className="text-xs font-mono text-gray-500">{selectedEntry.user_id}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Action Type</Label>
                  <p>
                    <span className={`text-xs px-2 py-1 rounded ${getActionColor(selectedEntry.action_type)}`}>
                      {selectedEntry.action_type.replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Entity Type</Label>
                  <p className="font-medium">{selectedEntry.entity_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Entity Code/ID</Label>
                  <p className="font-mono text-sm">{selectedEntry.entity_code || selectedEntry.entity_id?.slice(0, 8) || 'N/A'}</p>
                </div>
              </div>

              {/* Risk/Control Details - Formatted View */}
              {selectedEntry.entity_type === 'risk' && (selectedEntry.old_values || selectedEntry.new_values) && (
                <div className="space-y-4">
                  {selectedEntry.action_type === 'update' && selectedEntry.old_values && selectedEntry.new_values ? (
                    // Show before/after comparison for updates
                    <div className="grid grid-cols-2 gap-4">
                      <RiskDetailsCard title="Previous Values" data={selectedEntry.old_values} />
                      <RiskDetailsCard title="New Values" data={selectedEntry.new_values} />
                    </div>
                  ) : (
                    // Show single view for create/delete
                    <RiskDetailsCard
                      title={selectedEntry.action_type === 'create' ? 'Created Risk' : selectedEntry.action_type === 'delete' ? 'Deleted Risk' : 'Risk Details'}
                      data={selectedEntry.new_values || selectedEntry.old_values}
                    />
                  )}
                </div>
              )}

              {/* Control Details */}
              {selectedEntry.entity_type === 'control' && (selectedEntry.old_values || selectedEntry.new_values) && (
                <div className="space-y-4">
                  {selectedEntry.action_type === 'update' && selectedEntry.old_values && selectedEntry.new_values ? (
                    <div className="grid grid-cols-2 gap-4">
                      <ControlDetailsCard title="Previous Values" data={selectedEntry.old_values} />
                      <ControlDetailsCard title="New Values" data={selectedEntry.new_values} />
                    </div>
                  ) : (
                    <ControlDetailsCard
                      title={selectedEntry.action_type === 'create' ? 'Created Control' : 'Control Details'}
                      data={selectedEntry.new_values || selectedEntry.old_values}
                    />
                  )}
                </div>
              )}

              {/* User Details */}
              {selectedEntry.entity_type === 'user' && (selectedEntry.new_values || selectedEntry.metadata) && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">User Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedEntry.new_values?.role && (
                      <div>
                        <Label className="text-xs text-gray-500">Role</Label>
                        <p className="font-medium capitalize">{selectedEntry.new_values.role}</p>
                      </div>
                    )}
                    {selectedEntry.new_values?.status && (
                      <div>
                        <Label className="text-xs text-gray-500">Status</Label>
                        <p className="font-medium capitalize">{selectedEntry.new_values.status}</p>
                      </div>
                    )}
                    {selectedEntry.metadata?.approved_by_email && (
                      <div>
                        <Label className="text-xs text-gray-500">Approved By</Label>
                        <p className="font-medium">{selectedEntry.metadata.approved_by_email}</p>
                      </div>
                    )}
                    {selectedEntry.metadata?.rejected_by_email && (
                      <div>
                        <Label className="text-xs text-gray-500">Rejected By</Label>
                        <p className="font-medium">{selectedEntry.metadata.rejected_by_email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata for other entity types */}
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 &&
               selectedEntry.entity_type !== 'risk' && selectedEntry.entity_type !== 'control' && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Additional Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedEntry.metadata).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</Label>
                        <p className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
