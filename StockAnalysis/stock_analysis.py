import yfinance as yf
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def format_ticker(ticker):
    """
    Format the ticker symbol correctly for different markets
    Special handling for Indian stocks and US stocks
    """
    ticker = ticker.upper().strip()
    
    # Check if ticker already has exchange suffix
    if '.' in ticker:
        return ticker
    
    # Check if it's an Indian stock pattern
    if ticker.endswith('-NSE') or ticker.endswith('-BSE'):
        parts = ticker.split('-')
        base_ticker = parts[0]
        exchange = parts[1]
        if exchange == 'NSE':
            return f"{base_ticker}.NS"
        elif exchange == 'BSE':
            return f"{base_ticker}.BO"
    
    # Common US stock patterns - usually 1-5 letters
    us_stock_pattern = len(ticker) <= 5 and ticker.isalpha()
    
    # Common Indian stock patterns - usually longer names
    indian_stock_pattern = len(ticker) > 5 and ticker.isalpha()
    
    # Companies that are known US stocks (common tickers that might be misidentified)
    known_us_stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX']
    
    if ticker in known_us_stocks or us_stock_pattern:
        return ticker  # Return as-is for US stocks
    elif indian_stock_pattern:
        # For Indian stocks that don't have a suffix, default to NSE
        if not (ticker.endswith('.NS') or ticker.endswith('.BO')):
            return f"{ticker}.NS"
    
    # For any other case, return as-is
    return ticker

def get_stock_dataframe(ticker, period='1y'):
    """
    Get stock data as a dataframe for the given ticker and period
    """
    try:
        # yf.pdr_override()
        import requests
        # Test internet connectivity
        try:
            requests.get("https://finance.yahoo.com", timeout=5)
        except requests.RequestException as e:
            raise ConnectionError(f"Unable to connect to Yahoo Finance. Please check your internet connection: {str(e)}")

        # Format ticker symbol correctly
        formatted_ticker = format_ticker(ticker)
        logging.info(f"Fetching data for {ticker} (formatted as {formatted_ticker})")
        
        stock = yf.Ticker(formatted_ticker)
        hist = stock.history(period=period)
        if hist.empty:
            # If empty and potentially an Indian stock, try with the other exchange
            if '.NS' in formatted_ticker:
                alternative = formatted_ticker.replace('.NS', '.BO')
                logging.info(f"No data found on NSE, trying BSE: {alternative}")
                stock = yf.Ticker(alternative)
                hist = stock.history(period=period)
            elif '.BO' in formatted_ticker:
                alternative = formatted_ticker.replace('.BO', '.NS')
                logging.info(f"No data found on BSE, trying NSE: {alternative}")
                stock = yf.Ticker(alternative)
                hist = stock.history(period=period)
        
        if hist.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        return hist
    except Exception as e:
        logging.error(f"Error fetching stock data for {ticker}: {str(e)}")
        raise

def get_stock_data(ticker, period='1y'):
    """
    Get stock data for the given ticker and period
    Returns data formatted for chart.js
    """
    df = get_stock_dataframe(ticker, period)
    
    # Format dates for Chart.js
    dates = df.index.strftime('%Y-%m-%d').tolist()
    
    # Get price data
    prices = df['Close'].round(2).tolist()
    volumes = df['Volume'].tolist()
    
    # Calculate simple moving averages
    df['SMA20'] = df['Close'].rolling(window=20).mean().round(2)
    df['SMA50'] = df['Close'].rolling(window=50).mean().round(2)
    
    # Fill NaN values for JSON serialization (with numeric value for JSON compatibility)
    sma20 = df['SMA20'].fillna(0).tolist()
    sma50 = df['SMA50'].fillna(0).tolist()
    
    # Calculate daily returns
    df['Daily_Return'] = df['Close'].pct_change() * 100
    # Replace NaN values with None for JSON serialization
    daily_returns = df['Daily_Return'].round(2).fillna(0).tolist()
    
    # Get OHLC data
    ohlc = []
    for date, row in df.iterrows():
        ohlc.append({
            'x': date.strftime('%Y-%m-%d'),
            'o': round(row['Open'], 2),
            'h': round(row['High'], 2),
            'l': round(row['Low'], 2),
            'c': round(row['Close'], 2),
        })
    
    # Calculate statistics
    stats = {
        'avg_price': round(df['Close'].mean(), 2),
        'min_price': round(df['Close'].min(), 2),
        'max_price': round(df['Close'].max(), 2),
        'start_price': round(df['Close'].iloc[0], 2),
        'end_price': round(df['Close'].iloc[-1], 2),
        'price_change': round(df['Close'].iloc[-1] - df['Close'].iloc[0], 2),
        'price_change_percent': round(((df['Close'].iloc[-1] / df['Close'].iloc[0]) - 1) * 100, 2),
        'volatility': round(df['Daily_Return'].fillna(0).std(), 2)
    }
    
    return {
        'dates': dates,
        'prices': prices,
        'volumes': volumes,
        'sma20': sma20,
        'sma50': sma50,
        'daily_returns': daily_returns,
        'ohlc': ohlc,
        'stats': stats
    }

def get_company_info(ticker):
    """
    Get company information for the given ticker
    """
    try:
        # Format ticker symbol correctly
        formatted_ticker = format_ticker(ticker)
        stock = yf.Ticker(formatted_ticker)
        info = stock.info
        
        # Extract relevant information
        company_info = {
            'name': info.get('shortName', 'N/A'),
            'logo_url': info.get('logo_url', ''),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'website': info.get('website', 'N/A'),
            'description': info.get('longBusinessSummary', 'N/A'),
            'country': info.get('country', 'N/A'),
            'employees': info.get('fullTimeEmployees', 'N/A'),
            'exchange': info.get('exchange', 'N/A'),
        }
        
        return company_info
    except Exception as e:
        logging.error(f"Error fetching company info for {ticker}: {str(e)}")
        return {
            'name': ticker,
            'logo_url': '',
            'sector': 'N/A',
            'industry': 'N/A',
            'website': 'N/A',
            'description': 'Information not available',
            'country': 'N/A',
            'employees': 'N/A',
            'exchange': 'N/A',
        }

def get_financial_metrics(ticker):
    """
    Get financial metrics for the given ticker
    """
    try:
        # Format ticker symbol correctly
        formatted_ticker = format_ticker(ticker)
        stock = yf.Ticker(formatted_ticker)
        info = stock.info
        
        # Determine currency symbol based on market
        is_indian_stock = formatted_ticker.endswith('.NS') or formatted_ticker.endswith('.BO')
        currency_symbol = '₹' if is_indian_stock else '$'
        
        # Extract key metrics
        metrics = {
            'current_price': info.get('currentPrice', info.get('regularMarketPrice', 'N/A')),
            'previous_close': info.get('previousClose', 'N/A'),
            'open': info.get('open', 'N/A'),
            'day_low': info.get('dayLow', 'N/A'),
            'day_high': info.get('dayHigh', 'N/A'),
            'market_cap': info.get('marketCap', 'N/A'),
            'volume': info.get('volume', 'N/A'),
            'avg_volume': info.get('averageVolume', 'N/A'),
            'pe_ratio': info.get('trailingPE', 'N/A'),
            'eps': info.get('trailingEps', 'N/A'),
            'forward_pe': info.get('forwardPE', 'N/A'),
            'dividend_yield': round(info.get('dividendYield', 0) * 100, 2) if info.get('dividendYield') else 'N/A',
            'fifty_two_week_high': info.get('fiftyTwoWeekHigh', 'N/A'),
            'fifty_two_week_low': info.get('fiftyTwoWeekLow', 'N/A'),
            'beta': info.get('beta', 'N/A'),
            'target_mean_price': info.get('targetMeanPrice', 'N/A'),
            'target_high_price': info.get('targetHighPrice', 'N/A'),
            'target_low_price': info.get('targetLowPrice', 'N/A'),
            'recommendation_key': info.get('recommendationKey', 'N/A'),
            'currency_symbol': currency_symbol,
            'is_indian_stock': is_indian_stock
        }
        
        # Format market cap to be more readable
        if isinstance(metrics['market_cap'], (int, float)):
            if metrics['market_cap'] >= 1e12:
                metrics['market_cap_formatted'] = f"{currency_symbol}{metrics['market_cap']/1e12:.2f}T"
            elif metrics['market_cap'] >= 1e9:
                metrics['market_cap_formatted'] = f"{currency_symbol}{metrics['market_cap']/1e9:.2f}B"
            elif metrics['market_cap'] >= 1e6:
                metrics['market_cap_formatted'] = f"{currency_symbol}{metrics['market_cap']/1e6:.2f}M"
            else:
                metrics['market_cap_formatted'] = f"{currency_symbol}{metrics['market_cap']:,.0f}"
        else:
            metrics['market_cap_formatted'] = 'N/A'
        
        return metrics
    except Exception as e:
        logging.error(f"Error fetching financial metrics for {ticker}: {str(e)}")
        return {
            'current_price': 'N/A',
            'previous_close': 'N/A',
            'open': 'N/A',
            'day_low': 'N/A',
            'day_high': 'N/A',
            'market_cap': 'N/A',
            'market_cap_formatted': 'N/A',
            'volume': 'N/A',
            'avg_volume': 'N/A',
            'pe_ratio': 'N/A',
            'eps': 'N/A',
            'forward_pe': 'N/A',
            'dividend_yield': 'N/A',
            'fifty_two_week_high': 'N/A',
            'fifty_two_week_low': 'N/A',
            'beta': 'N/A',
            'target_mean_price': 'N/A',
            'target_high_price': 'N/A',
            'target_low_price': 'N/A',
            'recommendation_key': 'N/A',
        }

def predict_price(df, days=30):
    """
    Improved price prediction model using linear regression with better short-term focus
    """
    df = df.copy()
    
    # Use more recent data for prediction (last 90 days if available)
    if len(df) > 90:
        df = df.iloc[-90:]
    
    # Create features
    df['Days'] = range(len(df))
    
    # Add some technical indicators as features
    df['MA7'] = df['Close'].rolling(window=7).mean().fillna(df['Close'])
    df['MA14'] = df['Close'].rolling(window=14).mean().fillna(df['Close'])
    df['Volatility'] = df['Close'].rolling(window=7).std().fillna(0)
    
    # Use last 1/3 of data for more recent trend emphasis
    recent_df = df.iloc[len(df)//3:]
    
    # Prepare data for training
    X = recent_df[['Days', 'MA7', 'MA14', 'Volatility']].values
    y = recent_df['Close'].values
    
    # Fit the model
    model = LinearRegression()
    model.fit(X, y)
    
    # Prepare for prediction
    last_day = df['Days'].iloc[-1]
    last_price = df['Close'].iloc[-1]
    last_ma7 = df['MA7'].iloc[-1]
    last_ma14 = df['MA14'].iloc[-1]
    last_vol = df['Volatility'].iloc[-1]
    
    # Predict future prices
    future_prices = []
    future_dates = []
    
    for i in range(1, days + 1):
        # Get next date
        next_date = df.index[-1] + timedelta(days=i)
        future_dates.append(next_date)
        
        # Create prediction input
        pred_input = np.array([[
            last_day + i,
            last_ma7,
            last_ma14,
            last_vol
        ]])
        
        # Make prediction
        pred_price = model.predict(pred_input)[0]
        
        # Ensure price doesn't change too dramatically from previous day
        if i > 1:
            prev_price = future_prices[-1]
            # Limit daily change to a reasonable percentage
            max_change = prev_price * 0.03  # 3% maximum daily change
            if abs(pred_price - prev_price) > max_change:
                if pred_price > prev_price:
                    pred_price = prev_price + max_change
                else:
                    pred_price = prev_price - max_change
        
        future_prices.append(round(pred_price, 2))
        
        # Update moving averages for next iteration
        last_ma7 = (last_ma7 * 6 + pred_price) / 7
        last_ma14 = (last_ma14 * 13 + pred_price) / 14
    
    # Format for output
    prediction = {
        'dates': [d.strftime('%Y-%m-%d') for d in future_dates],
        'prices': future_prices
    }
    
    return prediction

def get_trend_strength(df):
    """
    Calculate the strength of the current trend
    """
    # Calculate returns
    returns = df['Close'].pct_change().fillna(0)
    
    # Recent performance (last 20 days)
    recent_returns = returns.iloc[-20:].mean() * 100
    
    # Volatility
    volatility = returns.std() * 100
    
    # Momentum (positive days vs negative days)
    positive_days = (returns > 0).sum()
    negative_days = (returns < 0).sum()
    momentum_ratio = positive_days / max(negative_days, 1)
    
    # Calculate relative strength index (RSI)
    delta = df['Close'].diff().fillna(0)
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean().fillna(0)
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean().fillna(0.0001)  # Small value to avoid division by zero
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs)).fillna(50)  # Default to neutral RSI if calculation fails
    current_rsi = rsi.iloc[-1]
    
    # Determine trend based on moving averages
    sma20 = df['Close'].rolling(window=20).mean().fillna(df['Close'].iloc[0])
    sma50 = df['Close'].rolling(window=50).mean().fillna(df['Close'].iloc[0])
    sma200 = df['Close'].rolling(window=200).mean().fillna(df['Close'].iloc[0])
    
    # Current price
    current_price = df['Close'].iloc[-1]
    
    # Check if price is above/below moving averages
    above_sma20 = current_price > sma20.iloc[-1]
    above_sma50 = current_price > sma50.iloc[-1]
    above_sma200 = current_price > sma200.iloc[-1]
    
    # Golden cross (sma20 crosses above sma50)
    if len(sma20) >= 2 and len(sma50) >= 2:
        golden_cross = (sma20.iloc[-1] > sma50.iloc[-1]) and (sma20.iloc[-2] <= sma50.iloc[-2])
        # Death cross (sma20 crosses below sma50)
        death_cross = (sma20.iloc[-1] < sma50.iloc[-1]) and (sma20.iloc[-2] >= sma50.iloc[-2])
    else:
        golden_cross = False
        death_cross = False
    
    # Determine trend status
    if above_sma20 and above_sma50 and above_sma200:
        trend = "Strong Uptrend"
        strength = 5
    elif above_sma20 and above_sma50:
        trend = "Uptrend"
        strength = 4
    elif above_sma20:
        trend = "Weak Uptrend"
        strength = 3
    elif not above_sma20 and not above_sma50 and not above_sma200:
        trend = "Strong Downtrend"
        strength = -5
    elif not above_sma20 and not above_sma50:
        trend = "Downtrend"
        strength = -4
    elif not above_sma20:
        trend = "Weak Downtrend"
        strength = -3
    else:
        trend = "Sideways"
        strength = 0
    
    # Adjust for crosses
    if golden_cross:
        trend = "Golden Cross (Bullish Signal)"
        strength += 1
    elif death_cross:
        trend = "Death Cross (Bearish Signal)"
        strength -= 1
    
    # Initialize overbought and oversold flags
    overbought = False
    oversold = False
    
    # Adjust for RSI
    if current_rsi > 70:
        overbought = True
        trend += " (Overbought)"
        strength -= 1
    elif current_rsi < 30:
        oversold = True
        trend += " (Oversold)"
        strength += 1
    
    return {
        'trend': trend,
        'strength': strength,
        'recent_returns': round(recent_returns, 2),
        'volatility': round(volatility, 2),
        'momentum_ratio': round(momentum_ratio, 2),
        'rsi': round(current_rsi, 2),
        'overbought': overbought,
        'oversold': oversold
    }

def get_recommendation(ticker):
    """
    Generate a basic recommendation for the stock
    """
    try:
        # Format ticker symbol correctly
        formatted_ticker = format_ticker(ticker)
        # Get historical data
        stock = yf.Ticker(formatted_ticker)
        df = stock.history(period='1y')
        
        if df.empty:
            raise ValueError(f"No historical data available for {ticker}")
        
        # Get company info and metrics
        info = stock.info
        
        # Trend analysis
        trend_data = get_trend_strength(df)
        
        # Price prediction
        prediction = predict_price(df, days=30)
        predicted_price = prediction['prices'][-1]
        current_price = df['Close'].iloc[-1]
        predicted_change = ((predicted_price / current_price) - 1) * 100
        
        # Analyst recommendations
        analyst_recommendation = info.get('recommendationKey', 'N/A')
        
        # Target price comparison
        target_mean_price = info.get('targetMeanPrice', current_price)
        target_potential = ((target_mean_price / current_price) - 1) * 100 if target_mean_price else 0
        
        # Valuation metrics
        pe_ratio = info.get('trailingPE', 0)
        forward_pe = info.get('forwardPE', 0)
        peg_ratio = info.get('pegRatio', 0)
        
        # Calculate recommendation score (simple algorithm)
        score = 0
        
        # Add trend strength to score
        score += trend_data['strength']
        
        # Add predicted price change component
        if predicted_change > 15:
            score += 2
        elif predicted_change > 5:
            score += 1
        elif predicted_change < -15:
            score -= 2
        elif predicted_change < -5:
            score -= 1
        
        # Add analyst recommendation component
        if analyst_recommendation == 'buy' or analyst_recommendation == 'strongBuy':
            score += 1
        elif analyst_recommendation == 'sell' or analyst_recommendation == 'strongSell':
            score -= 1
        
        # Add target price component
        if target_potential > 15:
            score += 2
        elif target_potential > 5:
            score += 1
        elif target_potential < -15:
            score -= 2
        elif target_potential < -5:
            score -= 1
        
        # Add valuation component (simple check for reasonable P/E)
        if pe_ratio and 5 < pe_ratio < 25:
            score += 1
        elif pe_ratio and pe_ratio > 50:
            score -= 1
        
        # Determine recommendation based on score
        if score >= 5:
            recommendation = "Strong Buy"
            explanation = "The stock shows strong positive trends, good analyst ratings, and favorable valuation metrics."
        elif score >= 3:
            recommendation = "Buy"
            explanation = "The stock shows positive trends and potential for growth based on technical and fundamental factors."
        elif score >= 1:
            recommendation = "Moderate Buy"
            explanation = "The stock shows some positive indicators, but with limited conviction."
        elif score >= -1:
            recommendation = "Hold"
            explanation = "The stock shows mixed signals with no clear trend direction."
        elif score >= -3:
            recommendation = "Moderate Sell"
            explanation = "The stock shows some negative indicators that suggest caution."
        elif score >= -5:
            recommendation = "Sell"
            explanation = "The stock shows negative trends and unfavorable metrics."
        else:
            recommendation = "Strong Sell"
            explanation = "The stock shows strong negative trends, poor analyst ratings, and concerning valuation metrics."
        
        return {
            'recommendation': recommendation,
            'explanation': explanation,
            'score': score,
            'trend': trend_data['trend'],
            'analyst_recommendation': analyst_recommendation,
            'target_mean_price': target_mean_price,
            'target_potential': round(target_potential, 2),
            'predicted_price': round(predicted_price, 2),
            'predicted_change': round(predicted_change, 2),
            'prediction': prediction
        }
    except Exception as e:
        logging.error(f"Error generating recommendation for {ticker}: {str(e)}")
        return {
            'recommendation': "Unable to Generate",
            'explanation': f"An error occurred while analyzing the stock: {str(e)}",
            'score': 0,
            'trend': "Unknown",
            'analyst_recommendation': "N/A",
            'target_mean_price': "N/A",
            'target_potential': "N/A",
            'predicted_price': "N/A",
            'predicted_change': "N/A",
            'prediction': {'dates': [], 'prices': []}
        }
