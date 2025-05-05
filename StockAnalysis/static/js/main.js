// Global variable to store current currency symbol
window.currentCurrencySymbol = '$';

document.addEventListener('DOMContentLoaded', function() {
    // Chart instances
    let priceChart = null;
    let candlestickChart = null;
    let volumeChart = null;
    let returnsChart = null;
    let predictionChart = null;
    
    // DOM Elements
    const stockForm = document.getElementById('stockForm');
    const tickerInput = document.getElementById('tickerInput');
    const periodSelect = document.getElementById('periodSelect');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    const resultsSection = document.getElementById('resultsSection');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    
    // Event Listeners
    stockForm.addEventListener('submit', handleFormSubmit);
    downloadCsvBtn.addEventListener('click', handleDownloadCsv);
    
    /**
     * Handle form submission
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const ticker = tickerInput.value.trim();
        const period = periodSelect.value;
        
        if (!ticker) {
            showError('Please enter a valid stock symbol');
            return;
        }
        
        fetchStockData(ticker, period);
    }
    
    /**
     * Fetch stock data from the API
     */
    function fetchStockData(ticker, period) {
        // Show loading, hide results and error
        showLoading();
        
        fetch(`/api/stock_data?ticker=${ticker}&period=${period}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showError(data.error);
                } else {
                    renderStockData(data, ticker);
                }
            })
            .catch(error => {
                showError(`Failed to fetch data: ${error.message}`);
                console.error('Error:', error);
            })
            .finally(() => {
                hideLoading();
            });
    }
    
    /**
     * Handle CSV download request
     */
    function handleDownloadCsv() {
        const ticker = tickerInput.value.trim();
        const period = periodSelect.value;
        
        if (!ticker) {
            showError('Please enter a valid stock symbol');
            return;
        }
        
        // Create download URL and trigger download
        const downloadUrl = `/api/download_csv?ticker=${ticker}&period=${period}`;
        window.location.href = downloadUrl;
    }
    
    /**
     * Render stock data in the UI
     */
    function renderStockData(data, ticker) {
        // Show results section
        resultsSection.classList.remove('d-none');
        
        // Fill in company information
        document.getElementById('companyName').textContent = data.info.name;
        document.getElementById('tickerSymbol').textContent = ticker;
        document.getElementById('companyDescription').textContent = data.info.description;
        document.getElementById('companySector').textContent = data.info.sector;
        document.getElementById('companyIndustry').textContent = data.info.industry;
        document.getElementById('companyCountry').textContent = data.info.country;
        document.getElementById('companyEmployees').textContent = formatNumber(data.info.employees);
        
        // Get currency symbol for formatting
        const currencySymbol = data.metrics.currency_symbol || '$';
        
        // Custom currency formatter function
        function formatMetricCurrency(value) {
            if (value === 'N/A' || value === null || value === undefined) return 'N/A';
            return `${currencySymbol}${Number(value).toFixed(2)}`;
        }
        
        // Fill in quick stats
        document.getElementById('currentPrice').textContent = formatMetricCurrency(data.metrics.current_price);
        document.getElementById('marketCap').textContent = data.metrics.market_cap_formatted;
        document.getElementById('peRatio').textContent = formatValue(data.metrics.pe_ratio);
        document.getElementById('fiftyTwoWeekRange').textContent = `${formatMetricCurrency(data.metrics.fifty_two_week_low)} - ${formatMetricCurrency(data.metrics.fifty_two_week_high)}`;
        document.getElementById('dividendYield').textContent = data.metrics.dividend_yield === 'N/A' ? 'N/A' : `${data.metrics.dividend_yield}%`;
        
        // Fill in technical analysis
        const priceChange = data.data.stats.price_change;
        const priceChangePercent = data.data.stats.price_change_percent;
        const priceChangeEl = document.getElementById('priceChange');
        priceChangeEl.textContent = `${formatMetricCurrency(priceChange)} (${priceChangePercent.toFixed(2)}%)`;
        priceChangeEl.className = `badge ${priceChange >= 0 ? 'bg-success' : 'bg-danger'}`;
        
        document.getElementById('volatility').textContent = `${data.data.stats.volatility.toFixed(2)}%`;
        document.getElementById('avgPrice').textContent = formatMetricCurrency(data.data.stats.avg_price);
        
        const trendEl = document.getElementById('currentTrend');
        trendEl.textContent = data.recommendation.trend;
        trendEl.className = `badge ${getTrendBadgeClass(data.recommendation.trend)}`;
        
        document.getElementById('rsiValue').textContent = data.recommendation.rsi;
        
        // Fill in recommendation
        const recText = document.getElementById('recommendationText');
        recText.textContent = data.recommendation.recommendation;
        
        const recCard = document.getElementById('recommendationCard');
        const recStyle = getRecommendationStyle(data.recommendation.recommendation);
        recCard.className = `card h-100 ${recStyle.bgColor}`;
        
        const recIcon = document.getElementById('recommendationIcon');
        recIcon.className = `fas ${recStyle.icon}`;
        
        document.getElementById('recommendationExplanation').textContent = data.recommendation.explanation;
        
        // Fill in analysis details
        document.getElementById('analystConsensus').textContent = capitalizeFirstLetter(data.recommendation.analyst_recommendation);
        document.getElementById('priceTarget').textContent = formatMetricCurrency(data.recommendation.target_mean_price);
        
        const potentialReturn = document.getElementById('potentialReturn');
        potentialReturn.textContent = `${data.recommendation.target_potential}%`;
        potentialReturn.className = data.recommendation.target_potential >= 0 ? 'text-success' : 'text-danger';
        
        const pricePrediction = document.getElementById('pricePrediction');
        pricePrediction.textContent = `${formatMetricCurrency(data.recommendation.predicted_price)} (${data.recommendation.predicted_change}%)`;
        pricePrediction.className = data.recommendation.predicted_change >= 0 ? 'text-success' : 'text-danger';
        
        document.getElementById('trendAnalysis').textContent = data.recommendation.trend;
        
        // Populate metrics table
        populateMetricsTable(data.metrics);
        
        // Create charts
        createStockCharts(data);
    }
    
    /**
     * Populate metrics table with data
     */
    function populateMetricsTable(metrics) {
        const table = document.getElementById('metricsTable');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        
        // Get currency symbol (from backend) or use $ as fallback
        const currencySymbol = metrics.currency_symbol || '$';
        
        // Custom currency formatter with the correct symbol
        function formatMetricCurrency(value) {
            if (value === 'N/A' || value === null || value === undefined) return 'N/A';
            return `${currencySymbol}${Number(value).toFixed(2)}`;
        }
        
        // Define metrics to display
        const metricsToDisplay = [
            { name: 'Current Price', value: formatMetricCurrency(metrics.current_price) },
            { name: 'Previous Close', value: formatMetricCurrency(metrics.previous_close) },
            { name: 'Open', value: formatMetricCurrency(metrics.open) },
            { name: 'Day Range', value: `${formatMetricCurrency(metrics.day_low)} - ${formatMetricCurrency(metrics.day_high)}` },
            { name: '52 Week Range', value: `${formatMetricCurrency(metrics.fifty_two_week_low)} - ${formatMetricCurrency(metrics.fifty_two_week_high)}` },
            { name: 'Volume', value: formatNumber(metrics.volume) },
            { name: 'Average Volume', value: formatNumber(metrics.avg_volume) },
            { name: 'Market Cap', value: metrics.market_cap_formatted },
            { name: 'P/E Ratio', value: formatValue(metrics.pe_ratio) },
            { name: 'EPS (TTM)', value: formatMetricCurrency(metrics.eps) },
            { name: 'Forward P/E', value: formatValue(metrics.forward_pe) },
            { name: 'Dividend Yield', value: metrics.dividend_yield === 'N/A' ? 'N/A' : `${metrics.dividend_yield}%` },
            { name: 'Beta', value: formatValue(metrics.beta) },
            { name: 'Target Mean Price', value: formatMetricCurrency(metrics.target_mean_price) },
            { name: 'Target High Price', value: formatMetricCurrency(metrics.target_high_price) },
            { name: 'Target Low Price', value: formatMetricCurrency(metrics.target_low_price) },
            { name: 'Analyst Recommendation', value: capitalizeFirstLetter(metrics.recommendation_key) }
        ];
        
        // Create table rows
        metricsToDisplay.forEach(metric => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const valueCell = document.createElement('td');
            
            nameCell.textContent = metric.name;
            valueCell.textContent = metric.value;
            
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });
    }
    
    /**
     * Create all stock charts
     */
    function createStockCharts(data) {
        // Get chart data
        const { dates, prices, volumes, sma20, sma50, daily_returns, ohlc } = data.data;
        const { prediction } = data.recommendation;
        
        // Create price chart
        priceChart = createPriceChart('priceChart', dates, prices, sma20, sma50, priceChart);
        
        // Create candlestick chart
        try {
            candlestickChart = createCandlestickChart('candlestickChart', ohlc, candlestickChart);
        } catch(e) {
            console.error('Error creating candlestick chart:', e);
            // Fallback to line chart if candlestick fails
            candlestickChart = createPriceChart('candlestickChart', dates, prices, [], [], candlestickChart);
        }
        
        // Create volume chart
        volumeChart = createVolumeChart('volumeChart', dates, volumes, volumeChart);
        
        // Create returns chart
        returnsChart = createReturnsChart('returnsChart', dates, daily_returns, returnsChart);
        
        // Create prediction chart
        predictionChart = createPredictionChart(
            'predictionChart',
            dates,
            prices,
            prediction.dates,
            prediction.prices,
            predictionChart
        );
    }
    
    /**
     * Show loading spinner
     */
    function showLoading() {
        loadingSpinner.classList.remove('d-none');
        errorAlert.classList.add('d-none');
        resultsSection.classList.add('d-none');
    }
    
    /**
     * Hide loading spinner
     */
    function hideLoading() {
        loadingSpinner.classList.add('d-none');
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        errorAlert.classList.remove('d-none');
        errorMessage.textContent = message;
        resultsSection.classList.add('d-none');
    }
    
    /**
     * Format number with commas
     */
    function formatNumber(value) {
        if (value === 'N/A' || value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US').format(value);
    }
    
    /**
     * Format value with fallback
     */
    function formatValue(value) {
        if (value === 'N/A' || value === null || value === undefined) return 'N/A';
        return value.toFixed(2);
    }
    
    /**
     * Capitalize first letter of a string
     */
    function capitalizeFirstLetter(string) {
        if (typeof string !== 'string') return 'N/A';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Check for URL parameters to auto-load a stock
    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const ticker = urlParams.get('ticker');
        const period = urlParams.get('period');
        
        if (ticker) {
            tickerInput.value = ticker;
            if (period) {
                periodSelect.value = period;
            }
            stockForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Check URL parameters on page load
    checkUrlParams();
});
