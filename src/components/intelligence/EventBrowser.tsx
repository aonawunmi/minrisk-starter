// src/components/intelligence/EventBrowser.tsx
// Browse and manage stored external events

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  ExternalLink,
  Search,
  Trash2,
  Eye,
  Calendar,
  Globe,
  Tag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ExternalEvent } from '../../lib/riskIntelligence';

export function EventBrowser() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, categoryFilter, sourceFilter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_events')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.source_name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((e) => e.event_category === categoryFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((e) => e.source_name === sourceFilter);
    }

    setFilteredEvents(filtered);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    setDeleting(eventId);
    try {
      const { error } = await supabase
        .from('external_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Remove from local state
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    } finally {
      setDeleting(null);
    }
  };

  const handleViewDetails = (event: ExternalEvent) => {
    setSelectedEvent(event);
    setShowDetailDialog(true);
  };

  const handleClearUnanalyzed = async () => {
    if (!confirm(
      'This will delete all events that haven\'t been analyzed yet. ' +
      'Events that have been analyzed and created alerts will NOT be deleted. Continue?'
    )) return;

    setClearing(true);
    setClearMessage('Clearing unanalyzed events...');

    try {
      const response = await fetch('/api/scan-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearUnanalyzed',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setClearMessage(`✅ Cleared ${result.events_cleared} unanalyzed events`);
        setTimeout(() => {
          loadEvents();
          setClearMessage('');
        }, 2000);
      } else {
        setClearMessage(`❌ Failed: ${result.error}`);
        setTimeout(() => setClearMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error clearing events:', error);
      setClearMessage('❌ Error clearing events. Check console for details.');
      setTimeout(() => setClearMessage(''), 5000);
    } finally {
      setClearing(false);
    }
  };

  const uniqueSources = [...new Set(events.map((e) => e.source_name))].sort();
  const categories = ['all', 'cybersecurity', 'regulatory', 'market', 'environmental', 'operational', 'other'];

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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading events...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Browser</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearUnanalyzed}
                disabled={clearing}
                title="Delete all unanalyzed events (keeps analyzed events)"
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Unanalyzed
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={loadEvents}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Browse and manage stored news events ({filteredEvents.length} of {events.length})
          </p>
          {clearMessage && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              {clearMessage}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Events List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Globe className="h-3 w-3" />
                      <span>{event.source_name}</span>
                      <span>•</span>
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(event.published_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{event.country}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetails(event)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(event.source_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(event.id)}
                      disabled={deleting === event.id}
                    >
                      {deleting === event.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {event.description}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getCategoryColor(event.event_category)}>
                    {event.event_category}
                  </Badge>

                  {event.keywords && event.keywords.slice(0, 3).map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}

                  {event.keywords && event.keywords.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{event.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No events found</p>
                {(searchQuery || categoryFilter !== 'all' || sourceFilter !== 'all') && (
                  <p className="text-xs mt-1">Try adjusting your filters</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Globe className="h-4 w-4" />
                <span>{selectedEvent?.source_name}</span>
                <span>•</span>
                <Calendar className="h-4 w-4" />
                <span>
                  {selectedEvent?.published_date &&
                    new Date(selectedEvent.published_date).toLocaleDateString()}
                </span>
                <span>•</span>
                <span>{selectedEvent?.country}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Category</h4>
              <Badge className={getCategoryColor(selectedEvent?.event_category || '')}>
                {selectedEvent?.event_category}
              </Badge>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-gray-700">{selectedEvent?.description}</p>
            </div>

            {/* Keywords */}
            {selectedEvent?.keywords && selectedEvent.keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Risk Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.keywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source URL */}
            {selectedEvent?.source_url && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Source</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedEvent.source_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original Article
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
