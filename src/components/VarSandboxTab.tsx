// src/components/VarSandboxTab.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VarFileUpload } from './VarFileUpload';
import { VarResultsDisplay } from './VarResultsDisplay';
import { performVarCalculation, validateVarData } from '@/lib/varCalculations';
import { loadVarScaleConfig } from '@/lib/database';
import type { VarUploadData, VarResults, VarScaleConfig } from '@/lib/varTypes';

type VarSandboxTabProps = {
  matrixSize: 5 | 6;
  showToast: (message: string, type?: 'success' | 'error') => void;
};

export function VarSandboxTab({ matrixSize, showToast }: VarSandboxTabProps) {
  const [uploadedData, setUploadedData] = useState<VarUploadData | null>(null);
  const [results, setResults] = useState<VarResults | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<90 | 95 | 99 | 99.9>(95);
  const [timeHorizon, setTimeHorizon] = useState<number>(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [scaleConfig, setScaleConfig] = useState<VarScaleConfig>({
    organization_id: '',
    volatility_thresholds: [5, 10, 15, 20],
    value_thresholds: [10, 50, 100, 500]
  });

  // Load scale configuration from database
  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadVarScaleConfig();
      if (config) {
        setScaleConfig({
          organization_id: '',
          volatility_thresholds: config.volatility_thresholds,
          value_thresholds: config.value_thresholds
        });
      }
    };
    loadConfig();
  }, []);

  const handleUpload = (data: VarUploadData) => {
    setUploadedData(data);
    setResults(null);
    showToast('File uploaded successfully! Configure parameters and click Calculate VaR.', 'success');
  };

  const handleUploadError = (error: string) => {
    showToast(error, 'error');
  };

  const handleCalculateVaR = () => {
    if (!uploadedData) {
      showToast('Please upload a portfolio file first', 'error');
      return;
    }

    setIsCalculating(true);

    try {
      // Validate data
      const validation = validateVarData(
        uploadedData.holdings,
        uploadedData.priceHistory,
        uploadedData.config
      );

      if (!validation.valid) {
        showToast(validation.errors[0], 'error');
        setIsCalculating(false);
        return;
      }

      // Update config with selected parameters
      const updatedConfig = {
        ...uploadedData.config,
        confidence_level: confidenceLevel,
        time_horizon_days: timeHorizon
      };

      // Perform calculation
      const varResults = performVarCalculation(
        uploadedData.holdings,
        uploadedData.priceHistory,
        updatedConfig,
        scaleConfig,
        matrixSize
      );

      setResults(varResults);
      showToast('VaR calculation completed successfully!', 'success');
    } catch (error: any) {
      showToast(`Calculation error: ${error.message}`, 'error');
      console.error('VaR calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setUploadedData(null);
    setResults(null);
    setConfidenceLevel(95);
    setTimeHorizon(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📊 VaR Analysis Sandbox</h2>
          <p className="text-sm text-gray-600 mt-1">
            Calculate Value at Risk using variance-covariance method
          </p>
        </div>
      </div>

      {/* File Upload */}
      <VarFileUpload onUpload={handleUpload} onError={handleUploadError} />

      {/* Parameters Panel */}
      {uploadedData && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">⚙️ VaR Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Confidence Level
                </label>
                <Select
                  value={String(confidenceLevel)}
                  onValueChange={(v) => setConfidenceLevel(Number(v) as 90 | 95 | 99 | 99.9)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="95">95%</SelectItem>
                    <SelectItem value="99">99%</SelectItem>
                    <SelectItem value="99.9">99.9%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Time Horizon (days)
                </label>
                <Select
                  value={String(timeHorizon)}
                  onValueChange={(v) => setTimeHorizon(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="10">10 days</SelectItem>
                    <SelectItem value="21">21 days (1 month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Data Frequency
                </label>
                <Select value={uploadedData.config.data_frequency} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Detected from file</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleCalculateVaR}
                disabled={isCalculating}
                className="flex-1"
              >
                {isCalculating ? 'Calculating...' : 'Calculate VaR'}
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <>
          <div className="border-t pt-6">
            <h3 className="text-xl font-bold mb-4">
              📈 Results
              <span className="text-sm font-normal text-gray-500 ml-2">
                Last updated: {new Date().toLocaleString()}
              </span>
            </h3>
          </div>
          <VarResultsDisplay results={results} matrixSize={matrixSize} />
        </>
      )}

      {/* Instructions (shown when no data uploaded) */}
      {!uploadedData && !results && (
        <Card className="rounded-2xl shadow-sm bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>1. <strong>Download the Excel template</strong> using the button above</p>
            <p>2. <strong>Fill in your portfolio data</strong> in the three sheets:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Portfolio_Holdings: Your current positions</li>
              <li>Price_History: Historical prices (min. 252 days for daily data)</li>
              <li>Configuration: VaR calculation parameters</li>
            </ul>
            <p>3. <strong>Upload the completed file</strong> and click "Calculate VaR"</p>
            <p>4. <strong>View results</strong> including risk scores, asset contributions, and correlation matrix</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
