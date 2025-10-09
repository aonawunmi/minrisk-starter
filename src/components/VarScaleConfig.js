import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/VarScaleConfig.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw } from 'lucide-react';
import { loadVarScaleConfig, saveVarScaleConfig } from '@/lib/database';
export function VarScaleConfig({ showToast, matrixSize }) {
    const [config, setConfig] = useState({
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
        }
        else {
            showToast(result.error || 'Failed to save configuration', 'error');
        }
        setSaving(false);
    };
    const handleVolatilityChange = (index, value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            const newThresholds = [...config.volatility_thresholds];
            newThresholds[index] = numValue;
            setConfig({ ...config, volatility_thresholds: newThresholds });
        }
    };
    const handleValueChange = (index, value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            const newThresholds = [...config.value_thresholds];
            newThresholds[index] = numValue;
            setConfig({ ...config, value_thresholds: newThresholds });
        }
    };
    if (loading) {
        return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "\uD83D\uDCCA VaR Scale Configuration" }) }), _jsx(CardContent, { children: _jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(RefreshCw, { className: "h-6 w-6 animate-spin text-gray-400" }) }) })] }));
    }
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg", children: "\uD83D\uDCCA VaR Scale Configuration" }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["Configure how quantitative VaR metrics map to the ", matrixSize, "x", matrixSize, " risk matrix"] })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-md font-semibold mb-3", children: "Likelihood Score (Portfolio Volatility %)" }), _jsxs("p", { className: "text-sm text-gray-600 mb-4", children: ["Define volatility percentages that map to likelihood scores 1-", matrixSize] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: config.volatility_thresholds.map((threshold, index) => (_jsxs("div", { children: [_jsxs(Label, { htmlFor: `vol-${index}`, className: "text-sm", children: ["Score ", index + 1, " \u2192 ", index + 2] }), _jsxs("div", { className: "relative mt-1", children: [_jsx(Input, { id: `vol-${index}`, type: "number", min: "0", step: "0.1", value: threshold, onChange: (e) => handleVolatilityChange(index, e.target.value), className: "pr-8" }), _jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm", children: "%" })] })] }, index))) }), _jsx("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg text-xs", children: _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { children: ["< ", config.volatility_thresholds[0], "% = Score ", _jsx("strong", { children: "1" })] }), _jsxs("div", { children: [config.volatility_thresholds[0], "% - ", config.volatility_thresholds[1], "% = Score ", _jsx("strong", { children: "2" })] }), _jsxs("div", { children: [config.volatility_thresholds[1], "% - ", config.volatility_thresholds[2], "% = Score ", _jsx("strong", { children: "3" })] }), _jsxs("div", { children: [config.volatility_thresholds[2], "% - ", config.volatility_thresholds[3], "% = Score ", _jsx("strong", { children: "4" })] }), _jsxs("div", { children: ["> ", config.volatility_thresholds[3], "% = Score ", _jsx("strong", { children: matrixSize })] })] }) })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-md font-semibold mb-3", children: "Impact Score (Portfolio Value in Millions \u20A6)" }), _jsxs("p", { className: "text-sm text-gray-600 mb-4", children: ["Define portfolio values (\u20A6 millions) that map to impact scores 1-", matrixSize] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: config.value_thresholds.map((threshold, index) => (_jsxs("div", { children: [_jsxs(Label, { htmlFor: `val-${index}`, className: "text-sm", children: ["Score ", index + 1, " \u2192 ", index + 2] }), _jsxs("div", { className: "relative mt-1", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm", children: "\u20A6" }), _jsx(Input, { id: `val-${index}`, type: "number", min: "0", step: "1", value: threshold, onChange: (e) => handleValueChange(index, e.target.value), className: "pl-8 pr-8" }), _jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm", children: "M" })] })] }, index))) }), _jsx("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg text-xs", children: _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { children: ["< \u20A6", config.value_thresholds[0], "M = Score ", _jsx("strong", { children: "1" })] }), _jsxs("div", { children: ["\u20A6", config.value_thresholds[0], "M - \u20A6", config.value_thresholds[1], "M = Score ", _jsx("strong", { children: "2" })] }), _jsxs("div", { children: ["\u20A6", config.value_thresholds[1], "M - \u20A6", config.value_thresholds[2], "M = Score ", _jsx("strong", { children: "3" })] }), _jsxs("div", { children: ["\u20A6", config.value_thresholds[2], "M - \u20A6", config.value_thresholds[3], "M = Score ", _jsx("strong", { children: "4" })] }), _jsxs("div", { children: ["> \u20A6", config.value_thresholds[3], "M = Score ", _jsx("strong", { children: matrixSize })] })] }) })] }), _jsxs("div", { className: "flex gap-2 pt-4 border-t", children: [_jsx(Button, { onClick: handleSave, disabled: saving, className: "flex items-center gap-2", children: saving ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "h-4 w-4 animate-spin" }), "Saving..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "h-4 w-4" }), "Save Configuration"] })) }), _jsx(Button, { onClick: loadConfig, variant: "outline", disabled: saving, children: "Reset" })] })] })] }));
}
