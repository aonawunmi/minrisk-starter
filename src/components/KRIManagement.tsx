// src/components/KRIManagement.tsx
// KRI Management - CRUD operations for KRI definitions

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { loadKRIDefinitions, type KRIDefinition } from '@/lib/kri';

type KRIManagementProps = {
  canEdit: boolean;
};

export function KRIManagement({ canEdit }: KRIManagementProps) {
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKRIDefinitions().then(setKris).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading KRIs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KRI Definitions</h2>
        {canEdit && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add KRI
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active KRIs ({kris.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {kris.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No KRIs defined</p>
              <p className="text-sm mt-2">Click "Add KRI" to create your first indicator</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kris.map((kri) => (
                <div key={kri.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{kri.kri_code} - {kri.kri_name}</div>
                    <div className="text-sm text-gray-600">{kri.description}</div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Category: {kri.risk_category || 'N/A'}</span>
                      <span>Frequency: {kri.collection_frequency}</span>
                      <span>Unit: {kri.measurement_unit}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
