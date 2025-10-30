// src/components/AnalyticsTabGroup.tsx
// Grouped tab for Analytics, VaR Sandbox, and Reports

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AnalyticsTabGroupProps = {
  AnalyticsContent: React.ReactNode;
  VarSandboxContent: React.ReactNode;
  RiskReportContent: React.ReactNode;
};

export function AnalyticsTabGroup({
  AnalyticsContent,
  VarSandboxContent,
  RiskReportContent,
}: AnalyticsTabGroupProps) {
  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList>
        <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
        <TabsTrigger value="var">📈 VaR Sandbox</TabsTrigger>
        <TabsTrigger value="reports">📋 Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-4">
        {AnalyticsContent}
      </TabsContent>

      <TabsContent value="var" className="space-y-4">
        {VarSandboxContent}
      </TabsContent>

      <TabsContent value="reports" className="space-y-4">
        {RiskReportContent}
      </TabsContent>
    </Tabs>
  );
}
