# VaR Analysis Excel Template - Instructions

## Overview
This template is used to upload portfolio data into the MinRisk VaR Sandbox for Value at Risk calculation using the variance-covariance method.

---

## File Structure

The Excel workbook should contain **3 sheets**:

1. **Portfolio_Holdings** - Current portfolio positions
2. **Price_History** - Historical price data for all assets
3. **Configuration** - VaR calculation parameters

---

## Sheet 1: Portfolio_Holdings

### Required Columns:
| Column Name     | Data Type | Description                                              | Example           |
|-----------------|-----------|----------------------------------------------------------|-------------------|
| Asset_Name      | Text      | Unique identifier for the asset (must match Price_History headers) | NGN 10Y Bond      |
| Asset_Type      | Text      | Type: Bond, Equity, FX, Other                           | Bond              |
| Quantity        | Number    | See quantity rules below                                 | 100,000,000       |
| Current_Price   | Number    | Latest market price (see price rules below)             | 98.50             |
| Notes           | Text      | Optional description                                     | Face value in NGN |

### Quantity Rules:
- **Bonds**: Face value in NGN
- **Equities**: Number of shares
- **FX Positions**: Notional amount in NGN

### Price Rules:
- **Bonds**: Clean price as percentage of par (e.g., 98.50 means 98.50% of face value)
- **Equities**: Price per share in NGN
- **FX**: Exchange rate

### Market Value Calculation:
The system automatically calculates market value:
- **Bonds**: Market Value = (Quantity × Current_Price) / 100
- **Equities**: Market Value = Quantity × Current_Price
- **FX**: Market Value = Quantity × Current_Price

### Example:
```
Asset_Name       | Asset_Type | Quantity    | Current_Price | Notes
NGN 10Y Bond     | Bond       | 100,000,000 | 98.50         | Face value; Price as % of par
Dangote Cement   | Equity     | 10,000      | 285.00        | Number of shares; Price per share
```

**Important**: Asset_Name must match exactly (case-sensitive) with column headers in Price_History sheet.

---

## Sheet 2: Price_History

### Structure:
- **First Column**: Date (DD-MMM-YYYY format, e.g., 01-Jan-2024)
- **Subsequent Columns**: One column per asset, header = Asset_Name from Portfolio_Holdings

### Data Requirements:
- **Minimum Data Points**:
  - Daily frequency: 252 observations (1 trading year)
  - Monthly frequency: 60 observations (5 years)
- **Date Format**: DD-MMM-YYYY (e.g., 01-Jan-2024, 15-Mar-2024)
- **Prices**: Same units as Current_Price in Portfolio_Holdings
  - Bonds: Price as % of par
  - Equities: Price per share in NGN

### Example:
```
Date         | NGN 10Y Bond | NGN 5Y T-Bill | Dangote Cement | Access Bank
01-Jan-2024  | 98.20        | 99.10         | 280.00         | 12.00
02-Jan-2024  | 98.25        | 99.15         | 281.50         | 12.10
03-Jan-2024  | 98.30        | 99.18         | 283.00         | 12.20
```

### Important Notes:
- All asset names in Portfolio_Holdings must have a corresponding column in Price_History
- Missing prices (blanks) are not allowed - use forward-fill or interpolation if needed
- Dates do not need to be consecutive, but should be ordered chronologically
- For monthly data, use end-of-month dates consistently

---

## Sheet 3: Configuration

### Parameters:
| Parameter               | Valid Values                  | Description                                    |
|-------------------------|-------------------------------|------------------------------------------------|
| Data_Frequency          | Daily, Weekly, Monthly        | Frequency of Price_History data                |
| Confidence_Level        | 90%, 95%, 99%, 99.9%          | Confidence level for VaR calculation           |
| Time_Horizon_Days       | 1, 10, 21, etc.               | Number of days for VaR projection              |
| Currency                | NGN                           | Base currency (only NGN supported in MVP)      |
| Min_Data_Points_Daily   | 252                           | Enforced minimum for daily data                |
| Min_Data_Points_Monthly | 60                            | Enforced minimum for monthly data              |

### Example:
```
Parameter              | Value  | Description
Data_Frequency         | Daily  | Daily, Weekly, or Monthly
Confidence_Level       | 95%    | 90%, 95%, 99%, or 99.9%
Time_Horizon_Days      | 1      | Number of days for VaR calculation
```

---

## Validation Rules

The system will validate:

1. **Asset Name Matching**: All assets in Portfolio_Holdings must exist in Price_History columns
2. **Data Sufficiency**:
   - Daily data must have ≥252 observations
   - Monthly data must have ≥60 observations
3. **No Missing Prices**: All price cells must contain numeric values
4. **Date Format**: Dates must be in DD-MMM-YYYY format
5. **Positive Values**: All quantities and prices must be positive numbers
6. **Asset Type**: Must be one of: Bond, Equity, FX, Other

---

## VaR Calculation Process

Once uploaded, the system will:

1. **Calculate Returns**: Convert prices to period-over-period returns
2. **Build Covariance Matrix**: Capture volatilities and correlations between assets
3. **Calculate Portfolio Weights**: Based on current market values
4. **Compute Portfolio Volatility**: Using variance-covariance method
5. **Calculate VaR**: Apply confidence level and time horizon
6. **Decompose into Likelihood/Impact**:
   - **Likelihood Score**: Normalized portfolio volatility → 1-5 scale
   - **Impact Score**: Total portfolio value → 1-5 scale

---

## Output

The system will display:

### Key Metrics:
- **Portfolio VaR (NGN)**: Maximum expected loss at chosen confidence level
- **Portfolio Volatility (%)**: Annualized standard deviation
- **Total Portfolio Value (NGN)**: Sum of all position market values
- **Individual Asset Contributions**: Breakdown of VaR by asset

### Risk Scores:
- **Likelihood Score (1-5)**: Based on portfolio volatility
- **Impact Score (1-5)**: Based on portfolio size

### Optional Transfer:
You can transfer these scores to the main MinRisk Risk Register as a quantitative financial risk.

---

## Tips for Data Preparation

1. **Bonds**: Ensure prices are in % of par, not absolute values
2. **Consistency**: Use the same price source throughout Price_History
3. **Corporate Actions**: Adjust equity prices for splits/dividends if necessary
4. **Gaps**: If using daily data, weekends/holidays will be skipped - this is fine
5. **Current Price**: Should match the last row in Price_History (or be more recent)

---

## Common Errors

| Error Message                          | Cause                                      | Solution                                    |
|----------------------------------------|---------------------------------------------|---------------------------------------------|
| "Asset not found in Price History"     | Asset_Name mismatch                        | Check spelling and case in both sheets      |
| "Insufficient data points"             | Not enough historical data                 | Add more rows to Price_History              |
| "Invalid date format"                  | Date not in DD-MMM-YYYY format             | Reformat dates (e.g., 01-Jan-2024)          |
| "Missing price data"                   | Blank cells in Price_History               | Fill all price cells with valid numbers     |
| "Non-numeric quantity/price"           | Text in numeric field                      | Ensure all quantities/prices are numbers    |

---

## Support

For questions or issues with the template, contact the Risk Management team.

**Template Version**: 1.0
**Last Updated**: January 2025
