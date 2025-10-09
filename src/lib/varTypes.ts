// src/lib/varTypes.ts
// Type definitions for VaR Analysis module

export type AssetType = 'Bond' | 'Equity' | 'FX' | 'Other';

export type DataFrequency = 'Daily' | 'Weekly' | 'Monthly';

// Portfolio Holdings
export type PortfolioHolding = {
  asset_name: string;
  asset_type: AssetType;
  quantity: number;
  current_price: number;
  notes?: string;
};

// Price History
export type PriceHistoryRow = {
  date: Date;
  prices: Record<string, number>; // { "Asset Name": price }
};

// VaR Configuration
export type VarConfig = {
  data_frequency: DataFrequency;
  confidence_level: 90 | 95 | 99 | 99.9;
  time_horizon_days: number;
  currency: 'NGN';
  min_data_points_daily: number;
  min_data_points_monthly: number;
};

// User-defined scale thresholds
export type VarScaleConfig = {
  organization_id: string;
  volatility_thresholds: [number, number, number, number]; // [5, 10, 15, 20]
  value_thresholds: [number, number, number, number];      // [10, 50, 100, 500] in millions
};

// Returns matrix
export type ReturnsMatrix = {
  asset_names: string[];
  returns: number[][]; // [n_observations x n_assets]
};

// Portfolio weights
export type PortfolioWeight = {
  asset_name: string;
  market_value: number;
  weight: number; // 0 to 1
};

// Covariance matrix
export type CovarianceMatrix = number[][]; // [n_assets x n_assets]

// Correlation matrix
export type CorrelationMatrix = {
  asset_names: string[];
  matrix: number[][]; // [n_assets x n_assets], values between -1 and 1
};

// Asset contribution
export type AssetContribution = {
  asset_name: string;
  market_value: number;
  weight: number;
  standalone_var: number;             // VaR if held in isolation (in NGN)
  var_contribution: number;           // Contribution to portfolio VaR (in NGN)
  var_contribution_pct: number;       // % of total portfolio VaR
  diversification_benefit: number;    // Standalone VaR - VaR Contribution (in NGN)
};

// VaR Results
export type VarResults = {
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

// Validation result
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

// Uploaded data structure
export type VarUploadData = {
  holdings: PortfolioHolding[];
  priceHistory: PriceHistoryRow[];
  config: VarConfig;
};
