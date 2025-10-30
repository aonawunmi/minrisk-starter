// src/components/KRITabGroup.tsx
// Grouped tab for Key Risk Indicators: Management, Data Entry, Dashboard, Alerts

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type KRITabGroupProps = {
  KRIManagementContent: React.ReactNode;
  DataEntryContent: React.ReactNode;
  DashboardContent: React.ReactNode;
  AlertsContent: React.ReactNode;
  canEdit: boolean;
};

export function KRITabGroup({
  KRIManagementContent,
  DataEntryContent,
  DashboardContent,
  AlertsContent,
  canEdit,
}: KRITabGroupProps) {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList>
        <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
        <TabsTrigger value="management">📋 KRI Management</TabsTrigger>
        <TabsTrigger value="data">📈 Data Entry</TabsTrigger>
        <TabsTrigger value="alerts">🚨 Alerts</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        {DashboardContent}
      </TabsContent>

      <TabsContent value="management" className="space-y-4">
        {KRIManagementContent}
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        {DataEntryContent}
      </TabsContent>

      <TabsContent value="alerts" className="space-y-4">
        {AlertsContent}
      </TabsContent>
    </Tabs>
  );
}
