// src/components/intelligence/ScanResultsDialog.tsx
// Dialog to show detailed scan results with option to retain filtered items

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  CheckCircle2,
  XCircle,
  Filter,
  Copy,
  ExternalLink,
  Save,
  Loader2,
} from 'lucide-react';

type ScanResult = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source_name: string;
  source_category: string;
  country: string;
  category: string;
  keywords: string[];
  status: 'stored' | 'filtered' | 'duplicate' | 'error';
  reason: string | null;
  eventId?: string;
};

type ScanResultsDialogProps = {
  open: boolean;
  onClose: () => void;
  results: ScanResult[];
  stats: {
    feeds_processed: number;
    events_found: number;
    events_stored: number;
    events_filtered: number;
    events_duplicate: number;
    alerts_created: number;
  };
  onRetain: (item: ScanResult) => Promise<boolean>;
};

export function ScanResultsDialog({
  open,
  onClose,
  results,
  stats,
  onRetain,
}: ScanResultsDialogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'stored' | 'filtered' | 'duplicate'>('all');
  const [retaining, setRetaining] = useState<string | null>(null);

  const filteredResults = results.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const handleRetain = async (item: ScanResult) => {
    setRetaining(item.title);
    try {
      const success = await onRetain(item);
      if (success) {
        // Update the item status locally
        item.status = 'stored';
      }
    } finally {
      setRetaining(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stored':
        return (
          <Badge className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Stored
          </Badge>
        );
      case 'filtered':
        return (
          <Badge variant="secondary">
            <Filter className="h-3 w-3 mr-1" />
            Filtered
          </Badge>
        );
      case 'duplicate':
        return (
          <Badge variant="outline">
            <Copy className="h-3 w-3 mr-1" />
            Duplicate
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      cybersecurity: 'bg-red-100 text-red-800',
      regulatory: 'bg-blue-100 text-blue-800',
      market: 'bg-green-100 text-green-800',
      environmental: 'bg-emerald-100 text-emerald-800',
      operational: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Scan Results</DialogTitle>
          <DialogDescription>
            Detailed view of all scanned news items and their processing status
          </DialogDescription>
        </DialogHeader>

        {/* Statistics Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 py-3 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.feeds_processed}</div>
            <div className="text-xs text-gray-500">Feeds</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.events_found}</div>
            <div className="text-xs text-gray-500">Found</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.events_stored}</div>
            <div className="text-xs text-gray-500">Stored</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.events_filtered}</div>
            <div className="text-xs text-gray-500">Filtered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{stats.events_duplicate}</div>
            <div className="text-xs text-gray-500">Duplicate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.alerts_created}</div>
            <div className="text-xs text-gray-500">Alerts</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="all">
              All ({results.length})
            </TabsTrigger>
            <TabsTrigger value="stored">
              Stored ({results.filter((r) => r.status === 'stored').length})
            </TabsTrigger>
            <TabsTrigger value="filtered">
              Filtered ({results.filter((r) => r.status === 'filtered').length})
            </TabsTrigger>
            <TabsTrigger value="duplicate">
              Duplicate ({results.filter((r) => r.status === 'duplicate').length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-3 pr-2">
              {filteredResults.map((item, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{item.source_name}</span>
                        <span>•</span>
                        <span>{item.country}</span>
                        <span>•</span>
                        <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      {item.status === 'filtered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetain(item)}
                          disabled={retaining === item.title}
                        >
                          {retaining === item.title ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-1" />
                              Retain
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getCategoryColor(item.category)} variant="secondary">
                      {item.category}
                    </Badge>

                    {item.keywords && item.keywords.length > 0 && (
                      <>
                        {item.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {item.keywords.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{item.keywords.length - 3} more
                          </span>
                        )}
                      </>
                    )}

                    {item.reason && (
                      <span className="text-xs text-gray-500 italic ml-auto">
                        {item.reason}
                      </span>
                    )}

                    {item.link && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 ml-auto"
                        onClick={() => window.open(item.link, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredResults.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No items in this category
                </div>
              )}
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
