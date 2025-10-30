// src/components/UserKRIView.tsx
// User-facing KRI view - Users can view KRIs and enter their own data

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KRIDashboard } from './KRIDashboard';
import { KRIDataEntry } from './KRIDataEntry';
import { KRIAlerts } from './KRIAlerts';

export function UserKRIView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Key Risk Indicators</h1>
        <p className="text-gray-600 mt-2">
          Track and monitor your personal KRI measurements. Your data is private and isolated from other users.
        </p>
      </div>

      <Tabs defaultValue="dataentry" className="w-full">
        <TabsList>
          <TabsTrigger value="dataentry">📈 Data Entry</TabsTrigger>
          <TabsTrigger value="dashboard">📊 My Dashboard</TabsTrigger>
          <TabsTrigger value="alerts">🚨 My Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="dataentry" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Record Your KRI Measurements</h3>
            <p className="text-sm text-blue-800">
              Select a KRI below and enter your personal measurement data. The system will automatically
              calculate alert status based on configured thresholds. Your entries are private to you.
            </p>
          </div>
          <KRIDataEntry />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Your KRI Overview</h3>
            <p className="text-sm text-blue-800">
              View your personal KRI metrics, trends, and performance indicators. This dashboard shows only your data.
            </p>
          </div>
          <KRIDashboard />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Your Active Alerts</h3>
            <p className="text-sm text-blue-800">
              Your KRIs that have breached warning or critical thresholds require attention.
            </p>
          </div>
          <KRIAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
