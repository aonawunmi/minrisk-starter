// src/components/KRIAlerts.tsx
// KRI Alerts - View and manage threshold breaches

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { loadKRIAlerts, loadKRIDefinitions, type KRIAlert, type KRIDefinition } from '@/lib/kri';

export function KRIAlerts() {
  const [alerts, setAlerts] = useState<KRIAlert[]>([]);
  const [kris, setKris] = useState<KRIDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadKRIAlerts(),
      loadKRIDefinitions(),
    ]).then(([alertsData, krisData]) => {
      setAlerts(alertsData);
      setKris(krisData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading alerts...</div>;
  }

  const getAlertColor = (level: string) => {
    return level === 'red'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">KRI Alerts</h2>

      <Card>
        <CardHeader>
          <CardTitle>All Alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No alerts</p>
              <p className="text-sm mt-2">Alerts will appear when KRIs breach thresholds</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const kri = kris.find(k => k.id === alert.kri_id);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getAlertColor(alert.alert_level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{kri?.kri_name || 'Unknown KRI'}</div>
                        <div className="text-sm mt-1">
                          Measured: <span className="font-semibold">{alert.measured_value}</span> |
                          Threshold: <span className="font-semibold">{alert.threshold_breached}</span>
                        </div>
                        <div className="text-xs mt-2">
                          Date: {new Date(alert.alert_date).toLocaleDateString()} |
                          Status: {alert.status}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        alert.alert_level === 'red' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        {alert.alert_level === 'red' ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
