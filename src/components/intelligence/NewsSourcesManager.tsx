// src/components/intelligence/NewsSourcesManager.tsx
// Manage RSS news feed sources

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
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
  Plus,
  Trash2,
  Edit,
  Globe,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  country: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

export function NewsSourcesManager() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: 'business' as string,
    country: 'Nigeria',
  });

  const categories = [
    'regulatory',
    'market',
    'business',
    'cybersecurity',
    'environmental',
    'other',
  ];

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('news_sources')
        .select('*')
        .order('name');

      if (error) throw error;
      setSources(data || []);
    } catch (err: any) {
      console.error('Error loading sources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      url: '',
      category: 'business',
      country: 'Nigeria',
    });
    setShowAddDialog(true);
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      category: source.category,
      country: source.country,
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    // Validate
    if (!formData.name || !formData.url) {
      setError('Name and URL are required');
      return;
    }

    if (!formData.url.startsWith('http')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Get user's organization_id
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      if (editingSource) {
        // Update existing
        const { error } = await supabase
          .from('news_sources')
          .update({
            name: formData.name,
            url: formData.url,
            category: formData.category,
            country: formData.country,
          })
          .eq('id', editingSource.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('news_sources')
          .insert({
            organization_id: profile.organization_id,
            name: formData.name,
            url: formData.url,
            category: formData.category,
            country: formData.country,
            is_active: true,
            is_default: false,
          });

        if (error) throw error;
      }

      setShowAddDialog(false);
      loadSources();
    } catch (err: any) {
      console.error('Error saving source:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (source: NewsSource) => {
    try {
      const { error } = await supabase
        .from('news_sources')
        .update({ is_active: !source.is_active })
        .eq('id', source.id);

      if (error) throw error;
      loadSources();
    } catch (err: any) {
      console.error('Error toggling source:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this news source?')) return;

    setDeleting(sourceId);
    try {
      const { error } = await supabase
        .from('news_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
      loadSources();
    } catch (err: any) {
      console.error('Error deleting source:', err);
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      regulatory: 'bg-blue-100 text-blue-800',
      market: 'bg-green-100 text-green-800',
      business: 'bg-purple-100 text-purple-800',
      cybersecurity: 'bg-red-100 text-red-800',
      environmental: 'bg-emerald-100 text-emerald-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading sources...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>News Sources ({sources.length})</CardTitle>
              <CardDescription className="mt-1">
                Manage RSS feed URLs for news scanning. Only active sources are scanned.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={loadSources}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`border rounded-lg p-4 transition-colors ${
                  source.is_active
                    ? 'border-purple-200 bg-white'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm text-gray-900">
                        {source.name}
                      </h4>
                      {source.is_default && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                      <Badge
                        className={`text-xs ${
                          source.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {source.is_active ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Globe className="h-3 w-3" />
                      <span className="font-mono truncate max-w-md">
                        {source.url}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(source.category)}>
                        {source.category}
                      </Badge>
                      <span className="text-xs text-gray-500">{source.country}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(source)}
                      title={source.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {source.is_active ? (
                        <X className="h-4 w-4 text-orange-600" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(source)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!source.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(source.id)}
                        disabled={deleting === source.id}
                      >
                        {deleting === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Globe className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No news sources configured</p>
                <p className="text-xs mt-1">Add your first RSS feed URL to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit News Source' : 'Add News Source'}
            </DialogTitle>
            <DialogDescription>
              Add an RSS feed URL to scan for risk-related news
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">
                Source Name *
              </label>
              <Input
                placeholder="e.g., Bloomberg Markets"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                RSS Feed URL *
              </label>
              <Input
                placeholder="https://example.com/feed.xml"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be a valid RSS or Atom feed URL
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Country</label>
              <Input
                placeholder="e.g., Nigeria, Global"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Source'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
