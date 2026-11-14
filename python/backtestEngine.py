"""
MT16 QuantMind - Backtest Engine (backtestEngine.py)
--------------------------------------------------
Verilen fiyat serisi ve sinyaller üzerinden Sharpe Oranı, Maksimum Düşüş (Max Drawdown),
Toplam Getiri ve Kazanma Oranı (Win Rate) hesaplayan run_backtest metodu.
"""

from __future__ import annotations
import math
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

class BacktestEngine:
    """
    Kuant Backtest ve Performans Ölçüm Motoru
    """
    @staticmethod
    def ingest_stream_server_data(bars: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        BECERİ 2: Stream Server verilerini backtest için işler.
        """
        prices = [b["close"] for b in bars]
        # Örnek sinyal üretimi
        signals = [1 if i % 10 == 0 else 0 for i in range(len(prices))] 
        return BacktestEngine.run_backtest(prices, signals)

    @staticmethod
    def run_qstream_backtest(ticker: str, date_str: str) -> Dict[str, Any]:
        """
        BECERİ 3: QStream ile Backtest Simülasyonu.
        nanomsg ve protobuf kullanarak geçmiş bir günü "canlıymış gibi" akıtır.
        """
        try:
            import nanomsg
            # Placeholder for Matriks QStream protocol implementation
            # socket = nanomsg.Socket(nanomsg.SUB)
            # socket.connect("tcp://matriks-qstream-url:port")
            
            print(f"🚀 QStream Backtest Başlatıldı: {ticker} @ {date_str}")
            # Veri akış simülasyonu...
            return {"success": True, "ticker": ticker, "date": date_str, "status": "SIMULATED"}
        except ImportError:
            return {"success": False, "error": "nanomsg-python kütüphanesi yüklü değil."}
        except Exception as e:
            return {"success": False, "error": str(e)}

class PITGuard:
    """
    BECERİ 2: PIT-Guard (Point-in-Time Guard - AlphaAgent İlhamı)
    Backtest sırasında gelecekten veri sızmasını engeller.
    """
    @staticmethod
    def validate_step_data(current_sim_time: datetime, data_timestamp: datetime) -> bool:
        """
        Verinin zaman damgasının simülasyon zamanından sonra olmadığını doğrular.
        """
        return data_timestamp <= current_sim_time

    @staticmethod
    def filter_leakage(simulation_time_str: str, historical_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Gelecekten gelen verileri temizler.
        """
        sim_dt = datetime.fromisoformat(simulation_time_str.replace("Z", "+00:00"))
        clean_data = []
        leakage_count = 0
        
        for item in historical_data:
            ts_str = item.get("timestamp")
            if not ts_str: continue
            
            item_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if PITGuard.validate_step_data(sim_dt, item_dt):
                clean_data.append(item)
            else:
                leakage_count += 1
        
        if leakage_count > 0:
            print(f"⚠️ PIT Guard: {leakage_count} veri sızıntısı engellendi. (SimTime: {simulation_time_str})")
            
        return clean_data

def run_backtest_impl(prices: List[float], signals: List[int], initial_capital: float = 100_000.0) -> Dict[str, Any]:
    """
    Fiyat serisi (prices) ve sinyal serisi (1: AL, -1: SAT, 0: NOTR) üzerinden
    getiri, Sharpe oranı, max drawdown ve win rate hesaplar.
    """
    if not prices or len(prices) < 2:
        return {
            "initial_capital": initial_capital,
            "final_capital": initial_capital,
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "win_rate_pct": 0.0,
            "trades_count": 0,
        }

    capital = float(initial_capital)
    peak_capital = capital
    max_dd = 0.0
    returns: List[float] = []
    wins = 0
    losses = 0
    in_position = False
    entry_price = 0.0

    for i in range(1, len(prices)):
        p_prev = prices[i - 1]
        p_curr = prices[i]
        sig = signals[i - 1] if i - 1 < len(signals) else 0

        # Fiyat değişimi
        pct_change = (p_curr - p_prev) / p_prev

        if sig == 1 and not in_position:
            in_position = True
            entry_price = p_curr
        elif sig == -1 and in_position:
            in_position = False
            trade_ret = (p_curr - entry_price) / entry_price
            returns.append(trade_ret)
            if trade_ret > 0:
                wins += 1
            else:
                losses += 1
            capital *= (1.0 + trade_ret)

        if in_position:
            unrealized_ret = (p_curr - entry_price) / entry_price
            curr_val = capital * (1.0 + unrealized_ret)
        else:
            curr_val = capital

        if curr_val > peak_capital:
            peak_capital = curr_val
        
        dd = (peak_capital - curr_val) / peak_capital if peak_capital > 0 else 0.0
        if dd > max_dd:
            max_dd = dd

    total_return_pct = ((capital - initial_capital) / initial_capital) * 100.0
    total_trades = wins + losses
    win_rate_pct = (wins / total_trades * 100.0) if total_trades > 0 else 0.0

    # Sharpe Oranı (Basitleştirilmiş yıllıklandırma)
    if returns:
        avg_ret = sum(returns) / len(returns)
        std_ret = math.sqrt(sum((r - avg_ret) ** 2 for r in returns) / len(returns)) if len(returns) > 1 else 0.01
        sharpe = (avg_ret / (std_ret if std_ret > 0 else 0.001)) * math.sqrt(252)
    else:
        sharpe = 0.0

    return {
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        "total_return_pct": round(total_return_pct, 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown_pct": round(max_dd * 100.0, 2),
        "win_rate_pct": round(win_rate_pct, 2),
        "trades_count": total_trades,
    }

# Update BacktestEngine to use the implementation
class BacktestEngine:
    # ... (previous methods)
    @staticmethod
    def run_backtest(prices: List[float], signals: List[int], initial_capital: float = 100_000.0) -> Dict[str, Any]:
        return run_backtest_impl(prices, signals, initial_capital)

    @staticmethod
    def run_what_if_simulation(ticker: str, target_date: str) -> Dict[str, Any]:
        """
        BECERİ 1: "Sistem Tester" ve "What-If" Backtest Motoru (İdeal Data İlhamı).
        Geçmiş bir günü 'o gün yaşıyormuş gibi' akıtır ve her adımda Jüri kararını toplar.
        """
        try:
            print(f"⏳ 'What-If' Zaman Makinesi Başlatıldı: {ticker} @ {target_date}")
            
            # Simülasyon başlangıç zamanı (Örn: 09:30)
            sim_base_time = datetime.fromisoformat(f"{target_date}T09:30:00+03:00")
            
            # 1. QStream/Geçmiş veri havuzunu simüle et
            # Örn: Tüm güne ait 100 veri noktası var
            historical_data_pool = []
            for i in range(100):
                ts = sim_base_time + timedelta(minutes=i*5)
                historical_data_pool.append({
                    "timestamp": ts.isoformat(),
                    "price": 350.0 + (math.sin(i * 0.1) * 10),
                    "obi": round(math.cos(i * 0.2) * 0.3, 2)
                })

            simulation_steps = []
            for i in range(20):
                # Simülasyonda şu anki zaman
                current_sim_time = sim_base_time + timedelta(minutes=i*15)
                
                # PIT-Guard: Şu anki simülasyon zamanından sonrasını GÖREMEMELİ
                visible_data = PITGuard.filter_leakage(current_sim_time.isoformat(), historical_data_pool)
                
                if not visible_data: continue
                
                latest_data = visible_data[-1]
                
                step_context = {
                    "step": i + 1,
                    "timestamp": current_sim_time.strftime("%H:%M"),
                    "price": round(latest_data["price"], 2),
                    "obi": latest_data["obi"],
                    "sentiment": "NEUTRAL" if i < 10 else "BULLISH",
                }
                
                step_context["jury_verdict"] = "AL" if step_context["obi"] > 0.1 else "BEKLE"
                step_context["confidence"] = 75 + i
                
                simulation_steps.append(step_context)
                time.sleep(0.01)
            
            return {
                "success": True,
                "ticker": ticker,
                "date": target_date,
                "total_steps": len(simulation_steps),
                "steps": simulation_steps,
                "summary": f"Simülasyon tamamlandı. PIT-Guard aktif edildi. Günlük veri sızıntısı kontrolü yapıldı."
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def simulate_monte_carlo(prices: List[float], days: int = 30, simulations: int = 1000) -> Dict[str, Any]:
        """
        Geçmiş fiyat serisinden günlük getiri ortalaması ve volatilitesini hesaplar.
        Geometric Brownian Motion (GBM) kullanarak 1000 farklı fiyat yolu simüle eder
        ve %5, %50 (medyan), %95 yüzdelik dilimlerini döner.
        """
        import secrets
        if not prices or len(prices) < 2:
            base_p = prices[-1] if prices else 100.0
            return {
                "days": days,
                "simulations": simulations,
                "p5": base_p,
                "p50": base_p,
                "p95": base_p,
                "expected_volatility": 0.02,
            }

        log_returns = [math.log(prices[i] / prices[i-1]) for i in range(1, len(prices))]
        mean_ret = sum(log_returns) / len(log_returns)
        variance = sum((r - mean_ret) ** 2 for r in log_returns) / (len(log_returns) - 1) if len(log_returns) > 1 else 0.0001
        volatility = math.sqrt(variance)

        last_price = prices[-1]
        final_prices = []

        for _ in range(simulations):
            curr_p = last_price
            for _ in range(days):
                z = random.gauss(0.0, 1.0)
                drift = (mean_ret - 0.5 * (volatility ** 2))
                shock = volatility * z
                curr_p = curr_p * math.exp(drift + shock)
            final_prices.append(max(0.01, curr_p))

        final_prices.sort()
        p5_idx = int(simulations * 0.05)
        p50_idx = int(simulations * 0.50)
        p95_idx = int(simulations * 0.95)

        p5 = round(final_prices[p5_idx], 2)
        p50 = round(final_prices[p50_idx], 2)
        p95 = round(final_prices[p95_idx], 2)

        return {
            "days": days,
            "simulations": simulations,
            "start_price": last_price,
            "p5": p5,
            "p50": p50,
            "p95": p95,
            "expected_volatility": round(volatility * math.sqrt(252) * 100, 2),
        }

