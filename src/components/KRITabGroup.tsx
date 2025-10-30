// src/components/KRITabGroup.tsx
// Grouped tab for Key Risk Indicators: Dashboard, Management, Data Entry, Alerts

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KRIDashboard } from './KRIDashboard';
import { KRIManagement } from './KRIManagement';
import { KRIDataEntry } from './KRIDataEntry';
import { KRIAlerts } from './KRIAlerts';

export type KRITabGroupProps = {
  showToast: (message: string, type?: 'success' | 'error') => void;
};

export function KRITabGroup({ showToast }: KRITabGroupProps) {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList>
        <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
        <TabsTrigger value="management">📋 Management</TabsTrigger>
        <TabsTrigger value="data">📈 Data Entry</TabsTrigger>
        <TabsTrigger value="alerts">🚨 Alerts</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <KRIDashboard />
      </TabsContent>

      <TabsContent value="management" className="space-y-4">
        <KRIManagement canEdit={true} />
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <KRIDataEntry />
      </TabsContent>

      <TabsContent value="alerts" className="space-y-4">
        <KRIAlerts />
      </TabsContent>
    </Tabs>
  );
}
