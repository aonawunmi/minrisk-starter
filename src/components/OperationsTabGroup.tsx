// src/components/OperationsTabGroup.tsx
// Grouped tab for Incidents, Intelligence, and History

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type OperationsTabGroupProps = {
  IncidentsContent: React.ReactNode;
  IntelligenceContent: React.ReactNode;
  HistoryContent: React.ReactNode;
};

export function OperationsTabGroup({
  IncidentsContent,
  IntelligenceContent,
  HistoryContent,
}: OperationsTabGroupProps) {
  return (
    <Tabs defaultValue="incidents" className="w-full">
      <TabsList>
        <TabsTrigger value="incidents">🚨 Incidents</TabsTrigger>
        <TabsTrigger value="intelligence">🧠 Intelligence</TabsTrigger>
        <TabsTrigger value="history">📜 History</TabsTrigger>
      </TabsList>

      <TabsContent value="incidents" className="space-y-4">
        {IncidentsContent}
      </TabsContent>

      <TabsContent value="intelligence" className="space-y-4">
        {IntelligenceContent}
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        {HistoryContent}
      </TabsContent>
    </Tabs>
  );
}
