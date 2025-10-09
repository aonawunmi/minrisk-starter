// src/components/VarScaleConfig.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw } from 'lucide-react';
import { loadVarScaleConfig, saveVarScaleConfig, type VarScaleConfigInput } from '@/lib/database';

type VarScaleConfigProps = {
  showToast: (message: string, type?: 'success' | 'error') => void;
  matrixSize: 5 | 6;
};

export function VarScaleConfig({ showToast, matrixSize }: VarScaleConfigProps) {
  const [config, setConfig] = useState<VarScaleConfigInput>({
    volatility_thresholds: [5, 10, 15, 20],
    value_thresholds: [10, 50, 100, 500]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const loaded = await loadVarScaleConfig();
    if (loaded) {
      setConfig(loaded);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Validate thresholds are in ascending order
    for (let i = 0; i < config.volatility_thresholds.length - 1; i++) {
      if (config.volatility_thresholds[i] >= config.volatility_thresholds[i + 1]) {
        showToast('Volatility thresholds must be in ascending order', 'error');
        return;
      }
    }
    for (let i = 0; i < config.value_thresholds.length - 1; i++) {
      if (config.value_thresholds[i] >= config.value_thresholds[i + 1]) {
        showToast('Value thresholds must be in ascending order', 'error');
        return;
      }
    }

    setSaving(true);
    const result = await saveVarScaleConfig(config);
    if (result.success) {
      showToast('VaR scale configuration saved successfully', 'success');
    } else {
      showToast(result.error || 'Failed to save configuration', 'error');
    }
    setSaving(false);
  };

  const handleVolatilityChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const newThresholds = [...config.volatility_thresholds] as [number, number, number, number];
      newThresholds[index] = numValue;
      setConfig({ ...config, volatility_thresholds: newThresholds });
    }
  };

  const handleValueChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const newThresholds = [...config.value_thresholds] as [number, number, number, number];
      newThresholds[index] = numValue;
      setConfig({ ...config, value_thresholds: newThresholds });
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">📊 VaR Scale Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">📊 VaR Scale Configuration</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Configure how quantitative VaR metrics map to the {matrixSize}x{matrixSize} risk matrix
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volatility Thresholds */}
        <div>
          <h3 className="text-md font-semibold mb-3">
            Likelihood Score (Portfolio Volatility %)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Define volatility percentages that map to likelihood scores 1-{matrixSize}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {config.volatility_thresholds.map((threshold, index) => (
              <div key={index}>
                <Label htmlFor={`vol-${index}`} className="text-sm">
                  Score {index + 1} → {index + 2}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id={`vol-${index}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={threshold}
                    onChange={(e) => handleVolatilityChange(index, e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Preview */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="space-y-1">
              <div>&lt; {config.volatility_thresholds[0]}% = Score <strong>1</strong></div>
              <div>{config.volatility_thresholds[0]}% - {config.volatility_thresholds[1]}% = Score <strong>2</strong></div>
              <div>{config.volatility_thresholds[1]}% - {config.volatility_thresholds[2]}% = Score <strong>3</strong></div>
              <div>{config.volatility_thresholds[2]}% - {config.volatility_thresholds[3]}% = Score <strong>4</strong></div>
              <div>&gt; {config.volatility_thresholds[3]}% = Score <strong>{matrixSize}</strong></div>
            </div>
          </div>
        </div>

        {/* Value Thresholds */}
        <div>
          <h3 className="text-md font-semibold mb-3">
            Impact Score (Portfolio Value in Millions ₦)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Define portfolio values (₦ millions) that map to impact scores 1-{matrixSize}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {config.value_thresholds.map((threshold, index) => (
              <div key={index}>
                <Label htmlFor={`val-${index}`} className="text-sm">
                  Score {index + 1} → {index + 2}
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    ₦
                  </span>
                  <Input
                    id={`val-${index}`}
                    type="number"
                    min="0"
                    step="1"
                    value={threshold}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    className="pl-8 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    M
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Preview */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="space-y-1">
              <div>&lt; ₦{config.value_thresholds[0]}M = Score <strong>1</strong></div>
              <div>₦{config.value_thresholds[0]}M - ₦{config.value_thresholds[1]}M = Score <strong>2</strong></div>
              <div>₦{config.value_thresholds[1]}M - ₦{config.value_thresholds[2]}M = Score <strong>3</strong></div>
              <div>₦{config.value_thresholds[2]}M - ₦{config.value_thresholds[3]}M = Score <strong>4</strong></div>
              <div>&gt; ₦{config.value_thresholds[3]}M = Score <strong>{matrixSize}</strong></div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
          <Button onClick={loadConfig} variant="outline" disabled={saving}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
