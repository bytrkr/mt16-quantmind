#!/usr/bin/python

from python.pylimitbook.book import Book
from python.pylimitbook.tick import Bid, Ask, Trade
from python.pylimitbook.orderList import OrderList
from six.moves import cStringIO as StringIO

# BIST constants
OPEN_TIME = 34800000  # 09:40
CLOSE_TIME = 65400000 # 18:10
CIRCUIT_BREAKER_PCT = 0.06

class BistLimitBook(Book):
    def __init__(self, prev_close):
        super(BistLimitBook, self).__init__()
        self.prev_close = float(prev_close)
        self.tavan = self.prev_close * 1.10
        self.taban = self.prev_close * 0.90
        self.is_halted = False

    def is_market_open(self, timestamp):
        return OPEN_TIME <= timestamp < CLOSE_TIME

    def process_bid_ask(self, tick):
        # Adjust price from mil to kuruş
        tick.price = tick.price / 100.0

        if tick.price > self.tavan or tick.price < self.taban:
            return

        # Simple Circuit Breaker check: if price changes > 6%
        if abs(tick.price - self.prev_close) / self.prev_close > CIRCUIT_BREAKER_PCT:
            self.is_halted = True
        
        super(BistLimitBook, self).process_bid_ask(tick)

    def get_aggregated_levels(self, tree):
        levels = []
        if tree is not None and len(tree) > 0:
            for k, v in tree.price_tree.items():
                levels.append({'price': k, 'volume': v.volume})
        return levels

    def get_walls(self):
        bid_levels = self.get_aggregated_levels(self.bids)
        ask_levels = self.get_aggregated_levels(self.asks)
        
        all_levels = bid_levels + ask_levels
        if not all_levels:
            return "VERİ YOK"
            
        avg_volume = sum(l['volume'] for l in all_levels) / len(all_levels)
        
        results = []
        for l in bid_levels:
            if l['volume'] > 3 * avg_volume:
                results.append(f"TABAN/DESTEK: {l['price']} @ {l['volume']}")
        
        for l in ask_levels:
            if l['volume'] > 3 * avg_volume:
                results.append(f"TAVAN/DİRENÇ: {l['price']} @ {l['volume']}")
                
        return "\n".join(results) if results else "Duvar tespit edilmedi"

    def get_stats(self):
        if len(self.bids) == 0 or len(self.asks) == 0:
            return "VERİ YOK"
            
        top_bid = self.bids.max()
        top_ask = self.asks.min()
        spread = top_ask - top_bid
        midpoint = top_bid + (spread / 2.0)
        
        return {
            "top_bid": top_bid,
            "top_ask": top_ask,
            "spread": spread,
            "midpoint": midpoint,
            "bid_volume": self.bids.volume,
            "ask_volume": self.asks.volume
        }
