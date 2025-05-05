import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
import io
import pandas as pd
import stock_analysis

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # needed for url_for to generate with https

# Configure the database, relative to the app instance folder
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///stock_data.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
# initialize the app with the extension, flask-sqlalchemy >= 3.0.x
db.init_app(app)

with app.app_context():
    # Import the models
    import models  # noqa: F401
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stock_data', methods=['GET'])
def get_stock_data():
    ticker = request.args.get('ticker', '').upper()
    period = request.args.get('period', '1y')  # Default to 1 year

    if not ticker:
        return jsonify({"error": "No ticker symbol provided"}), 400

    try:
        # Get stock data
        data = stock_analysis.get_stock_data(ticker, period)
        
        # Get company info
        info = stock_analysis.get_company_info(ticker)
        
        # Get metrics
        metrics = stock_analysis.get_financial_metrics(ticker)
        
        # Get recommendation
        recommendation = stock_analysis.get_recommendation(ticker)
        
        return jsonify({
            "success": True,
            "data": data,
            "info": info,
            "metrics": metrics,
            "recommendation": recommendation
        })
    except Exception as e:
        logging.error(f"Error processing request for {ticker}: {str(e)}")
        return jsonify({"error": f"Failed to retrieve data for {ticker}: {str(e)}"}), 400

@app.route('/api/download_csv', methods=['GET'])
def download_csv():
    ticker = request.args.get('ticker', '').upper()
    period = request.args.get('period', '1y')  # Default to 1 year
    
    if not ticker:
        return jsonify({"error": "No ticker symbol provided"}), 400
    
    try:
        df = stock_analysis.get_stock_dataframe(ticker, period)
        
        # Create a string buffer to hold the CSV data
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=True)
        csv_buffer.seek(0)
        
        # Convert to bytes for send_file
        mem_csv = io.BytesIO()
        mem_csv.write(csv_buffer.getvalue().encode())
        mem_csv.seek(0)
        
        return send_file(
            mem_csv,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f"{ticker}_stock_data.csv"
        )
    except Exception as e:
        logging.error(f"Error generating CSV for {ticker}: {str(e)}")
        return jsonify({"error": f"Failed to generate CSV for {ticker}: {str(e)}"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
