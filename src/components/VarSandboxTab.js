import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/VarSandboxTab.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VarFileUpload } from './VarFileUpload';
import { VarResultsDisplay } from './VarResultsDisplay';
import { performVarCalculation, validateVarData } from '@/lib/varCalculations';
import { loadVarScaleConfig } from '@/lib/database';
export function VarSandboxTab({ matrixSize, showToast }) {
    const [uploadedData, setUploadedData] = useState(null);
    const [results, setResults] = useState(null);
    const [confidenceLevel, setConfidenceLevel] = useState(95);
    const [timeHorizon, setTimeHorizon] = useState(1);
    const [isCalculating, setIsCalculating] = useState(false);
    const [scaleConfig, setScaleConfig] = useState({
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
    const handleUpload = (data) => {
        setUploadedData(data);
        setResults(null);
        showToast('File uploaded successfully! Configure parameters and click Calculate VaR.', 'success');
    };
    const handleUploadError = (error) => {
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
            const validation = validateVarData(uploadedData.holdings, uploadedData.priceHistory, uploadedData.config);
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
            const varResults = performVarCalculation(uploadedData.holdings, uploadedData.priceHistory, updatedConfig, scaleConfig, matrixSize);
            setResults(varResults);
            showToast('VaR calculation completed successfully!', 'success');
        }
        catch (error) {
            showToast(`Calculation error: ${error.message}`, 'error');
            console.error('VaR calculation error:', error);
        }
        finally {
            setIsCalculating(false);
        }
    };
    const handleReset = () => {
        setUploadedData(null);
        setResults(null);
        setConfidenceLevel(95);
        setTimeHorizon(1);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "\uD83D\uDCCA VaR Analysis Sandbox" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Calculate Value at Risk using variance-covariance method" })] }) }), _jsx(VarFileUpload, { onUpload: handleUpload, onError: handleUploadError }), uploadedData && (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "\u2699\uFE0F VaR Parameters" }) }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-700 block mb-2", children: "Confidence Level" }), _jsxs(Select, { value: String(confidenceLevel), onValueChange: (v) => setConfidenceLevel(Number(v)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "90", children: "90%" }), _jsx(SelectItem, { value: "95", children: "95%" }), _jsx(SelectItem, { value: "99", children: "99%" }), _jsx(SelectItem, { value: "99.9", children: "99.9%" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-700 block mb-2", children: "Time Horizon (days)" }), _jsxs(Select, { value: String(timeHorizon), onValueChange: (v) => setTimeHorizon(Number(v)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "1", children: "1 day" }), _jsx(SelectItem, { value: "10", children: "10 days" }), _jsx(SelectItem, { value: "21", children: "21 days (1 month)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium text-gray-700 block mb-2", children: "Data Frequency" }), _jsxs(Select, { value: uploadedData.config.data_frequency, disabled: true, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "Daily", children: "Daily" }), _jsx(SelectItem, { value: "Weekly", children: "Weekly" }), _jsx(SelectItem, { value: "Monthly", children: "Monthly" })] })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Detected from file" })] })] }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx(Button, { onClick: handleCalculateVaR, disabled: isCalculating, className: "flex-1", children: isCalculating ? 'Calculating...' : 'Calculate VaR' }), _jsx(Button, { onClick: handleReset, variant: "outline", children: "Reset" })] })] })] })), results && (_jsxs(_Fragment, { children: [_jsx("div", { className: "border-t pt-6", children: _jsxs("h3", { className: "text-xl font-bold mb-4", children: ["\uD83D\uDCC8 Results", _jsxs("span", { className: "text-sm font-normal text-gray-500 ml-2", children: ["Last updated: ", new Date().toLocaleString()] })] }) }), _jsx(VarResultsDisplay, { results: results, matrixSize: matrixSize })] })), !uploadedData && !results && (_jsxs(Card, { className: "rounded-2xl shadow-sm bg-blue-50 border-blue-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg text-blue-900", children: "Getting Started" }) }), _jsxs(CardContent, { className: "text-sm text-blue-800 space-y-2", children: [_jsxs("p", { children: ["1. ", _jsx("strong", { children: "Download the Excel template" }), " using the button above"] }), _jsxs("p", { children: ["2. ", _jsx("strong", { children: "Fill in your portfolio data" }), " in the three sheets:"] }), _jsxs("ul", { className: "list-disc list-inside ml-4 space-y-1", children: [_jsx("li", { children: "Portfolio_Holdings: Your current positions" }), _jsx("li", { children: "Price_History: Historical prices (min. 252 days for daily data)" }), _jsx("li", { children: "Configuration: VaR calculation parameters" })] }), _jsxs("p", { children: ["3. ", _jsx("strong", { children: "Upload the completed file" }), " and click \"Calculate VaR\""] }), _jsxs("p", { children: ["4. ", _jsx("strong", { children: "View results" }), " including risk scores, asset contributions, and correlation matrix"] })] })] }))] }));
}
