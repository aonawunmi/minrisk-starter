/**
 * Report Section Editor
 * Edit individual report sections with narrative and data
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Save, Eye, Edit2 } from 'lucide-react';
import { ReportSection } from '../../types/report-types';

interface ReportSectionEditorProps {
  section: ReportSection;
  isExpanded: boolean;
  isReadOnly: boolean;
  onToggleExpand: () => void;
  onNarrativeUpdate: (narrative: string) => void;
  onToggleIncluded: (included: boolean) => void;
}

export function ReportSectionEditor({
  section,
  isExpanded,
  isReadOnly,
  onToggleExpand,
  onNarrativeUpdate,
  onToggleIncluded,
}: ReportSectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState(section.narrative || '');

  function handleSave() {
    onNarrativeUpdate(editedNarrative);
    setIsEditing(false);
  }

  function handleCancel() {
    setEditedNarrative(section.narrative || '');
    setIsEditing(false);
  }

  return (
    <Card className={`${!section.included ? 'opacity-60' : ''}`}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {section.order}. {section.title}
              </h3>
              {section.last_edited_by && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last edited by {section.last_edited_by} on{' '}
                  {new Date(section.last_edited_at!).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`include-${section.id}`} className="text-sm">
                Include
              </Label>
              <Switch
                id={`include-${section.id}`}
                checked={section.included}
                onCheckedChange={onToggleIncluded}
                disabled={isReadOnly}
              />
            </div>
            {!isReadOnly && !isEditing && isExpanded && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Narrative */}
          {section.content_type !== 'table' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Narrative</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedNarrative}
                    onChange={(e) => setEditedNarrative(e.target.value)}
                    rows={8}
                    className="font-sans"
                    placeholder="Enter narrative text..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{section.narrative || 'No narrative provided'}</p>
                </div>
              )}
            </div>
          )}

          {/* Data Preview */}
          {section.data && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data</Label>
              <div className="rounded-lg border p-4 bg-muted/50 max-h-96 overflow-auto">
                {renderDataPreview(section.data, section.content_type)}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Render data preview based on content type
 */
function renderDataPreview(data: any, contentType: string): React.ReactNode {
  if (contentType === 'table' && Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

    // Render as simple table
    const keys = Object.keys(data[0]);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {keys.map((key) => (
                <th key={key} className="text-left p-2 font-medium">
                  {key.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="border-b">
                {keys.map((key) => (
                  <td key={key} className="p-2">
                    {String(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing 10 of {data.length} rows
          </p>
        )}
      </div>
    );
  } else if (typeof data === 'object') {
    // Render as key-value pairs
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-4">
            <span className="font-medium min-w-[150px]">{key.replace(/_/g, ' ')}:</span>
            <span className="text-muted-foreground">{JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
