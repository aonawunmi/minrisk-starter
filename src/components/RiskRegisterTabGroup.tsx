// src/components/RiskRegisterTabGroup.tsx
// Grouped tab for Risk Register, Controls, Heat Map, and Import

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProcessedRisk, AppConfig } from '@/App';

type RiskRegisterTabGroupProps = {
  canEdit: boolean;
  RiskRegisterContent: React.ReactNode;
  ControlRegisterContent: React.ReactNode;
  HeatMapContent: React.ReactNode;
  ImportContent: React.ReactNode;
};

export function RiskRegisterTabGroup({
  RiskRegisterContent,
  ControlRegisterContent,
  HeatMapContent,
  ImportContent,
  canEdit,
}: RiskRegisterTabGroupProps) {
  return (
    <Tabs defaultValue="register" className="w-full">
      <TabsList>
        <TabsTrigger value="register">📋 Register</TabsTrigger>
        <TabsTrigger value="controls">🛡️ Controls</TabsTrigger>
        <TabsTrigger value="heatmap">🔥 Heat Map</TabsTrigger>
        <TabsTrigger value="import">📥 Import</TabsTrigger>
      </TabsList>

      <TabsContent value="register" className="space-y-4">
        {RiskRegisterContent}
      </TabsContent>

      <TabsContent value="controls" className="space-y-4">
        {ControlRegisterContent}
      </TabsContent>

      <TabsContent value="heatmap" className="space-y-4">
        {HeatMapContent}
      </TabsContent>

      <TabsContent value="import" className="space-y-4">
        {ImportContent}
      </TabsContent>
    </Tabs>
  );
}
