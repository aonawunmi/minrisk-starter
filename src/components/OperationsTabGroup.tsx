// src/components/OperationsTabGroup.tsx
// Grouped tab for Incidents, Intelligence, and History

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type OperationsTabGroupProps = {
  IncidentsContent: React.ReactNode;
  IntelligenceContent: React.ReactNode;
  HistoryContent: React.ReactNode;
  isSuperAdmin?: boolean; // Hide editable tabs for Super Admin
};

export function OperationsTabGroup({
  IncidentsContent,
  IntelligenceContent,
  HistoryContent,
  isSuperAdmin = false,
}: OperationsTabGroupProps) {
  // Super Admin only sees History (read-only)
  // Regular users see all tabs
  const defaultTab = isSuperAdmin ? "history" : "incidents";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList>
        {!isSuperAdmin && <TabsTrigger value="incidents">🚨 Incidents</TabsTrigger>}
        {!isSuperAdmin && <TabsTrigger value="intelligence">🧠 Intelligence</TabsTrigger>}
        <TabsTrigger value="history">📜 History</TabsTrigger>
      </TabsList>

      {!isSuperAdmin && (
        <TabsContent value="incidents" className="space-y-4">
          {IncidentsContent}
        </TabsContent>
      )}

      {!isSuperAdmin && (
        <TabsContent value="intelligence" className="space-y-4">
          {IntelligenceContent}
        </TabsContent>
      )}

      <TabsContent value="history" className="space-y-4">
        {HistoryContent}
      </TabsContent>
    </Tabs>
  );
}
