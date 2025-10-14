// src/components/VarResultsDisplay.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { VarResults } from '@/lib/varTypes';

type VarResultsDisplayProps = {
  results: VarResults;
  matrixSize: 5 | 6;
};

type SortField = 'asset_name' | 'market_value' | 'weight' | 'standalone_var' | 'var_contribution' | 'diversification_benefit' | 'var_contribution_pct';
type SortDirection = 'asc' | 'desc' | null;

export function VarResultsDisplay({ results, matrixSize }: VarResultsDisplayProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  // Get color for correlation
  const getCorrelationColor = (corr: number) => {
    if (corr > 0.7) return 'bg-red-100 text-red-800';
    if (corr > 0.3) return 'bg-orange-100 text-orange-800';
    if (corr > -0.3) return 'bg-gray-100 text-gray-800';
    if (corr > -0.7) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1 inline text-blue-600" />;
    }
    return <ArrowDown className="h-4 w-4 ml-1 inline text-blue-600" />;
  };

  // Sort the asset contributions
  const sortedAssets = [...results.asset_contributions].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case 'asset_name':
        aVal = a.asset_name.toLowerCase();
        bVal = b.asset_name.toLowerCase();
        break;
      case 'market_value':
        aVal = a.market_value;
        bVal = b.market_value;
        break;
      case 'weight':
        aVal = a.weight;
        bVal = b.weight;
        break;
      case 'standalone_var':
        aVal = a.standalone_var;
        bVal = b.standalone_var;
        break;
      case 'var_contribution':
        aVal = a.var_contribution;
        bVal = b.var_contribution;
        break;
      case 'diversification_benefit':
        aVal = a.diversification_benefit;
        bVal = b.diversification_benefit;
        break;
      case 'var_contribution_pct':
        aVal = a.var_contribution_pct;
        bVal = b.var_contribution_pct;
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Calculate diversification metrics
  const sumStandaloneVaR = results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0);
  const totalDiversificationBenefit = sumStandaloneVaR - results.portfolio_var;
  const diversificationReductionPct = (totalDiversificationBenefit / sumStandaloneVaR) * 100;

  return (
    <div className="space-y-4">
      {/* Diversification Benefit Highlight */}
      <Card className="rounded-2xl shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">💎 Diversification Benefit</p>
              <div className="text-3xl font-bold text-green-700">
                {diversificationReductionPct.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                VaR reduction from diversification
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-1">Sum of Standalone VaRs</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(sumStandaloneVaR)}</p>
              <p className="text-xs text-gray-600 mt-2">Diversified Portfolio VaR</p>
              <p className="text-lg font-semibold text-green-700">{formatCurrency(results.portfolio_var)}</p>
              <p className="text-xs font-medium text-green-600 mt-1">
                Saved: {formatCurrency(totalDiversificationBenefit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Portfolio VaR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(results.portfolio_var)}</div>
            <p className="text-xs text-gray-500 mt-1">{results.confidence_level}% confidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Portfolio Volatility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(results.portfolio_volatility)}</div>
            <p className="text-xs text-gray-500 mt-1">Annualized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(results.total_portfolio_value)}</div>
            <p className="text-xs text-gray-500 mt-1">Market value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.data_points_count}</div>
            <p className="text-xs text-gray-500 mt-1">Historical observations</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Score Mapping */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">🎯 Risk Score Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Likelihood Score:</span>
              <span className="text-lg font-bold">{results.likelihood_score} / {matrixSize}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(results.likelihood_score / matrixSize) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Based on portfolio volatility: {formatPercent(results.portfolio_volatility)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Impact Score:</span>
              <span className="text-lg font-bold">{results.impact_score} / {matrixSize}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-red-600 h-2.5 rounded-full"
                style={{ width: `${(results.impact_score / matrixSize) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Based on portfolio value: {formatCurrency(results.total_portfolio_value)}
            </p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Overall Risk</p>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Likelihood Score:</span>{' '}
                <span className="text-lg font-bold text-blue-600">{results.likelihood_score}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium">Impact Score:</span>{' '}
                <span className="text-lg font-bold text-red-600">{results.impact_score}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Contribution Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">📊 Asset Contribution to VaR</CardTitle>
          <p className="text-xs text-gray-600 mt-1">
            Standalone VaR shows risk if asset held in isolation. Diversification benefit = Standalone VaR - VaR Contribution. Click column headers to sort.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('asset_name')}
                  >
                    Asset Name{getSortIcon('asset_name')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('market_value')}
                  >
                    Market Value{getSortIcon('market_value')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('weight')}
                  >
                    Weight{getSortIcon('weight')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('standalone_var')}
                  >
                    Standalone VaR{getSortIcon('standalone_var')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('var_contribution')}
                  >
                    VaR Contribution{getSortIcon('var_contribution')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('diversification_benefit')}
                  >
                    Diversification Benefit{getSortIcon('diversification_benefit')}
                  </th>
                  <th
                    className="px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('var_contribution_pct')}
                  >
                    % of Total VaR{getSortIcon('var_contribution_pct')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map((asset, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{asset.asset_name}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(asset.market_value)}</td>
                    <td className="px-3 py-2 text-right">{formatPercent(asset.weight)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(asset.standalone_var)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(asset.var_contribution)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                        asset.diversification_benefit > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {asset.diversification_benefit >= 0 ? '+' : ''}{formatCurrency(asset.diversification_benefit)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center justify-center w-16 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {formatNumber(asset.var_contribution_pct, 1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(results.total_portfolio_value)}</td>
                  <td className="px-3 py-2 text-right">100.00%</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatCurrency(results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0))}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(results.portfolio_var)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                      +{formatCurrency(
                        results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0) - results.portfolio_var
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">📉 Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-white"></th>
                  {results.correlation_matrix.asset_names.map((name, idx) => (
                    <th key={idx} className="px-2 py-2 text-center font-semibold text-gray-700">
                      {name.length > 15 ? name.substring(0, 12) + '...' : name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.correlation_matrix.matrix.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-2 font-semibold text-gray-700 sticky left-0 bg-white">
                      {results.correlation_matrix.asset_names[i].length > 15
                        ? results.correlation_matrix.asset_names[i].substring(0, 12) + '...'
                        : results.correlation_matrix.asset_names[i]}
                    </td>
                    {row.map((corr, j) => (
                      <td key={j} className="px-2 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded ${getCorrelationColor(corr)}`}>
                          {formatNumber(corr, 2)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Negative (&lt; -0.7)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Weak negative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Neutral</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Weak positive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Strong (&gt; 0.7)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
