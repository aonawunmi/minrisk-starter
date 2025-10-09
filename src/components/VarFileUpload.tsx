// src/components/VarFileUpload.tsx
import { useState } from 'react';
import { FileUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseVarExcelFile, downloadVarTemplate } from '@/lib/varExcelParser';
import type { VarUploadData } from '@/lib/varTypes';

type VarFileUploadProps = {
  onUpload: (data: VarUploadData) => void;
  onError: (error: string) => void;
};

export function VarFileUpload({ onUpload, onError }: VarFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
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
    } catch (error: any) {
      onError(error.message || 'Failed to parse Excel file');
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadVarTemplate();
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">📁 Upload Portfolio Data</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="var-file-input"
            disabled={isProcessing}
          />
          <label htmlFor="var-file-input" className="cursor-pointer">
            <FileUp className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isProcessing
                ? 'Processing file...'
                : isDragging
                ? 'Drop the file here...'
                : "Drag 'n' drop an Excel file here, or click to select"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Required sheets: Portfolio_Holdings, Price_History, Configuration
            </p>
          </label>
        </div>

        {fileName && !isProcessing && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ File loaded: <span className="font-medium">{fileName}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
