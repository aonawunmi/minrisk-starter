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
        <h1 className="text-3xl font-bold">Key Risk Indicators</h1>
        <p className="text-gray-600 mt-2">
          Monitor and record measurements for key risk indicators in your organization
        </p>
      </div>

      <Tabs defaultValue="dataentry" className="w-full">
        <TabsList>
          <TabsTrigger value="dataentry">📈 Data Entry</TabsTrigger>
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="alerts">🚨 My Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="dataentry" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Record KRI Measurements</h3>
            <p className="text-sm text-blue-800">
              Select a KRI below and enter your measurement data. The system will automatically
              calculate alert status based on configured thresholds.
            </p>
          </div>
          <KRIDataEntry />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">KRI Overview</h3>
            <p className="text-sm text-blue-800">
              View organization-wide KRI metrics, trends, and performance indicators.
            </p>
          </div>
          <KRIDashboard />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Active Alerts</h3>
            <p className="text-sm text-blue-800">
              KRIs that have breached warning or critical thresholds require attention.
            </p>
          </div>
          <KRIAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
