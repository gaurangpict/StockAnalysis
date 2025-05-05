from app import db
from datetime import datetime

class StockSearch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(20), nullable=False)
    search_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<StockSearch {self.ticker}>'

class StockMetrics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Float)
    market_cap = db.Column(db.Float)
    pe_ratio = db.Column(db.Float)
    eps = db.Column(db.Float)
    fifty_two_week_high = db.Column(db.Float)
    fifty_two_week_low = db.Column(db.Float)
    recommendation = db.Column(db.String(20))
    last_updated = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<StockMetrics {self.ticker}>'
