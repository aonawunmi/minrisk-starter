// src/components/KRIDataEntry.tsx
// KRI Data Entry - Record KRI measurements

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export function KRIDataEntry() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">KRI Data Entry</h2>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record KRI Measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p>Data entry form will be implemented here</p>
            <p className="text-sm mt-2">Select a KRI and enter measurement values</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
