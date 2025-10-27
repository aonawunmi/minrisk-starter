// src/components/intelligence/RiskKeywordsManager.tsx
// Manage custom risk-related keywords for news filtering

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
  Tag,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type RiskKeyword = {
  id: string;
  keyword: string;
  category: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

export function RiskKeywordsManager() {
  const [keywords, setKeywords] = useState<RiskKeyword[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<RiskKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    keyword: '',
    category: 'general' as string,
  });

  const categories = [
    'financial',
    'cyber',
    'compliance',
    'operational',
    'environmental',
    'general',
  ];

  useEffect(() => {
    loadKeywords();
  }, []);

  useEffect(() => {
    filterKeywords();
  }, [keywords, searchQuery, categoryFilter]);

  const loadKeywords = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('risk_keywords')
        .select('*')
        .order('keyword');

      if (error) throw error;
      setKeywords(data || []);
    } catch (err: any) {
      console.error('Error loading keywords:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterKeywords = () => {
    let filtered = keywords;

    if (searchQuery) {
      filtered = filtered.filter((k) =>
        k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((k) => k.category === categoryFilter);
    }

    setFilteredKeywords(filtered);
  };

  const handleAdd = () => {
    setFormData({
      keyword: '',
      category: 'general',
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    // Validate
    if (!formData.keyword.trim()) {
      setError('Keyword is required');
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

      const { error } = await supabase
        .from('risk_keywords')
        .insert({
          organization_id: profile.organization_id,
          keyword: formData.keyword.toLowerCase().trim(),
          category: formData.category,
          is_active: true,
          is_default: false,
        });

      if (error) throw error;

      setShowAddDialog(false);
      loadKeywords();
    } catch (err: any) {
      console.error('Error saving keyword:', err);
      if (err.code === '23505') {
        setError('This keyword already exists');
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (keyword: RiskKeyword) => {
    try {
      const { error } = await supabase
        .from('risk_keywords')
        .update({ is_active: !keyword.is_active })
        .eq('id', keyword.id);

      if (error) throw error;
      loadKeywords();
    } catch (err: any) {
      console.error('Error toggling keyword:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (keywordId: string) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;

    setDeleting(keywordId);
    try {
      const { error} = await supabase
        .from('risk_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) throw error;
      loadKeywords();
    } catch (err: any) {
      console.error('Error deleting keyword:', err);
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      financial: 'bg-green-100 text-green-800',
      cyber: 'bg-red-100 text-red-800',
      compliance: 'bg-blue-100 text-blue-800',
      operational: 'bg-orange-100 text-orange-800',
      environmental: 'bg-emerald-100 text-emerald-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.general;
  };

  const getCategoryCount = (category: string) => {
    return keywords.filter((k) => k.category === category && k.is_active).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading keywords...</span>
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
              <CardTitle>Risk Keywords ({keywords.filter(k => k.is_active).length} active)</CardTitle>
              <CardDescription className="mt-1">
                Customize keywords used to identify risk-related news. Only active keywords are used.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={loadKeywords}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Keyword
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

          {/* Category Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
            {categories.map((cat) => (
              <div
                key={cat}
                className="text-center p-2 border rounded-lg cursor-pointer hover:border-purple-300"
                onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
              >
                <div className="text-lg font-bold">{getCategoryCount(cat)}</div>
                <div className="text-xs text-gray-500">{cat}</div>
              </div>
            ))}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search keywords..."
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
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({getCategoryCount(cat)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keywords List */}
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2">
            {filteredKeywords.map((keyword) => (
              <div
                key={keyword.id}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                  keyword.is_active
                    ? 'border-purple-200 bg-white'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <Tag className="h-3 w-3 text-gray-400" />
                <span className="text-sm font-medium">{keyword.keyword}</span>
                <Badge className={`${getCategoryColor(keyword.category)} text-xs`}>
                  {keyword.category}
                </Badge>

                {keyword.is_default && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}

                <button
                  onClick={() => handleToggleActive(keyword)}
                  className="ml-1 hover:opacity-70"
                  title={keyword.is_active ? 'Deactivate' : 'Activate'}
                >
                  {keyword.is_active ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-gray-400" />
                  )}
                </button>

                {!keyword.is_default && (
                  <button
                    onClick={() => handleDelete(keyword.id)}
                    disabled={deleting === keyword.id}
                    className="ml-1 hover:opacity-70"
                  >
                    {deleting === keyword.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="h-3 w-3 text-red-600" />
                    )}
                  </button>
                )}
              </div>
            ))}

            {filteredKeywords.length === 0 && (
              <div className="w-full text-center py-12 text-gray-500">
                <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No keywords found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try adjusting your search</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Risk Keyword</DialogTitle>
            <DialogDescription>
              Add a custom keyword to identify risk-related news articles
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
                Keyword *
              </label>
              <Input
                placeholder="e.g., money laundering, insider trading"
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase for better matching. Can be a phrase.
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
                'Add Keyword'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
