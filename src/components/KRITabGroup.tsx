// src/components/KRITabGroup.tsx
// Grouped tab for Key Risk Indicators: Dashboard, Management, Data Entry, Alerts, Coverage

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KRIDashboard } from './KRIDashboard';
import { KRIManagement } from './KRIManagement';
import { KRIDataEntry } from './KRIDataEntry';
import { KRIAlerts } from './KRIAlerts';
import { KRICoverageReport } from './KRICoverageReport';

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
        <TabsTrigger value="coverage">🎯 Coverage</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-900 mb-1">Admin View: Consolidated Organization Data</h3>
          <p className="text-sm text-green-800">
            As an admin, you can view aggregated KRI metrics from all users across your organization. Users see only their own isolated data.
          </p>
        </div>
        <KRIDashboard />
      </TabsContent>

      <TabsContent value="management" className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-900 mb-1">Admin: Define KRIs for Organization</h3>
          <p className="text-sm text-green-800">
            Create and manage KRI definitions that all users can track. Users will enter their own measurements independently.
          </p>
        </div>
        <KRIManagement canEdit={true} />
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-900 mb-1">Admin: Your Personal KRI Data Entry</h3>
          <p className="text-sm text-green-800">
            Enter your own KRI measurements. This is your personal data entry area, isolated from other users.
          </p>
        </div>
        <KRIDataEntry />
      </TabsContent>

      <TabsContent value="alerts" className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-900 mb-1">Admin View: All Organization Alerts</h3>
          <p className="text-sm text-green-800">
            View threshold breaches from all users across the organization. Users see only their own alerts.
          </p>
        </div>
        <KRIAlerts />
      </TabsContent>

      <TabsContent value="coverage" className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-1">KRI Coverage Analysis: Gap Detection</h3>
          <p className="text-sm text-blue-800">
            Identify which risks in your register have KRI monitoring and which need additional coverage. Ensure all high-impact risks are being monitored effectively.
          </p>
        </div>
        <KRICoverageReport />
      </TabsContent>
    </Tabs>
  );
}
