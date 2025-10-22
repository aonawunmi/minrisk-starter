import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/VarResultsDisplay.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
export function VarResultsDisplay({ results, matrixSize }) {
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };
    const formatPercent = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };
    const formatNumber = (value, decimals = 2) => {
        return value.toFixed(decimals);
    };
    // Get color for correlation
    const getCorrelationColor = (corr) => {
        if (corr > 0.7)
            return 'bg-red-100 text-red-800';
        if (corr > 0.3)
            return 'bg-orange-100 text-orange-800';
        if (corr > -0.3)
            return 'bg-gray-100 text-gray-800';
        if (corr > -0.7)
            return 'bg-blue-100 text-blue-800';
        return 'bg-green-100 text-green-800';
    };
    // Sort handler
    const handleSort = (field) => {
        if (sortField === field) {
            // Cycle through: asc -> desc -> null
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            }
            else if (sortDirection === 'desc') {
                setSortDirection(null);
                setSortField(null);
            }
        }
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    // Get sort icon
    const getSortIcon = (field) => {
        if (sortField !== field) {
            return _jsx(ArrowUpDown, { className: "h-4 w-4 ml-1 inline opacity-40" });
        }
        if (sortDirection === 'asc') {
            return _jsx(ArrowUp, { className: "h-4 w-4 ml-1 inline text-blue-600" });
        }
        return _jsx(ArrowDown, { className: "h-4 w-4 ml-1 inline text-blue-600" });
    };
    // Sort the asset contributions
    const sortedAssets = [...results.asset_contributions].sort((a, b) => {
        if (!sortField || !sortDirection)
            return 0;
        let aVal;
        let bVal;
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
            ? aVal - bVal
            : bVal - aVal;
    });
    // Calculate diversification metrics
    const sumStandaloneVaR = results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0);
    const totalDiversificationBenefit = sumStandaloneVaR - results.portfolio_var;
    const diversificationReductionPct = (totalDiversificationBenefit / sumStandaloneVaR) * 100;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(Card, { className: "rounded-2xl shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 border-green-200", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: "\uD83D\uDC8E Diversification Benefit" }), _jsxs("div", { className: "text-3xl font-bold text-green-700", children: [diversificationReductionPct.toFixed(1), "%"] }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "VaR reduction from diversification" })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-gray-600 mb-1", children: "Sum of Standalone VaRs" }), _jsx("p", { className: "text-lg font-semibold text-gray-700", children: formatCurrency(sumStandaloneVaR) }), _jsx("p", { className: "text-xs text-gray-600 mt-2", children: "Diversified Portfolio VaR" }), _jsx("p", { className: "text-lg font-semibold text-green-700", children: formatCurrency(results.portfolio_var) }), _jsxs("p", { className: "text-xs font-medium text-green-600 mt-1", children: ["Saved: ", formatCurrency(totalDiversificationBenefit)] })] })] }) }) }), _jsxs("div", { className: "grid grid-cols-4 gap-4", children: [_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Portfolio VaR" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: formatCurrency(results.portfolio_var) }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [results.confidence_level, "% confidence"] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Portfolio Volatility" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: formatPercent(results.portfolio_volatility) }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Annualized" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Total Portfolio Value" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: formatCurrency(results.total_portfolio_value) }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Market value" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Data Points" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: results.data_points_count }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Historical observations" })] })] })] }), _jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "\uD83C\uDFAF Risk Score Mapping" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Likelihood Score:" }), _jsxs("span", { className: "text-lg font-bold", children: [results.likelihood_score, " / ", matrixSize] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: "bg-blue-600 h-2.5 rounded-full", style: { width: `${(results.likelihood_score / matrixSize) * 100}%` } }) }), _jsxs("p", { className: "text-xs text-gray-600 mt-1", children: ["Based on portfolio volatility: ", formatPercent(results.portfolio_volatility)] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Impact Score:" }), _jsxs("span", { className: "text-lg font-bold", children: [results.impact_score, " / ", matrixSize] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: "bg-red-600 h-2.5 rounded-full", style: { width: `${(results.impact_score / matrixSize) * 100}%` } }) }), _jsxs("p", { className: "text-xs text-gray-600 mt-1", children: ["Based on portfolio value: ", formatCurrency(results.total_portfolio_value)] })] }), _jsxs("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Overall Risk" }), _jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "font-medium", children: "Likelihood Score:" }), ' ', _jsx("span", { className: "text-lg font-bold text-blue-600", children: results.likelihood_score })] }), _jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "font-medium", children: "Impact Score:" }), ' ', _jsx("span", { className: "text-lg font-bold text-red-600", children: results.impact_score })] })] })] })] })] }), _jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg", children: "\uD83D\uDCCA Asset Contribution to VaR" }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "Standalone VaR shows risk if asset held in isolation. Diversification benefit = Standalone VaR - VaR Contribution. Click column headers to sort." })] }), _jsx(CardContent, { children: _jsx("div", { className: "overflow-auto rounded-xl border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsxs("th", { className: "px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('asset_name'), children: ["Asset Name", getSortIcon('asset_name')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('market_value'), children: ["Market Value", getSortIcon('market_value')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('weight'), children: ["Weight", getSortIcon('weight')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('standalone_var'), children: ["Standalone VaR", getSortIcon('standalone_var')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('var_contribution'), children: ["VaR Contribution", getSortIcon('var_contribution')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('diversification_benefit'), children: ["Diversification Benefit", getSortIcon('diversification_benefit')] }), _jsxs("th", { className: "px-3 py-2 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors", onClick: () => handleSort('var_contribution_pct'), children: ["% of Total VaR", getSortIcon('var_contribution_pct')] })] }) }), _jsxs("tbody", { children: [sortedAssets.map((asset, index) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2", children: asset.asset_name }), _jsx("td", { className: "px-3 py-2 text-right", children: formatCurrency(asset.market_value) }), _jsx("td", { className: "px-3 py-2 text-right", children: formatPercent(asset.weight) }), _jsx("td", { className: "px-3 py-2 text-right text-gray-600", children: formatCurrency(asset.standalone_var) }), _jsx("td", { className: "px-3 py-2 text-right font-medium", children: formatCurrency(asset.var_contribution) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("span", { className: `inline-flex items-center px-2 py-1 text-xs font-medium rounded ${asset.diversification_benefit > 0
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'}`, children: [asset.diversification_benefit >= 0 ? '+' : '', formatCurrency(asset.diversification_benefit)] }) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("span", { className: "inline-flex items-center justify-center w-16 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded", children: [formatNumber(asset.var_contribution_pct, 1), "%"] }) })] }, index))), _jsxs("tr", { className: "border-t-2 border-gray-300 bg-gray-50 font-semibold", children: [_jsx("td", { className: "px-3 py-2", children: "Total" }), _jsx("td", { className: "px-3 py-2 text-right", children: formatCurrency(results.total_portfolio_value) }), _jsx("td", { className: "px-3 py-2 text-right", children: "100.00%" }), _jsx("td", { className: "px-3 py-2 text-right text-gray-600", children: formatCurrency(results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0)) }), _jsx("td", { className: "px-3 py-2 text-right", children: formatCurrency(results.portfolio_var) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("span", { className: "inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded", children: ["+", formatCurrency(results.asset_contributions.reduce((sum, a) => sum + a.standalone_var, 0) - results.portfolio_var)] }) }), _jsx("td", { className: "px-3 py-2 text-right", children: "100.0%" })] })] })] }) }) })] }), _jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "\uD83D\uDCC9 Correlation Matrix" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "overflow-auto", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "px-2 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-white" }), results.correlation_matrix.asset_names.map((name, idx) => (_jsx("th", { className: "px-2 py-2 text-center font-semibold text-gray-700", children: name.length > 15 ? name.substring(0, 12) + '...' : name }, idx)))] }) }), _jsx("tbody", { children: results.correlation_matrix.matrix.map((row, i) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-2 py-2 font-semibold text-gray-700 sticky left-0 bg-white", children: results.correlation_matrix.asset_names[i].length > 15
                                                            ? results.correlation_matrix.asset_names[i].substring(0, 12) + '...'
                                                            : results.correlation_matrix.asset_names[i] }), row.map((corr, j) => (_jsx("td", { className: "px-2 py-2 text-center", children: _jsx("span", { className: `inline-block px-2 py-1 rounded ${getCorrelationColor(corr)}`, children: formatNumber(corr, 2) }) }, j)))] }, i))) })] }) }), _jsxs("div", { className: "mt-3 flex items-center justify-center gap-4 text-xs text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-4 h-4 bg-green-100 border border-green-300 rounded" }), _jsx("span", { children: "Negative (< -0.7)" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-4 h-4 bg-blue-100 border border-blue-300 rounded" }), _jsx("span", { children: "Weak negative" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-4 h-4 bg-gray-100 border border-gray-300 rounded" }), _jsx("span", { children: "Neutral" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-4 h-4 bg-orange-100 border border-orange-300 rounded" }), _jsx("span", { children: "Weak positive" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-4 h-4 bg-red-100 border border-red-300 rounded" }), _jsx("span", { children: "Strong (> 0.7)" })] })] })] })] })] }));
}
