import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ListOrdered, FileText } from 'lucide-react';
export function RiskReportTab({ risks, config }) {
    const [activeSubTab, setActiveSubTab] = useState('profile');
    const [sortColumn, setSortColumn] = useState('avgScore');
    const [sortDirection, setSortDirection] = useState('desc');
    // Calculate residual risk profile data
    const residualRiskProfile = risks.reduce((acc, risk) => {
        const key = `L${risk.likelihood_residual}-I${risk.impact_residual}`;
        if (!acc[key]) {
            acc[key] = {
                likelihood: risk.likelihood_residual,
                impact: risk.impact_residual,
                count: 0,
                risks: []
            };
        }
        acc[key].count++;
        acc[key].risks.push(risk);
        return acc;
    }, {});
    // Calculate residual risk ranking by category (aggregated averages)
    const categoryRanking = Object.entries(risks.reduce((acc, risk) => {
        if (!acc[risk.category]) {
            acc[risk.category] = {
                category: risk.category,
                totalLikelihood: 0,
                totalImpact: 0,
                count: 0,
            };
        }
        acc[risk.category].totalLikelihood += risk.likelihood_residual;
        acc[risk.category].totalImpact += risk.impact_residual;
        acc[risk.category].count++;
        return acc;
    }, {})).map(([_, data]) => ({
        category: data.category,
        avgLikelihood: data.totalLikelihood / data.count,
        avgImpact: data.totalImpact / data.count,
        avgScore: (data.totalLikelihood / data.count) * (data.totalImpact / data.count),
        riskCount: data.count,
    }));
    // Sort category ranking
    const sortedCategoryRanking = [...categoryRanking].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };
    // Calculate risk profile summary
    const summary = {
        totalRisks: risks.length,
        byCategory: risks.reduce((acc, risk) => {
            acc[risk.category] = (acc[risk.category] || 0) + 1;
            return acc;
        }, {}),
        byDivision: risks.reduce((acc, risk) => {
            acc[risk.division] = (acc[risk.division] || 0) + 1;
            return acc;
        }, {}),
        byStatus: risks.reduce((acc, risk) => {
            acc[risk.status] = (acc[risk.status] || 0) + 1;
            return acc;
        }, {}),
        avgInherentScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.inherent_score, 0) / risks.length : 0,
        avgResidualScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.residual_score, 0) / risks.length : 0,
    };
    const getScoreColor = (score) => {
        if (score >= 20)
            return 'bg-red-600 text-white';
        if (score >= 12)
            return 'bg-orange-500 text-white';
        if (score >= 6)
            return 'bg-yellow-400 text-black';
        if (score >= 3)
            return 'bg-lime-400 text-black';
        return 'bg-green-400 text-black';
    };
    const getScoreColorHex = (score) => {
        if (score >= 20)
            return '#dc2626'; // red-600
        if (score >= 12)
            return '#f97316'; // orange-500
        if (score >= 6)
            return '#facc15'; // yellow-400
        if (score >= 3)
            return '#a3e635'; // lime-400
        return '#4ade80'; // green-400
    };
    const getScoreLabel = (score) => {
        if (score >= 20)
            return 'Severe';
        if (score >= 12)
            return 'High';
        if (score >= 6)
            return 'Moderate';
        if (score >= 3)
            return 'Low';
        return 'Minimal';
    };
    return (_jsx("div", { className: "space-y-6", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Risk Report" }), _jsx(CardDescription, { children: "Comprehensive analysis of residual risks across the organization" })] }), _jsx(CardContent, { children: _jsxs(Tabs, { value: activeSubTab, onValueChange: setActiveSubTab, children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3", children: [_jsxs(TabsTrigger, { value: "profile", children: [_jsx(BarChart3, { className: "h-4 w-4 mr-2" }), "Residual Risk Profile"] }), _jsxs(TabsTrigger, { value: "ranking", children: [_jsx(ListOrdered, { className: "h-4 w-4 mr-2" }), "Residual Risk Ranking"] }), _jsxs(TabsTrigger, { value: "summary", children: [_jsx(FileText, { className: "h-4 w-4 mr-2" }), "Risk Profile Summary"] })] }), _jsxs(TabsContent, { value: "profile", className: "space-y-4 mt-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Residual Risk Profile" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Distribution of risks by residual likelihood and impact levels" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border border-gray-300", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "border border-gray-300 px-3 py-2 text-left text-sm", children: "Likelihood" }), _jsx("th", { className: "border border-gray-300 px-3 py-2 text-left text-sm", children: "Impact" }), _jsx("th", { className: "border border-gray-300 px-3 py-2 text-right text-sm", children: "Risk Count" }), _jsx("th", { className: "border border-gray-300 px-3 py-2 text-left text-sm", children: "Risk Codes" })] }) }), _jsx("tbody", { children: Object.entries(residualRiskProfile)
                                                        .sort((a, b) => (b[1].likelihood * b[1].impact) - (a[1].likelihood * a[1].impact))
                                                        .map(([key, data]) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "border border-gray-300 px-3 py-2 text-sm whitespace-nowrap", children: [data.likelihood, " - ", config.likelihoodLabels[data.likelihood - 1] || data.likelihood] }), _jsxs("td", { className: "border border-gray-300 px-3 py-2 text-sm whitespace-nowrap", children: [data.impact, " - ", config.impactLabels[data.impact - 1] || data.impact] }), _jsx("td", { className: "border border-gray-300 px-3 py-2 text-right font-semibold text-sm", children: data.count }), _jsx("td", { className: "border border-gray-300 px-3 py-2", children: _jsx("div", { className: "flex flex-wrap gap-1", children: data.risks.map(risk => (_jsx("span", { className: `px-2 py-1 rounded text-xs ${getScoreColor(risk.residual_score)}`, title: risk.risk_title, children: risk.risk_code }, risk.risk_code))) }) })] }, key))) })] }) })] }), _jsxs(TabsContent, { value: "ranking", className: "space-y-4 mt-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Residual Risk Ranking by Category" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Average residual likelihood, impact, and severity by risk category" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full border border-gray-300", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "border border-gray-300 px-4 py-2 text-center", children: "Rank" }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-left cursor-pointer hover:bg-gray-200", onClick: () => handleSort('category'), children: _jsxs("div", { className: "flex items-center gap-2", children: ["Risk Category", sortColumn === 'category' && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200", onClick: () => handleSort('riskCount'), children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: ["# Risks", sortColumn === 'riskCount' && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200", onClick: () => handleSort('avgLikelihood'), children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: ["Avg L", sortColumn === 'avgLikelihood' && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200", onClick: () => handleSort('avgImpact'), children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: ["Avg I", sortColumn === 'avgImpact' && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-center cursor-pointer hover:bg-gray-200", onClick: () => handleSort('avgScore'), children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: ["Avg Score", sortColumn === 'avgScore' && (_jsx("span", { children: sortDirection === 'asc' ? '↑' : '↓' }))] }) }), _jsx("th", { className: "border border-gray-300 px-4 py-2 text-center", children: "Rating" })] }) }), _jsx("tbody", { children: sortedCategoryRanking.map((category, index) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "border border-gray-300 px-4 py-2 text-center font-semibold", children: index + 1 }), _jsx("td", { className: "border border-gray-300 px-4 py-2 font-medium", children: category.category }), _jsx("td", { className: "border border-gray-300 px-4 py-2 text-center", children: category.riskCount }), _jsx("td", { className: "border border-gray-300 px-4 py-2 text-center", children: category.avgLikelihood.toFixed(2) }), _jsx("td", { className: "border border-gray-300 px-4 py-2 text-center", children: category.avgImpact.toFixed(2) }), _jsx("td", { className: "border border-gray-300 px-4 py-2 text-center font-bold", children: category.avgScore.toFixed(2) }), _jsx("td", { className: "border border-gray-300 px-4 py-2 text-center", children: _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold ${getScoreColor(category.avgScore)}`, children: getScoreLabel(category.avgScore) }) })] }, category.category))) })] }) }), _jsxs("div", { className: "mt-8", children: [_jsx("h4", { className: "text-base font-semibold mb-4", children: "Risk Category Positioning Map" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Categories positioned by average residual likelihood (horizontal) and impact (vertical). Circle size represents number of risks in each category." }), _jsxs("div", { className: "relative bg-gray-50 border-2 border-gray-300 rounded-lg", style: { height: '600px', width: '100%' }, children: [_jsx("div", { className: "absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800", children: "Average Likelihood \u2192" }), _jsx("div", { className: "absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-800 origin-center", children: "Average Impact \u2192" }), _jsxs("div", { className: "absolute", style: { left: '80px', right: '200px', top: '60px', bottom: '60px' }, children: [_jsxs("div", { className: "absolute inset-0 bg-white border border-gray-300", children: [[...Array(config.matrixSize - 1)].map((_, i) => (_jsx("div", { className: "absolute top-0 bottom-0 border-l border-gray-200", style: { left: `${((i + 1) / config.matrixSize) * 100}%` } }, `v-${i}`))), [...Array(config.matrixSize - 1)].map((_, i) => (_jsx("div", { className: "absolute left-0 right-0 border-t border-gray-200", style: { top: `${((i + 1) / config.matrixSize) * 100}%` } }, `h-${i}`)))] }), _jsx("div", { className: "absolute -left-10 inset-y-0 flex flex-col justify-between py-1", children: [...Array(config.matrixSize)].map((_, i) => (_jsx("div", { className: "text-sm font-medium text-gray-700 text-right", children: config.matrixSize - i }, i))) }), _jsx("div", { className: "absolute inset-x-0 -bottom-8 flex justify-between px-1", children: [...Array(config.matrixSize)].map((_, i) => (_jsx("div", { className: "text-sm font-medium text-gray-700", children: i + 1 }, i))) }), _jsx("div", { className: "absolute inset-0", children: categoryRanking.length > 0 ? (categoryRanking.map((category) => {
                                                                    const xPercent = ((category.avgLikelihood - 1) / (config.matrixSize - 1)) * 100;
                                                                    const yPercent = ((config.matrixSize - category.avgImpact) / (config.matrixSize - 1)) * 100;
                                                                    const size = Math.max(30, Math.min(70, 25 + category.riskCount * 6));
                                                                    const bgColor = getScoreColorHex(category.avgScore);
                                                                    return (_jsx("div", { className: "absolute rounded-full cursor-pointer transition-all hover:scale-110 hover:z-10 shadow-lg", style: {
                                                                            left: `${xPercent}%`,
                                                                            top: `${yPercent}%`,
                                                                            width: `${size}px`,
                                                                            height: `${size}px`,
                                                                            transform: 'translate(-50%, -50%)',
                                                                            backgroundColor: bgColor,
                                                                            border: '2px solid white',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                        }, title: `${category.category}\nAvg L: ${category.avgLikelihood.toFixed(2)}, Avg I: ${category.avgImpact.toFixed(2)}\n${category.riskCount} risks, Score: ${category.avgScore.toFixed(2)}`, children: _jsxs("div", { className: "text-center px-2", children: [_jsx("div", { className: "text-xs font-bold text-white leading-tight", style: {
                                                                                        fontSize: size > 60 ? '11px' : '9px',
                                                                                        lineHeight: '1.1',
                                                                                    }, children: category.category.length > 12 ? category.category.substring(0, 10) + '...' : category.category }), _jsxs("div", { className: "text-xs font-bold text-white mt-0.5", children: ["(", category.riskCount, ")"] })] }) }, category.category));
                                                                })) : (_jsx("div", { className: "absolute inset-0 flex items-center justify-center text-gray-500", children: "No risk categories to display" })) })] }), _jsxs("div", { className: "absolute right-8 top-16 bg-white border-2 border-gray-300 p-4 rounded-lg shadow-lg", children: [_jsx("div", { className: "text-sm font-bold mb-3 text-gray-900", children: "Risk Severity" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow" }), _jsx("span", { className: "text-xs font-medium", children: "Severe" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow" }), _jsx("span", { className: "text-xs font-medium", children: "High" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-yellow-400 border-2 border-white shadow" }), _jsx("span", { className: "text-xs font-medium", children: "Moderate" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-lime-400 border-2 border-white shadow" }), _jsx("span", { className: "text-xs font-medium", children: "Low" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-green-400 border-2 border-white shadow" }), _jsx("span", { className: "text-xs font-medium", children: "Minimal" })] }), _jsx("div", { className: "mt-3 pt-3 border-t border-gray-300", children: _jsx("div", { className: "text-xs text-gray-600 italic", children: "Size = # of risks" }) })] })] })] })] })] }), _jsxs(TabsContent, { value: "summary", className: "space-y-4 mt-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Risk Profile Summary" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Overview of risk distribution and key metrics" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "Overall Statistics" }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-medium", children: "Total Risks:" }), _jsx("span", { className: "font-bold", children: summary.totalRisks })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-medium", children: "Average Inherent Score:" }), _jsx("span", { className: "font-bold", children: summary.avgInherentScore.toFixed(2) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-medium", children: "Average Residual Score:" }), _jsx("span", { className: "font-bold", children: summary.avgResidualScore.toFixed(2) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-medium", children: "Risk Reduction:" }), _jsxs("span", { className: "font-bold text-green-600", children: [((1 - summary.avgResidualScore / summary.avgInherentScore) * 100).toFixed(1), "%"] })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "By Status" }) }), _jsx(CardContent, { className: "space-y-3", children: Object.entries(summary.byStatus).map(([status, count]) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "font-medium", children: [status, ":"] }), _jsx("span", { className: "font-bold", children: count })] }, status))) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "By Category" }) }), _jsx(CardContent, { className: "space-y-2", children: Object.entries(summary.byCategory)
                                                            .sort((a, b) => b[1] - a[1])
                                                            .map(([category, count]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "font-medium", children: [category, ":"] }), _jsx("span", { className: "font-bold", children: count })] }, category))) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-base", children: "By Division" }) }), _jsx(CardContent, { className: "space-y-2", children: Object.entries(summary.byDivision)
                                                            .sort((a, b) => b[1] - a[1])
                                                            .map(([division, count]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "font-medium", children: [division, ":"] }), _jsx("span", { className: "font-bold", children: count })] }, division))) })] })] })] })] }) })] }) }));
}
