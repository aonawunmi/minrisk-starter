// src/lib/varExcelParser.ts
// Excel file parsing for VaR analysis

import * as XLSX from 'xlsx';
import type {
  PortfolioHolding,
  PriceHistoryRow,
  VarConfig,
  VarUploadData,
  AssetType,
  DataFrequency
} from './varTypes';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function parseDate(value: any): Date {
  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  // Handle date strings
  if (typeof value === 'string') {
    // Try DD-MMM-YYYY format
    const parts = value.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const month = monthMap[parts[1]];
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }

  // Try native Date parsing
  return new Date(value);
}

function cleanString(value: any): string {
  return String(value || '').trim();
}

function parseNumber(value: any): number {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// =====================================================
// PARSE PORTFOLIO HOLDINGS
// =====================================================

function parsePortfolioHoldings(worksheet: XLSX.WorkSheet): PortfolioHolding[] {
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);
  const holdings: PortfolioHolding[] = [];

  for (const row of data) {
    // Support both underscore and space in column names
    const assetName = cleanString(row.Asset_Name || row['Asset Name'] || row.asset_name);
    const assetType = cleanString(row.Asset_Type || row['Asset Type'] || row.asset_type) as AssetType;
    const quantity = parseNumber(row.Quantity || row.quantity);
    const currentPrice = parseNumber(row.Current_Price || row['Current Price'] || row.current_price);
    const notes = cleanString(row.Notes || row.notes);

    if (assetName && assetType && quantity > 0 && currentPrice > 0) {
      holdings.push({
        asset_name: assetName,
        asset_type: assetType,
        quantity: quantity,
        current_price: currentPrice,
        notes: notes
      });
    }
  }

  return holdings;
}

// =====================================================
// PARSE PRICE HISTORY
// =====================================================

function parsePriceHistory(worksheet: XLSX.WorkSheet): PriceHistoryRow[] {
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);
  const priceHistory: PriceHistoryRow[] = [];

  for (const row of data) {
    const dateValue = row.Date || row.date;
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    const prices: Record<string, number> = {};

    // Extract all columns except Date
    for (const key in row) {
      if (key.toLowerCase() !== 'date') {
        const price = parseNumber(row[key]);
        if (!isNaN(price)) {
          prices[key] = price;
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      priceHistory.push({ date, prices });
    }
  }

  // Sort by date
  priceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  return priceHistory;
}

// =====================================================
// PARSE CONFIGURATION
// =====================================================

function parseConfiguration(worksheet: XLSX.WorkSheet): VarConfig {
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);
  const configMap: Record<string, any> = {};

  for (const row of data) {
    const param = cleanString(row.Parameter || row.parameter);
    const value = row.Value || row.value;
    if (param) {
      configMap[param] = value;
    }
  }

  // Parse with defaults
  const dataFrequency = cleanString(configMap.Data_Frequency || configMap.data_frequency || 'Daily') as DataFrequency;
  const confidenceLevelStr = cleanString(configMap.Confidence_Level || configMap.confidence_level || '95%');
  const confidenceLevel = parseFloat(confidenceLevelStr.replace('%', '')) as 90 | 95 | 99 | 99.9;
  const timeHorizonDays = parseNumber(configMap.Time_Horizon_Days || configMap.time_horizon_days || 1);

  return {
    data_frequency: dataFrequency,
    confidence_level: confidenceLevel,
    time_horizon_days: timeHorizonDays,
    currency: 'NGN',
    min_data_points_daily: 252,
    min_data_points_monthly: 60
  };
}

// =====================================================
// MAIN PARSE FUNCTION
// =====================================================

export function parseVarExcelFile(file: File): Promise<VarUploadData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // Check for required sheets
        const requiredSheets = ['Portfolio_Holdings', 'Price_History', 'Configuration'];
        const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));

        if (missingSheets.length > 0) {
          reject(new Error(`Missing required sheets: ${missingSheets.join(', ')}`));
          return;
        }

        // Parse each sheet
        const holdingsSheet = workbook.Sheets['Portfolio_Holdings'];
        const historySheet = workbook.Sheets['Price_History'];
        const configSheet = workbook.Sheets['Configuration'];

        const holdings = parsePortfolioHoldings(holdingsSheet);
        const priceHistory = parsePriceHistory(historySheet);
        const config = parseConfiguration(configSheet);

        // Basic validation
        if (holdings.length === 0) {
          reject(new Error('No valid portfolio holdings found'));
          return;
        }

        if (priceHistory.length === 0) {
          reject(new Error('No valid price history found'));
          return;
        }

        resolve({
          holdings,
          priceHistory,
          config
        });

      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

// =====================================================
// DOWNLOAD TEMPLATE
// =====================================================

export function downloadVarTemplate() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Portfolio Holdings sheet
  const holdingsData = [
    ['Asset_Name', 'Asset_Type', 'Quantity', 'Current_Price', 'Notes'],
    ['NGN 10Y Bond', 'Bond', 100000000, 98.50, 'Face value in NGN; Price as % of par'],
    ['NGN 5Y T-Bill', 'Bond', 50000000, 99.20, 'Face value in NGN; Price as % of par'],
    ['Dangote Cement', 'Equity', 10000, 285.00, 'Number of shares; Price per share in NGN'],
    ['Access Bank', 'Equity', 25000, 12.50, 'Number of shares; Price per share in NGN']
  ];
  const wsHoldings = XLSX.utils.aoa_to_sheet(holdingsData);
  XLSX.utils.book_append_sheet(wb, wsHoldings, 'Portfolio_Holdings');

  // Price History sheet (sample 15 days)
  const historyHeaders = ['Date', 'NGN 10Y Bond', 'NGN 5Y T-Bill', 'Dangote Cement', 'Access Bank'];
  const historyData: any[][] = [historyHeaders];

  const startDate = new Date('2024-01-01');
  for (let i = 0; i < 15; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}-${date.toLocaleString('en', {month: 'short'})}-${date.getFullYear()}`;

    historyData.push([
      dateStr,
      98.20 + Math.random() * 0.5,
      99.10 + Math.random() * 0.2,
      280.00 + Math.random() * 10,
      12.00 + Math.random() * 0.5
    ]);
  }
  const wsHistory = XLSX.utils.aoa_to_sheet(historyData);
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Price_History');

  // Configuration sheet
  const configData = [
    ['Parameter', 'Value', 'Description'],
    ['Data_Frequency', 'Daily', 'Daily, Weekly, or Monthly'],
    ['Confidence_Level', '95%', '90%, 95%, 99%, or 99.9%'],
    ['Time_Horizon_Days', 1, 'Number of days for VaR calculation'],
    ['Currency', 'NGN', 'Base currency for all positions'],
    ['Min_Data_Points_Daily', 252, 'Minimum historical observations for daily data'],
    ['Min_Data_Points_Monthly', 60, 'Minimum historical observations for monthly data']
  ];
  const wsConfig = XLSX.utils.aoa_to_sheet(configData);
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configuration');

  // Generate file and trigger download
  XLSX.writeFile(wb, 'VaR_Portfolio_Template.xlsx');
}
