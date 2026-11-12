
from pylimitbook_bist import BistLimitBook
from pylimitbook.tick import Bid, Ask
import time

def test_asels():
    print("--- TEST 1: ASELS ---")
    # Prev close for ASELS around 300
    book = BistLimitBook(prev_close=300.0)
    
    # Add small bids/asks to generate average
    for i in range(10):
        book.process_bid_ask(Bid({'id_num': i, 'qty': 1000, 'price': str(290 + i), 'timestamp': 1000}))
        book.process_bid_ask(Ask({'id_num': 100+i, 'qty': 1000, 'price': str(310 + i), 'timestamp': 1000}))
        
    # Add wall
    book.process_bid_ask(Bid({'id_num': 999, 'qty': 180000, 'price': '331.75', 'timestamp': 2000}))
    
    print("Walls detected:")
    print(book.get_walls())

def test_thyao():
    print("\n--- TEST 2: THYAO ---")
    # Prev close for THYAO around 300
    book = BistLimitBook(prev_close=300.0)
    
    # Add small bids/asks
    for i in range(10):
        book.process_bid_ask(Bid({'id_num': i, 'qty': 1000, 'price': str(290 + i), 'timestamp': 1000}))
        book.process_bid_ask(Ask({'id_num': 100+i, 'qty': 1000, 'price': str(310 + i), 'timestamp': 1000}))
        
    # Add wall
    book.process_bid_ask(Ask({'id_num': 888, 'qty': 200000, 'price': '312.50', 'timestamp': 2000}))
    
    print("Walls detected:")
    print(book.get_walls())

if __name__ == "__main__":
    test_asels()
    test_thyao()
