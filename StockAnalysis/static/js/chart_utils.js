/**
 * Utility functions for creating and managing charts
 */

const chartColors = {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    light: '#f8f9fa',
    dark: '#212529',
    primaryLight: 'rgba(13, 110, 253, 0.2)',
    successLight: 'rgba(25, 135, 84, 0.15)',
    dangerLight: 'rgba(220, 53, 69, 0.15)',
    infoLight: 'rgba(13, 202, 240, 0.15)',
};

/**
 * Creates or updates a price chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array} dates - Array of date strings
 * @param {Array} prices - Array of price values
 * @param {Array} sma20 - Array of 20-day moving average values
 * @param {Array} sma50 - Array of 50-day moving average values
 * @param {Object} chartInstance - Existing chart instance (optional)
 * @returns {Object} The chart instance
 */
function createPriceChart(canvasId, dates, prices, sma20, sma50, chartInstance = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const data = {
        labels: dates,
        datasets: [
            {
                label: 'Stock Price',
                data: prices,
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primaryLight,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 10,
                pointHoverBackgroundColor: chartColors.primary,
                pointHoverBorderColor: '#fff',
                fill: false,
                tension: 0.1
            },
            {
                label: '20-Day MA',
                data: sma20,
                borderColor: chartColors.info,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                borderDash: [5, 5]
            },
            {
                label: '50-Day MA',
                data: sma50,
                borderColor: chartColors.warning,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                borderDash: [5, 5]
            }
        ]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { 
                                    style: 'currency', 
                                    currency: 'USD',
                                    minimumFractionDigits: 2
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                line: {
                    tension: 0.1
                }
            }
        }
    };
    
    // If chart already exists, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Create new chart
    return new Chart(ctx, config);
}

/**
 * Creates or updates a candlestick chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array} ohlcData - Array of OHLC data objects (open, high, low, close)
 * @param {Object} chartInstance - Existing chart instance (optional)
 * @returns {Object} The chart instance
 */
function createCandlestickChart(canvasId, ohlcData, chartInstance = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Prepare data for candlestick chart
    const candlestickData = ohlcData.map(item => ({
        x: new Date(item.x),
        o: item.o,
        h: item.h,
        l: item.l,
        c: item.c
    }));
    
    const data = {
        datasets: [{
            label: 'OHLC',
            data: candlestickData,
            color: {
                up: chartColors.success,
                down: chartColors.danger,
                unchanged: chartColors.secondary
            }
        }]
    };
    
    const config = {
        type: 'candlestick',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return [
                                'Open: ' + formatCurrency(point.o),
                                'High: ' + formatCurrency(point.h),
                                'Low: ' + formatCurrency(point.l),
                                'Close: ' + formatCurrency(point.c)
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    };
    
    // If chart already exists, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Since Chart.js doesn't have built-in candlestick chart type, we'll fake it with a custom renderer
    // This is a simplified version - in production, consider using a specialized library
    
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candlestickData.map(d => d.x),
            datasets: [
                {
                    label: 'OHLC',
                    data: candlestickData.map(d => {
                        // For the bar height, we use the difference between open and close
                        return d.c - d.o;
                    }),
                    backgroundColor: candlestickData.map(d => d.o <= d.c ? chartColors.success : chartColors.danger),
                    borderColor: candlestickData.map(d => d.o <= d.c ? chartColors.success : chartColors.danger),
                    borderWidth: 1
                },
                {
                    label: 'Wicks',
                    data: candlestickData.map(d => d.h),
                    type: 'line',
                    pointRadius: 0,
                    borderColor: 'rgba(0, 0, 0, 0)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            barPercentage: 0.3,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const point = candlestickData[index];
                            return [
                                'Open: ' + formatCurrency(point.o),
                                'High: ' + formatCurrency(point.h),
                                'Low: ' + formatCurrency(point.l),
                                'Close: ' + formatCurrency(point.c)
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price (USD)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
    
    // Draw wick lines manually
    const drawWicks = function() {
        const meta = myChart.getDatasetMeta(0);
        const ctx = myChart.ctx;
        
        ctx.save();
        ctx.lineWidth = 1;
        
        candlestickData.forEach((d, i) => {
            if (meta.data[i]) {
                const bar = meta.data[i];
                const x = bar.x;
                
                // Calculate y positions
                const yOpen = myChart.scales.y.getPixelForValue(d.o);
                const yClose = myChart.scales.y.getPixelForValue(d.c);
                const yHigh = myChart.scales.y.getPixelForValue(d.h);
                const yLow = myChart.scales.y.getPixelForValue(d.l);
                
                // Draw the wicks
                ctx.beginPath();
                ctx.strokeStyle = d.o <= d.c ? chartColors.success : chartColors.danger;
                
                // Upper wick
                const upperY = Math.min(yOpen, yClose);
                ctx.moveTo(x, upperY);
                ctx.lineTo(x, yHigh);
                
                // Lower wick
                const lowerY = Math.max(yOpen, yClose);
                ctx.moveTo(x, lowerY);
                ctx.lineTo(x, yLow);
                
                ctx.stroke();
            }
        });
        
        ctx.restore();
    };
    
    myChart.options.animation.onComplete = drawWicks;
    myChart.options.animation.onProgress = function() {
        drawWicks();
    };
    
    return myChart;
}

/**
 * Creates or updates a volume chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array} dates - Array of date strings
 * @param {Array} volumes - Array of volume values
 * @param {Object} chartInstance - Existing chart instance (optional)
 * @returns {Object} The chart instance
 */
function createVolumeChart(canvasId, dates, volumes, chartInstance = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const data = {
        labels: dates,
        datasets: [
            {
                label: 'Volume',
                data: volumes,
                backgroundColor: chartColors.infoLight,
                borderColor: chartColors.info,
                borderWidth: 1
            }
        ]
    };
    
    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US').format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Volume'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    };
    
    // If chart already exists, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Create new chart
    return new Chart(ctx, config);
}

/**
 * Creates or updates a returns chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array} dates - Array of date strings
 * @param {Array} returns - Array of return values
 * @param {Object} chartInstance - Existing chart instance (optional)
 * @returns {Object} The chart instance
 */
function createReturnsChart(canvasId, dates, returns, chartInstance = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const data = {
        labels: dates,
        datasets: [
            {
                label: 'Daily Returns (%)',
                data: returns,
                backgroundColor: returns.map(value => value >= 0 ? chartColors.successLight : chartColors.dangerLight),
                borderColor: returns.map(value => value >= 0 ? chartColors.success : chartColors.danger),
                borderWidth: 1
            }
        ]
    };
    
    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Return (%)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    };
    
    // If chart already exists, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Create new chart
    return new Chart(ctx, config);
}

/**
 * Creates or updates a prediction chart
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array} histDates - Array of historical date strings
 * @param {Array} histPrices - Array of historical price values
 * @param {Array} predDates - Array of prediction date strings
 * @param {Array} predPrices - Array of prediction price values
 * @param {Object} chartInstance - Existing chart instance (optional)
 * @returns {Object} The chart instance
 */
function createPredictionChart(canvasId, histDates, histPrices, predDates, predPrices, chartInstance = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Take just the last 30 days of historical data
    const cutoff = Math.max(0, histDates.length - 30);
    const recentHistDates = histDates.slice(cutoff);
    const recentHistPrices = histPrices.slice(cutoff);
    
    const data = {
        labels: [...recentHistDates, ...predDates],
        datasets: [
            {
                label: 'Historical',
                data: [...recentHistPrices, null],
                borderColor: chartColors.primary,
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 3,
                fill: false,
                tension: 0
            },
            {
                label: 'Prediction',
                data: [...Array(recentHistDates.length).fill(null), ...predPrices],
                borderColor: chartColors.warning,
                backgroundColor: chartColors.warningLight,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 3,
                borderDash: [5, 5],
                fill: false,
                tension: 0
            }
        ]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { 
                                    style: 'currency', 
                                    currency: 'USD',
                                    minimumFractionDigits: 2
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'PP'
                    },
                    title: {
                        display: false,
                        text: 'Date'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: false,
                        text: 'Price (USD)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    // Adjust scale behavior to prevent excessive stretching
                    beginAtZero: false,
                    // Calculate a reasonable range based on the data
                    suggestedMin: function() {
                        const allPrices = [...recentHistPrices, ...predPrices].filter(p => p !== null);
                        const min = Math.min(...allPrices);
                        const max = Math.max(...allPrices);
                        // Set min to be at most 10% lower than the minimum value
                        return min - (max - min) * 0.1;
                    }(),
                    suggestedMax: function() {
                        const allPrices = [...recentHistPrices, ...predPrices].filter(p => p !== null);
                        const min = Math.min(...allPrices);
                        const max = Math.max(...allPrices);
                        // Set max to be at most 10% higher than the maximum value
                        return max + (max - min) * 0.1;
                    }()
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    };
    
    // If chart already exists, destroy it
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Create new chart
    return new Chart(ctx, config);
}

/**
 * Formats a numeric value as currency
 * @param {number} value - The value to format
 * @returns {string} The formatted currency string
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

/**
 * Formats a large number with appropriate suffix (K, M, B, T)
 * @param {number} value - The value to format
 * @returns {string} The formatted number string
 */
function formatLargeNumber(value) {
    if (typeof value !== 'number') return 'N/A';
    
    if (value >= 1e12) {
        return (value / 1e12).toFixed(2) + 'T';
    } else if (value >= 1e9) {
        return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + 'K';
    } else {
        return value.toFixed(2);
    }
}

/**
 * Determines the color class for price change
 * @param {number} change - The price change value
 * @returns {string} The color class to use
 */
function getPriceChangeColorClass(change) {
    if (change > 0) {
        return 'text-success';
    } else if (change < 0) {
        return 'text-danger';
    } else {
        return 'text-muted';
    }
}

/**
 * Determines the color and icon for a stock recommendation
 * @param {string} recommendation - The recommendation text
 * @returns {Object} Object with color and icon classes
 */
function getRecommendationStyle(recommendation) {
    recommendation = recommendation.toLowerCase();
    
    if (recommendation.includes('strong buy')) {
        return {
            bgColor: 'bg-success',
            icon: 'fa-thumbs-up'
        };
    } else if (recommendation.includes('buy')) {
        return {
            bgColor: 'bg-success',
            icon: 'fa-check-circle'
        };
    } else if (recommendation.includes('hold')) {
        return {
            bgColor: 'bg-info',
            icon: 'fa-balance-scale'
        };
    } else if (recommendation.includes('strong sell')) {
        return {
            bgColor: 'bg-danger',
            icon: 'fa-thumbs-down'
        };
    } else if (recommendation.includes('sell')) {
        return {
            bgColor: 'bg-danger',
            icon: 'fa-times-circle'
        };
    } else {
        return {
            bgColor: 'bg-secondary',
            icon: 'fa-question-circle'
        };
    }
}

/**
 * Determines badge class for trend
 * @param {string} trend - The trend description
 * @returns {string} The badge class to use
 */
function getTrendBadgeClass(trend) {
    trend = trend.toLowerCase();
    
    if (trend.includes('uptrend') || trend.includes('bullish')) {
        return 'bg-success';
    } else if (trend.includes('downtrend') || trend.includes('bearish')) {
        return 'bg-danger';
    } else {
        return 'bg-info';
    }
}
