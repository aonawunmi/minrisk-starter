// src/lib/varCalculations.ts
// Core VaR calculation engine using variance-covariance method
// =====================================================
// VALIDATION
// =====================================================
export function validateVarData(holdings, priceHistory, config) {
    const errors = [];
    // 1. Check asset name matching
    const holdingAssets = new Set(holdings.map(h => h.asset_name));
    const priceAssets = Object.keys(priceHistory[0]?.prices || {});
    for (const asset of holdingAssets) {
        if (!priceAssets.includes(asset)) {
            errors.push(`Asset "${asset}" not found in Price History sheet`);
        }
    }
    // 2. Check minimum data points
    const minPoints = config.data_frequency === 'Daily'
        ? config.min_data_points_daily
        : config.min_data_points_monthly;
    if (priceHistory.length < minPoints) {
        errors.push(`Insufficient data: ${priceHistory.length} rows, minimum ${minPoints} required for ${config.data_frequency} data`);
    }
    // 3. Check for missing prices
    for (let i = 0; i < priceHistory.length; i++) {
        for (const asset of priceAssets) {
            if (priceHistory[i].prices[asset] === null ||
                priceHistory[i].prices[asset] === undefined ||
                isNaN(priceHistory[i].prices[asset])) {
                errors.push(`Missing price for "${asset}" on row ${i + 1}`);
            }
        }
    }
    // 4. Check positive values
    for (const holding of holdings) {
        if (holding.quantity <= 0) {
            errors.push(`Invalid quantity for "${holding.asset_name}": must be positive`);
        }
        if (holding.current_price <= 0) {
            errors.push(`Invalid price for "${holding.asset_name}": must be positive`);
        }
    }
    // 5. Validate dates
    for (let i = 1; i < priceHistory.length; i++) {
        if (priceHistory[i].date <= priceHistory[i - 1].date) {
            errors.push(`Dates must be in chronological order (row ${i + 1})`);
        }
    }
    return { valid: errors.length === 0, errors };
}
// =====================================================
// RETURN CALCULATION
// =====================================================
export function calculateReturns(priceHistory) {
    const assetNames = Object.keys(priceHistory[0].prices);
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
        const periodReturns = [];
        for (const asset of assetNames) {
            const priceToday = priceHistory[i].prices[asset];
            const priceYesterday = priceHistory[i - 1].prices[asset];
            const return_ = (priceToday - priceYesterday) / priceYesterday;
            periodReturns.push(return_);
        }
        returns.push(periodReturns);
    }
    return { asset_names: assetNames, returns };
}
// =====================================================
// COVARIANCE MATRIX
// =====================================================
export function calculateCovarianceMatrix(returnsMatrix) {
    const { returns } = returnsMatrix;
    const n_assets = returns[0].length;
    const n_obs = returns.length;
    // Calculate means for each asset
    const means = returns[0].map((_, assetIdx) => {
        const assetReturns = returns.map(row => row[assetIdx]);
        return assetReturns.reduce((sum, r) => sum + r, 0) / n_obs;
    });
    // Calculate covariance matrix
    const covMatrix = [];
    for (let i = 0; i < n_assets; i++) {
        const row = [];
        for (let j = 0; j < n_assets; j++) {
            let covariance = 0;
            for (let t = 0; t < n_obs; t++) {
                covariance += (returns[t][i] - means[i]) * (returns[t][j] - means[j]);
            }
            covariance /= (n_obs - 1); // Sample covariance
            row.push(covariance);
        }
        covMatrix.push(row);
    }
    return covMatrix;
}
// =====================================================
// CORRELATION MATRIX
// =====================================================
export function calculateCorrelationMatrix(covMatrix, assetNames) {
    const n = covMatrix.length;
    const corrMatrix = [];
    // Extract standard deviations (sqrt of diagonal)
    const stdDevs = covMatrix.map((row, i) => Math.sqrt(row[i]));
    // Calculate correlation
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            const correlation = covMatrix[i][j] / (stdDevs[i] * stdDevs[j]);
            row.push(correlation);
        }
        corrMatrix.push(row);
    }
    return { asset_names: assetNames, matrix: corrMatrix };
}
// =====================================================
// PORTFOLIO CALCULATIONS
// =====================================================
export function calculatePortfolioWeights(holdings) {
    const weights = [];
    let totalValue = 0;
    // Calculate market values
    for (const holding of holdings) {
        const marketValue = holding.asset_type === 'Bond'
            ? (holding.quantity * holding.current_price) / 100
            : holding.quantity * holding.current_price;
        weights.push({
            asset_name: holding.asset_name,
            market_value: marketValue,
            weight: 0 // Will be calculated after totalValue is known
        });
        totalValue += marketValue;
    }
    // Calculate weights
    for (const weight of weights) {
        weight.weight = weight.market_value / totalValue;
    }
    return weights;
}
export function calculatePortfolioVariance(weights, covMatrix) {
    const n = weights.length;
    let variance = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            variance += weights[i] * weights[j] * covMatrix[i][j];
        }
    }
    return variance;
}
// =====================================================
// VAR CALCULATION
// =====================================================
function getZScore(confidenceLevel) {
    const zScores = {
        90: 1.282,
        95: 1.645,
        99: 2.326,
        99.9: 3.090
    };
    return zScores[confidenceLevel] || 1.645; // Default to 95%
}
export function calculateVaR(portfolioValue, portfolioVariance, confidenceLevel, timeHorizonDays, dataFrequency) {
    const zScore = getZScore(confidenceLevel);
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    // Annualize volatility based on data frequency
    const periodsPerYear = dataFrequency === 'Daily' ? 252 :
        dataFrequency === 'Weekly' ? 52 : 12;
    const annualizedVol = portfolioStdDev * Math.sqrt(periodsPerYear);
    // Scale to time horizon
    const horizonScaling = Math.sqrt(timeHorizonDays / periodsPerYear);
    // Calculate VaR
    const var_ = portfolioValue * annualizedVol * zScore * horizonScaling;
    return var_;
}
// =====================================================
// ASSET CONTRIBUTION
// =====================================================
export function calculateAssetContributions(holdings, portfolioWeights, covMatrix, portfolioVar, zScore, periodsPerYear, timeHorizonDays) {
    const n = holdings.length;
    const contributions = [];
    // Extract weights as array
    const weights = portfolioWeights.map(pw => pw.weight);
    // Calculate portfolio standard deviation
    const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    // Time horizon scaling factor
    const horizonScaling = Math.sqrt(timeHorizonDays / periodsPerYear);
    for (let i = 0; i < n; i++) {
        // Marginal contribution = (Σ × w)_i / σ_p
        let marginalContribution = 0;
        for (let j = 0; j < n; j++) {
            marginalContribution += covMatrix[i][j] * weights[j];
        }
        marginalContribution /= portfolioStdDev;
        // Component VaR = w_i × Marginal VaR × Portfolio VaR / Portfolio StdDev
        const componentVar = weights[i] * marginalContribution * portfolioVar / portfolioStdDev;
        // Calculate Standalone VaR for this asset (as if 100% allocated to it)
        const assetVolatility = Math.sqrt(covMatrix[i][i]); // Daily/period standard deviation of asset i
        const annualizedAssetVol = assetVolatility * Math.sqrt(periodsPerYear);
        // Apply time horizon and cap at market value (cannot lose more than 100%)
        const standaloneVarUncapped = portfolioWeights[i].market_value * annualizedAssetVol * zScore * horizonScaling;
        const standaloneVar = Math.min(standaloneVarUncapped, portfolioWeights[i].market_value);
        // Diversification benefit
        const diversificationBenefit = standaloneVar - componentVar;
        contributions.push({
            asset_name: holdings[i].asset_name,
            market_value: portfolioWeights[i].market_value,
            weight: weights[i],
            standalone_var: standaloneVar,
            var_contribution: componentVar,
            var_contribution_pct: (componentVar / portfolioVar) * 100,
            diversification_benefit: diversificationBenefit
        });
    }
    return contributions;
}
// =====================================================
// SCALE MAPPING
// =====================================================
export function mapVolatilityToLikelihood(volatility, thresholds, matrixSize) {
    const vol = volatility * 100; // Convert to percentage
    if (vol < thresholds[0])
        return 1;
    if (vol < thresholds[1])
        return 2;
    if (vol < thresholds[2])
        return 3;
    if (vol < thresholds[3])
        return 4;
    if (matrixSize === 6 && thresholds.length > 4 && vol < thresholds[4])
        return 5;
    return matrixSize;
}
export function mapValueToImpact(portfolioValue, thresholds, matrixSize) {
    const valueInMillions = portfolioValue / 1000000;
    if (valueInMillions < thresholds[0])
        return 1;
    if (valueInMillions < thresholds[1])
        return 2;
    if (valueInMillions < thresholds[2])
        return 3;
    if (valueInMillions < thresholds[3])
        return 4;
    if (matrixSize === 6 && thresholds.length > 4 && valueInMillions < thresholds[4])
        return 5;
    return matrixSize;
}
// =====================================================
// MAIN VAR CALCULATION FUNCTION
// =====================================================
export function performVarCalculation(holdings, priceHistory, config, scaleConfig, matrixSize) {
    // 1. Calculate returns
    const returnsMatrix = calculateReturns(priceHistory);
    // 2. Calculate covariance matrix
    const covMatrix = calculateCovarianceMatrix(returnsMatrix);
    // 3. Calculate correlation matrix
    const corrMatrix = calculateCorrelationMatrix(covMatrix, returnsMatrix.asset_names);
    // 4. Calculate portfolio weights
    const portfolioWeights = calculatePortfolioWeights(holdings);
    const totalPortfolioValue = portfolioWeights.reduce((sum, pw) => sum + pw.market_value, 0);
    // 5. Calculate portfolio variance
    const weights = portfolioWeights.map(pw => pw.weight);
    const portfolioVariance = calculatePortfolioVariance(weights, covMatrix);
    // 6. Calculate VaR
    const zScore = getZScore(config.confidence_level);
    const portfolioVar = calculateVaR(totalPortfolioValue, portfolioVariance, config.confidence_level, config.time_horizon_days, config.data_frequency);
    // 7. Calculate asset contributions (with standalone VaR)
    const periodsPerYear = config.data_frequency === 'Daily' ? 252 :
        config.data_frequency === 'Weekly' ? 52 : 12;
    const assetContributions = calculateAssetContributions(holdings, portfolioWeights, covMatrix, portfolioVar, zScore, periodsPerYear, config.time_horizon_days);
    // 8. Calculate portfolio volatility (annualized)
    const portfolioStdDev = Math.sqrt(portfolioVariance);
    const annualizedVol = portfolioStdDev * Math.sqrt(periodsPerYear);
    // 9. Map to Likelihood/Impact scores
    const likelihoodScore = mapVolatilityToLikelihood(annualizedVol, scaleConfig.volatility_thresholds, matrixSize);
    const impactScore = mapValueToImpact(totalPortfolioValue, scaleConfig.value_thresholds, matrixSize);
    // 10. Return results
    return {
        portfolio_var: portfolioVar,
        portfolio_volatility: annualizedVol,
        total_portfolio_value: totalPortfolioValue,
        data_points_count: priceHistory.length,
        likelihood_score: likelihoodScore,
        impact_score: impactScore,
        asset_contributions: assetContributions,
        correlation_matrix: corrMatrix,
        covariance_matrix: covMatrix,
        confidence_level: config.confidence_level,
        time_horizon_days: config.time_horizon_days,
        calculation_date: new Date()
    };
}
