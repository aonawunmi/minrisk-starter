# VaR Analysis - Technical Design Document

**Version:** 1.0
**Date:** January 2025
**Status:** Design Phase

---

## 1. Overview

This document outlines the technical implementation of the Value at Risk (VaR) analysis module for the MinRisk portal using the variance-covariance method with Likelihood/Impact decomposition.

### Key Features:
- Excel file upload with portfolio holdings and price history
- Parametric VaR calculation (variance-covariance method)
- User-defined scale mapping (Volatility → Likelihood, Value → Impact)
- Results visualization with asset contribution breakdown
- Historical storage of calculations
- Optional transfer to Risk Register

---

## 2. Architecture Overview

```
┌─────────────────┐
│  Excel Upload   │
│  (User)         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  File Parser (XLSX.js)                          │
│  - Read 3 sheets                                │
│  - Validate structure                           │
│  - Extract data into JSON                       │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Data Validator                                 │
│  - Check asset name matching                    │
│  - Verify minimum data points                   │
│  - Validate date format                         │
│  - Check for missing prices                     │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  VaR Calculation Engine                         │
│  1. Calculate returns from prices               │
│  2. Build covariance matrix                     │
│  3. Calculate portfolio weights                 │
│  4. Compute portfolio variance                  │
│  5. Calculate VaR                               │
│  6. Decompose: Asset contributions              │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Scale Mapper                                   │
│  - Load user-defined thresholds from DB        │
│  - Map volatility → Likelihood score (1-5/6)   │
│  - Map portfolio value → Impact score (1-5/6)  │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Results Display (React Components)             │
│  - Summary cards                                │
│  - Risk score visualization                     │
│  - Asset contribution table                     │
│  - Correlation matrix                           │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌──────────────────┬──────────────────────────────┐
│  Save to DB      │  Transfer to Risk Register   │
│  (var_calculations)│  (Create new risk entry)   │
└──────────────────┴──────────────────────────────┘
```

---

## 3. Data Structures

### 3.1 Input Data Types

```typescript
// Portfolio Holdings
type PortfolioHolding = {
  asset_name: string;
  asset_type: 'Bond' | 'Equity' | 'FX' | 'Other';
  quantity: number;
  current_price: number;
  notes?: string;
};

// Price History
type PriceHistoryRow = {
  date: Date;
  prices: Record<string, number>; // { "Asset Name": price }
};

// Configuration
type VarConfig = {
  data_frequency: 'Daily' | 'Weekly' | 'Monthly';
  confidence_level: 90 | 95 | 99 | 99.9;
  time_horizon_days: number;
  currency: 'NGN';
  min_data_points_daily: number;
  min_data_points_monthly: number;
};

// User-defined scale thresholds
type VarScaleConfig = {
  organization_id: string;
  volatility_thresholds: [number, number, number, number]; // [5, 10, 15, 20]
  value_thresholds: [number, number, number, number];      // [10, 50, 100, 500] in millions
};
```

### 3.2 Intermediate Data Types

```typescript
// Returns matrix
type ReturnsMatrix = {
  asset_names: string[];
  returns: number[][]; // [n_observations x n_assets]
};

// Portfolio weights
type PortfolioWeights = {
  asset_name: string;
  market_value: number;
  weight: number; // 0 to 1
}[];

// Covariance matrix
type CovarianceMatrix = number[][]; // [n_assets x n_assets]

// Correlation matrix
type CorrelationMatrix = {
  asset_names: string[];
  matrix: number[][]; // [n_assets x n_assets], values between -1 and 1
};
```

### 3.3 Output Data Types

```typescript
// VaR Results
type VarResults = {
  // Summary metrics
  portfolio_var: number;              // in NGN
  portfolio_volatility: number;       // annualized %
  total_portfolio_value: number;      // in NGN
  data_points_count: number;

  // Risk scores
  likelihood_score: number;           // 1-5 or 1-6
  impact_score: number;               // 1-5 or 1-6

  // Detailed breakdown
  asset_contributions: AssetContribution[];
  correlation_matrix: CorrelationMatrix;
  covariance_matrix: CovarianceMatrix;

  // Metadata
  confidence_level: number;
  time_horizon_days: number;
  calculation_date: Date;
};

// Asset contribution
type AssetContribution = {
  asset_name: string;
  market_value: number;
  weight: number;
  var_contribution: number;           // in NGN
  var_contribution_pct: number;       // % of total VaR
};
```

---

## 4. Core Calculation Functions

### 4.1 Return Calculation

```typescript
/**
 * Calculate periodic returns from price series
 * Returns: (P_t - P_{t-1}) / P_{t-1}
 */
function calculateReturns(priceHistory: PriceHistoryRow[]): ReturnsMatrix {
  const assetNames = Object.keys(priceHistory[0].prices);
  const returns: number[][] = [];

  for (let i = 1; i < priceHistory.length; i++) {
    const periodReturns: number[] = [];

    for (const asset of assetNames) {
      const priceToday = priceHistory[i].prices[asset];
      const priceYesterday = priceHistory[i - 1].prices[asset];
      const return_ = (priceToday - priceYesterday) / priceYesterday;
      periodReturns.push(return_);
    }

    returns.push(periodReturns);
  }

  return { asset_names: assetNames, returns };
}
```

### 4.2 Covariance Matrix

```typescript
/**
 * Calculate covariance matrix from returns
 * Cov(X,Y) = E[(X - μ_X)(Y - μ_Y)]
 */
function calculateCovarianceMatrix(returnsMatrix: ReturnsMatrix): CovarianceMatrix {
  const { returns } = returnsMatrix;
  const n_assets = returns[0].length;
  const n_obs = returns.length;

  // Calculate means for each asset
  const means = returns[0].map((_, assetIdx) => {
    const assetReturns = returns.map(row => row[assetIdx]);
    return assetReturns.reduce((sum, r) => sum + r, 0) / n_obs;
  });

  // Calculate covariance matrix
  const covMatrix: number[][] = [];

  for (let i = 0; i < n_assets; i++) {
    const row: number[] = [];

    for (let j = 0; j < n_assets; j++) {
      let covariance = 0;

      for (let t = 0; t < n_obs; t++) {
        covariance += (returns[t][i] - means[i]) * (returns[t][j] - means[j]);
      }

      covariance /= (n_obs - 1); // Sample covariance
      row.push(covariance);
    }

    covMatrix.push(row);
  }

  return covMatrix;
}
```

### 4.3 Correlation Matrix

```typescript
/**
 * Calculate correlation matrix from covariance matrix
 * Corr(X,Y) = Cov(X,Y) / (σ_X × σ_Y)
 */
function calculateCorrelationMatrix(
  covMatrix: CovarianceMatrix,
  assetNames: string[]
): CorrelationMatrix {
  const n = covMatrix.length;
  const corrMatrix: number[][] = [];

  // Extract standard deviations (sqrt of diagonal)
  const stdDevs = covMatrix.map((row, i) => Math.sqrt(row[i]));

  // Calculate correlation
  for (let i = 0; i < n; i++) {
    const row: number[] = [];

    for (let j = 0; j < n; j++) {
      const correlation = covMatrix[i][j] / (stdDevs[i] * stdDevs[j]);
      row.push(correlation);
    }

    corrMatrix.push(row);
  }

  return { asset_names: assetNames, matrix: corrMatrix };
}
```

### 4.4 Portfolio Variance

```typescript
/**
 * Calculate portfolio variance
 * σ²_p = w' × Σ × w
 * Where w = weights vector, Σ = covariance matrix
 */
function calculatePortfolioVariance(
  weights: number[],
  covMatrix: CovarianceMatrix
): number {
  const n = weights.length;
  let variance = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }

  return variance;
}
```

### 4.5 VaR Calculation

```typescript
/**
 * Calculate Value at Risk using variance-covariance method
 * VaR = Portfolio Value × σ_p × Z_α × sqrt(time_horizon)
 */
function calculateVaR(
  portfolioValue: number,
  portfolioVariance: number,
  confidenceLevel: number,
  timeHorizonDays: number,
  dataFrequency: 'Daily' | 'Weekly' | 'Monthly'
): number {
  // Z-scores for confidence levels
  const zScores: Record<number, number> = {
    90: 1.282,
    95: 1.645,
    99: 2.326,
    99.9: 3.090
  };

  const zScore = zScores[confidenceLevel];
  const portfolioStdDev = Math.sqrt(portfolioVariance);

  // Annualize volatility based on data frequency
  const periodsPerYear = dataFrequency === 'Daily' ? 252 :
                         dataFrequency === 'Weekly' ? 52 : 12;
  const annualizedVol = portfolioStdDev * Math.sqrt(periodsPerYear);

  // Scale to time horizon
  const horizonScaling = Math.sqrt(timeHorizonDays / periodsPerYear);

  // Calculate VaR
  const var_ = portfolioValue * annualizedVol * zScore * horizonScaling;

  return var_;
}
```

### 4.6 Asset Contribution to VaR

```typescript
/**
 * Calculate each asset's contribution to portfolio VaR
 * Marginal VaR approach: ∂VaR/∂w_i × w_i
 */
function calculateAssetContributions(
  holdings: PortfolioHolding[],
  weights: number[],
  covMatrix: CovarianceMatrix,
  portfolioVar: number,
  portfolioValue: number
): AssetContribution[] {
  const n = holdings.length;
  const contributions: AssetContribution[] = [];

  // Calculate portfolio standard deviation
  const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);
  const portfolioStdDev = Math.sqrt(portfolioVariance);

  for (let i = 0; i < n; i++) {
    // Marginal contribution = (Σ × w)_i / σ_p
    let marginalContribution = 0;
    for (let j = 0; j < n; j++) {
      marginalContribution += covMatrix[i][j] * weights[j];
    }
    marginalContribution /= portfolioStdDev;

    // Component VaR = w_i × Marginal VaR × Portfolio VaR / Portfolio Value
    const componentVar = weights[i] * marginalContribution * portfolioVar / portfolioStdDev;

    // Calculate market value
    const marketValue = holdings[i].asset_type === 'Bond'
      ? (holdings[i].quantity * holdings[i].current_price) / 100
      : holdings[i].quantity * holdings[i].current_price;

    contributions.push({
      asset_name: holdings[i].asset_name,
      market_value: marketValue,
      weight: weights[i],
      var_contribution: componentVar,
      var_contribution_pct: (componentVar / portfolioVar) * 100
    });
  }

  return contributions;
}
```

### 4.7 Scale Mapping

```typescript
/**
 * Map continuous volatility to discrete Likelihood score
 */
function mapVolatilityToLikelihood(
  volatility: number,
  thresholds: number[],
  matrixSize: 5 | 6
): number {
  // thresholds = [5, 10, 15, 20] for 5x5 matrix
  // thresholds = [4, 8, 12, 16, 20] for 6x6 matrix

  const vol = volatility * 100; // Convert to percentage

  if (vol < thresholds[0]) return 1;
  if (vol < thresholds[1]) return 2;
  if (vol < thresholds[2]) return 3;
  if (vol < thresholds[3]) return 4;
  return matrixSize === 6 && vol < thresholds[4] ? 5 : matrixSize;
}

/**
 * Map portfolio value to discrete Impact score
 */
function mapValueToImpact(
  portfolioValue: number,
  thresholds: number[],
  matrixSize: 5 | 6
): number {
  // thresholds = [10, 50, 100, 500] (in millions NGN)

  const valueInMillions = portfolioValue / 1_000_000;

  if (valueInMillions < thresholds[0]) return 1;
  if (valueInMillions < thresholds[1]) return 2;
  if (valueInMillions < thresholds[2]) return 3;
  if (valueInMillions < thresholds[3]) return 4;
  return matrixSize === 6 && valueInMillions < thresholds[4] ? 5 : matrixSize;
}
```

---

## 5. Data Validation

```typescript
/**
 * Validate uploaded Excel data
 */
function validateVarData(
  holdings: PortfolioHolding[],
  priceHistory: PriceHistoryRow[],
  config: VarConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Check asset name matching
  const holdingAssets = new Set(holdings.map(h => h.asset_name));
  const priceAssets = Object.keys(priceHistory[0]?.prices || {});

  for (const asset of holdingAssets) {
    if (!priceAssets.includes(asset)) {
      errors.push(`Asset "${asset}" not found in Price History sheet`);
    }
  }

  // 2. Check minimum data points
  const minPoints = config.data_frequency === 'Daily'
    ? config.min_data_points_daily
    : config.min_data_points_monthly;

  if (priceHistory.length < minPoints) {
    errors.push(
      `Insufficient data: ${priceHistory.length} rows, minimum ${minPoints} required for ${config.data_frequency} data`
    );
  }

  // 3. Check for missing prices
  for (let i = 0; i < priceHistory.length; i++) {
    for (const asset of priceAssets) {
      if (priceHistory[i].prices[asset] === null ||
          priceHistory[i].prices[asset] === undefined ||
          isNaN(priceHistory[i].prices[asset])) {
        errors.push(`Missing price for "${asset}" on row ${i + 1}`);
      }
    }
  }

  // 4. Check positive values
  for (const holding of holdings) {
    if (holding.quantity <= 0) {
      errors.push(`Invalid quantity for "${holding.asset_name}": must be positive`);
    }
    if (holding.current_price <= 0) {
      errors.push(`Invalid price for "${holding.asset_name}": must be positive`);
    }
  }

  // 5. Validate dates
  for (let i = 1; i < priceHistory.length; i++) {
    if (priceHistory[i].date <= priceHistory[i - 1].date) {
      errors.push(`Dates must be in chronological order (row ${i + 1})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 6. Component Structure

### 6.1 Main Components

```typescript
// src/components/VarSandbox.tsx
export function VarSandboxTab() {
  const [uploadedData, setUploadedData] = useState<VarUploadData | null>(null);
  const [results, setResults] = useState<VarResults | null>(null);
  const [config, setConfig] = useState<VarConfig>(defaultConfig);

  return (
    <div>
      <VarFileUpload onUpload={setUploadedData} />
      <VarParameterPanel config={config} onChange={setConfig} />
      {results && <VarResultsDisplay results={results} />}
    </div>
  );
}

// src/components/VarFileUpload.tsx
export function VarFileUpload({ onUpload }) {
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const data = parseVarWorkbook(workbook);
      onUpload(data);
    };
    reader.readAsBinaryString(file);
  };

  return <DropzoneArea />;
}

// src/components/VarResultsDisplay.tsx
export function VarResultsDisplay({ results }) {
  return (
    <>
      <VarSummaryCards results={results} />
      <VarRiskScores likelihood={results.likelihood_score} impact={results.impact_score} />
      <VarAssetContributionTable contributions={results.asset_contributions} />
      <VarCorrelationMatrix matrix={results.correlation_matrix} />
      <VarActions results={results} />
    </>
  );
}
```

### 6.2 Configuration Component (Admin)

```typescript
// src/components/VarScaleConfig.tsx (in Configuration tab)
export function VarScaleConfiguration() {
  const [scaleConfig, setScaleConfig] = useState<VarScaleConfig | null>(null);

  useEffect(() => {
    loadScaleConfig().then(setScaleConfig);
  }, []);

  const handleSave = async () => {
    await saveScaleConfig(scaleConfig);
    showToast('VaR scale configuration saved');
  };

  return (
    <Card>
      <CardHeader>VaR Scale Configuration (Admin Only)</CardHeader>
      <CardContent>
        <VolatilityThresholdEditor
          thresholds={scaleConfig.volatility_thresholds}
          onChange={updateVolatilityThresholds}
        />
        <ValueThresholdEditor
          thresholds={scaleConfig.value_thresholds}
          onChange={updateValueThresholds}
        />
        <Button onClick={handleSave}>Save Configuration</Button>
      </CardContent>
    </Card>
  );
}
```

---

## 7. Database Functions

### 7.1 Load Scale Configuration

```typescript
// src/lib/varDatabase.ts

export async function loadVarScaleConfig(orgId: string): Promise<VarScaleConfig> {
  const { data, error } = await supabase
    .from('var_scale_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !data) {
    // Return defaults if not configured
    return {
      organization_id: orgId,
      volatility_thresholds: [5, 10, 15, 20],
      value_thresholds: [10, 50, 100, 500]
    };
  }

  return {
    organization_id: data.organization_id,
    volatility_thresholds: [
      data.volatility_threshold_1,
      data.volatility_threshold_2,
      data.volatility_threshold_3,
      data.volatility_threshold_4
    ],
    value_thresholds: [
      data.value_threshold_1,
      data.value_threshold_2,
      data.value_threshold_3,
      data.value_threshold_4
    ]
  };
}
```

### 7.2 Save VaR Calculation

```typescript
export async function saveVarCalculation(
  calculationName: string,
  notes: string,
  uploadedData: VarUploadData,
  results: VarResults,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {

  const { error } = await supabase
    .from('var_calculations')
    .insert({
      organization_id: orgId,
      user_id: userId,
      calculation_name: calculationName,
      notes: notes,
      confidence_level: results.confidence_level,
      time_horizon_days: results.time_horizon_days,
      data_frequency: uploadedData.config.data_frequency,
      portfolio_holdings: uploadedData.holdings,
      price_history: uploadedData.priceHistory,
      portfolio_var: results.portfolio_var,
      portfolio_volatility: results.portfolio_volatility,
      total_portfolio_value: results.total_portfolio_value,
      data_points_count: results.data_points_count,
      likelihood_score: results.likelihood_score,
      impact_score: results.impact_score,
      asset_contributions: results.asset_contributions,
      correlation_matrix: results.correlation_matrix.matrix,
      covariance_matrix: results.covariance_matrix
    });

  return { success: !error, error: error?.message };
}
```

### 7.3 Load VaR History

```typescript
export async function loadVarHistory(orgId: string): Promise<VarHistoryItem[]> {
  const { data, error } = await supabase
    .from('var_history_view')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data;
}
```

---

## 8. Libraries Required

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",           // Excel file parsing
    "mathjs": "^12.3.0",         // Matrix operations (alternative)
    "simple-statistics": "^7.8.3" // Statistical functions (lightweight)
  }
}
```

**Recommendation**: Use `simple-statistics` for basic stats. For matrix operations, implement custom functions (as shown above) to avoid heavy dependencies.

---

## 9. Performance Considerations

### 9.1 Client-Side Computation Limits

- **Small portfolios** (<20 assets, <500 data points): Client-side is fine
- **Medium portfolios** (20-50 assets, 500-1000 data points): May lag slightly
- **Large portfolios** (>50 assets, >1000 data points): Consider server-side

### 9.2 Optimization Strategies

```typescript
// Use memoization for expensive calculations
const memoizedCovMatrix = useMemo(() => {
  if (!returnsMatrix) return null;
  return calculateCovarianceMatrix(returnsMatrix);
}, [returnsMatrix]);

// Debounce parameter changes
const debouncedConfig = useDebounce(config, 500);

useEffect(() => {
  if (uploadedData) {
    calculateVaR(uploadedData, debouncedConfig);
  }
}, [uploadedData, debouncedConfig]);
```

---

## 10. Error Handling

```typescript
try {
  // Validate data
  const validation = validateVarData(holdings, priceHistory, config);
  if (!validation.valid) {
    showToast(validation.errors.join('\n'), 'error');
    return;
  }

  // Calculate VaR
  const results = performVarCalculation(holdings, priceHistory, config);

  // Display results
  setResults(results);

} catch (error) {
  console.error('VaR calculation error:', error);
  showToast('Failed to calculate VaR. Please check your data.', 'error');
}
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
// __tests__/varCalculations.test.ts

describe('VaR Calculations', () => {
  test('calculateReturns produces correct output', () => {
    const priceHistory = [
      { date: new Date('2024-01-01'), prices: { Asset1: 100 } },
      { date: new Date('2024-01-02'), prices: { Asset1: 105 } }
    ];

    const returns = calculateReturns(priceHistory);
    expect(returns.returns[0][0]).toBeCloseTo(0.05);
  });

  test('calculateCovarianceMatrix is symmetric', () => {
    const returns = { asset_names: ['A', 'B'], returns: [[0.01, 0.02], [0.03, 0.04]] };
    const covMatrix = calculateCovarianceMatrix(returns);

    expect(covMatrix[0][1]).toBe(covMatrix[1][0]);
  });
});
```

### 11.2 Integration Tests

Test with realistic sample data:
- 4-asset portfolio (2 bonds, 2 equities)
- 252 days of price history
- Expected VaR output validation

---

## 12. Implementation Phases

### Phase 1: Core Engine (Week 1)
- [ ] Implement calculation functions
- [ ] Excel parsing and validation
- [ ] Unit tests

### Phase 2: UI Components (Week 2)
- [ ] File upload component
- [ ] Parameter panel
- [ ] Results display components
- [ ] Integration with main app

### Phase 3: Database & Storage (Week 3)
- [ ] Create database tables
- [ ] Implement save/load functions
- [ ] VaR history panel

### Phase 4: Scale Configuration (Week 4)
- [ ] Admin configuration UI
- [ ] Scale mapping logic
- [ ] Transfer to Risk Register

### Phase 5: Testing & Refinement (Week 5)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User acceptance testing

---

## 13. Future Enhancements (Post-MVP)

- Historical simulation method
- Monte Carlo simulation
- Multi-currency support
- Automated data feeds (market data APIs)
- Stress testing scenarios
- VaR backtesting reports
- Conditional VaR (CVaR / Expected Shortfall)

---

## 14. References

- **VaR Methodology**: Jorion, P. (2006). Value at Risk: The New Benchmark for Managing Financial Risk
- **Variance-Covariance Method**: RiskMetrics Technical Document
- **Portfolio Theory**: Markowitz, H. (1952). Portfolio Selection

---

**Document Owner**: Risk Management Team
**Last Updated**: January 2025
**Next Review**: After Phase 1 completion
