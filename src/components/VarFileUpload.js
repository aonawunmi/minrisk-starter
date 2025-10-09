import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/VarFileUpload.tsx
import { useState } from 'react';
import { FileUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseVarExcelFile, downloadVarTemplate } from '@/lib/varExcelParser';
export function VarFileUpload({ onUpload, onError }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState(null);
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => {
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };
    const processFile = async (file) => {
        // Check file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            onError('Please upload an Excel file (.xlsx or .xls)');
            return;
        }
        setIsProcessing(true);
        setFileName(file.name);
        try {
            const data = await parseVarExcelFile(file);
            onUpload(data);
        }
        catch (error) {
            onError(error.message || 'Failed to parse Excel file');
            setFileName(null);
        }
        finally {
            setIsProcessing(false);
        }
    };
    const handleDownloadTemplate = () => {
        downloadVarTemplate();
    };
    return (_jsxs(Card, { className: "rounded-2xl shadow-sm", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsx(CardTitle, { className: "text-lg", children: "\uD83D\uDCC1 Upload Portfolio Data" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: handleDownloadTemplate, className: "flex items-center gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), "Download Template"] })] }), _jsxs(CardContent, { children: [_jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, className: `
            p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `, children: [_jsx("input", { type: "file", accept: ".xlsx,.xls", onChange: handleFileSelect, className: "hidden", id: "var-file-input", disabled: isProcessing }), _jsxs("label", { htmlFor: "var-file-input", className: "cursor-pointer", children: [_jsx(FileUp, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("p", { className: "mt-2 text-sm text-gray-600", children: isProcessing
                                            ? 'Processing file...'
                                            : isDragging
                                                ? 'Drop the file here...'
                                                : "Drag 'n' drop an Excel file here, or click to select" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Required sheets: Portfolio_Holdings, Price_History, Configuration" })] })] }), fileName && !isProcessing && (_jsx("div", { className: "mt-4 p-3 bg-green-50 border border-green-200 rounded-lg", children: _jsxs("p", { className: "text-sm text-green-800", children: ["\u2713 File loaded: ", _jsx("span", { className: "font-medium", children: fileName })] }) }))] })] }));
}
