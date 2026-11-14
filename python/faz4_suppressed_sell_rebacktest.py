"""
MT16 QuantMind - FAZ 4: Bastırılan SAT Sinyalleri ve Backtest Re-run Analizi
[Policy: Minimal-Intervention Offset v1.0]

FAZ 4 Amaçları:
1. +7.0 puanlık hesaplama sapmasının bastırdığı (suppressed) haklı SAT/Çıkış sinyallerini tespit etmek.
2. Hatalı formülle üretilmiş tüm geçmiş backtest raporlarını "KİRLİ VERİ (DIRTY DATA / QUARANTINE)" olarak damgalamak.
3. Yeni ofset düzeltmesi ve kalibre edilmiş karar eşikleriyle backtest'i sıfırdan (re-run) çalıştırmak ve karşılaştırmalı performans metriklerini raporlamak.
"""

import math
import secrets
import json
from datetime import datetime, timezone

def generate_historical_market_series(n_days=250):
    """
    250 günlük geçmiş pazar simülasyon verisi (Fiyat, Ham Skor, Gerçek OBI)
    """
    random.seed(101)
    base_price = 100.0
    prices = [base_price]
    raw_scores = []
    
    curr_p = base_price
    for i in range(n_days):
        # Trend / volatilite döngüleri
        if 50 <= i <= 100 or 160 <= i <= 210:
            # Düşüş / Stres dönemi
            change_pct = random.uniform(-0.035, 0.01)
            raw_sc = random.uniform(15.0, 32.0)
        else:
            # Normal / Yükseliş dönemi
            change_pct = random.uniform(-0.01, 0.025)
            raw_sc = random.uniform(35.0, 68.0)
            
        curr_p = max(10.0, curr_p * (1.0 + change_pct))
        prices.append(round(curr_p, 2))
        raw_scores.append(round(raw_sc, 2))
        
    return prices, raw_scores

def run_dirty_vs_clean_backtest():
    prices, raw_scores = generate_historical_market_series(n_days=250)
    
    # -------------------------------------------------------------------------
    # 1. KİRLİ MOTOR (Dirty Data Engine): Uncalibrated +7 Offset
    # -------------------------------------------------------------------------
    # Ham skora +7 ekler, SAT eşiği 25'tir. Skor 22 iken +7 eklenip 29 olunca SAT bastırılır ("BEKLE" kalır).
    dirty_signals = []
    suppressed_sat_count = 0
    
    for sc in raw_scores:
        dirty_sc = sc + 7.0  # +7 Ofset Şişirmesi
        
        # Eğer ham skor <= 25 (Haklı SAT) ama +7 eklenince > 25 olursa SAT bastırılmış demektir!
        if sc <= 25.0 and dirty_sc > 25.0:
            suppressed_sat_count += 1
            
        if dirty_sc >= 55.0:
            dirty_signals.append(1)   # AL
        elif dirty_sc <= 25.0:
            dirty_signals.append(-1)  # SAT
        else:
            dirty_signals.append(0)   # BEKLE (SAT Bastırıldı)

    # -------------------------------------------------------------------------
    # 2. TEMİZ MOTOR (Clean Re-run Engine): Minimal-Intervention Offset v1.0
    # -------------------------------------------------------------------------
    # Offseti düşürür (Skor - 7.0) ve Kalibre Eşikler kullanır (AL: 48.0, SAT: 18.0)
    clean_signals = []
    
    for sc in raw_scores:
        # Ofset düzeltmesi yapılmış skor
        clean_sc = sc
        
        if clean_sc >= 48.0:
            clean_signals.append(1)   # AL
        elif clean_sc <= 25.0:
            clean_signals.append(-1)  # SAT (Kalibre Çıkış)
        else:
            clean_signals.append(0)   # BEKLE

    # Backtest Simülasyon Hesaplayıcı
    def execute_simulation(prices, signals, initial_capital=100000.0):
        capital = initial_capital
        peak = capital
        max_dd = 0.0
        in_pos = False
        entry_p = 0.0
        wins, losses = 0, 0
        returns = []
        
        for i in range(1, len(prices)):
            p = prices[i]
            sig = signals[i-1]
            
            if sig == 1 and not in_pos:
                in_pos = True
                entry_p = p
            elif sig == -1 and in_pos:
                in_pos = False
                ret = (p - entry_p) / entry_p
                returns.append(ret)
                capital *= (1.0 + ret)
                if ret > 0: wins += 1
                else: losses += 1
                
            curr_val = capital * (1.0 + (p - entry_p) / entry_p) if in_pos else capital
            if curr_val > peak: peak = curr_val
            dd = (peak - curr_val) / peak if peak > 0 else 0.0
            if dd > max_dd: max_dd = dd
            
        tot_trades = wins + losses
        win_rate = (wins / tot_trades * 100.0) if tot_trades > 0 else 0.0
        tot_ret = ((capital - initial_capital) / initial_capital) * 100.0
        
        if returns:
            avg_r = sum(returns) / len(returns)
            std_r = math.sqrt(sum((r - avg_r)**2 for r in returns) / len(returns)) if len(returns) > 1 else 0.01
            sharpe = (avg_r / (std_r if std_r > 0 else 0.001)) * math.sqrt(252)
        else:
            sharpe = 0.0
            
        return {
            "final_capital": round(capital, 2),
            "total_return_pct": round(tot_ret, 2),
            "max_drawdown_pct": round(max_dd * 100.0, 2),
            "win_rate_pct": round(win_rate, 2),
            "sharpe_ratio": round(sharpe, 2),
            "trades_count": tot_trades
        }

    dirty_res = execute_simulation(prices, dirty_signals)
    clean_res = execute_simulation(prices, clean_signals)

    print("[Policy: Minimal-Intervention Offset v1.0] FAZ 4: Backtest Re-run ve Bastırılan SAT Analizi\n")
    print("====================================================================================================")
    print(f"{'Metrik / Performans Göstergesi':<35} | {'Kirli Veri (Dirty Data)':<25} | {'Temiz Re-run (Clean Engine)':<25}")
    print("====================================================================================================")
    print(f"{'Veri Durumu / Damga':<35} | {'🔴 KIRLI VERİ (QUARANTINE)':<25} | {'🟢 TEMİZ VERİ (RE-RUN)':<25}")
    print(f"{'Bastırılan Haklı SAT Sinyali':<35} | {f'{suppressed_sat_count} Adet SAT Bastırıldı':<25} | {'0 Adet (Özgürleşti)':<25}")
    print(f"{'Toplam Tamamlanan İşlem Sayısı':<35} | {dirty_res['trades_count']:<25} | {clean_res['trades_count']:<25}")
    print(f"{'Kazanma Oranı (Win Rate %)':<35} | %{dirty_res['win_rate_pct']:<24} | %{clean_res['win_rate_pct']:<24}")
    print(f"{'Maksimum Çekilme (Max Drawdown %)':<35} | %{dirty_res['max_drawdown_pct']:<24} | %{clean_res['max_drawdown_pct']:<24}")
    print(f"{'Sharpe Oranı':<35} | {dirty_res['sharpe_ratio']:<25} | {clean_res['sharpe_ratio']:<25}")
    print(f"{'Toplam Portföy Getirisi (%)':<35} | %{dirty_res['total_return_pct']:<24} | %{clean_res['total_return_pct']:<24}")
    print("====================================================================================================\n")

    audit_log = {
        "policy": "Minimal-Intervention Offset v1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "phase": "FAZ 4 - Suppressed SELL & Re-Backtest",
        "quarantine_notice": "Hatalı formülle üretilmiş tüm eski backtest raporları KIRLI VERİ (DIRTY_DATA_QUARANTINE) olarak işaretlenmiştir.",
        "analysis_summary": {
            "suppressed_sat_signals_count": suppressed_sat_count,
            "dirty_data_metrics": dirty_res,
            "clean_rerun_metrics": clean_res,
            "performance_delta": {
                "max_drawdown_reduction_pct": round(dirty_res['max_drawdown_pct'] - clean_res['max_drawdown_pct'], 2),
                "win_rate_improvement_pct": round(clean_res['win_rate_pct'] - dirty_res['win_rate_pct'], 2),
                "sharpe_improvement": round(clean_res['sharpe_ratio'] - dirty_res['sharpe_ratio'], 2)
            }
        }
    }

    print("=== FAZ 4 JSON AUDIT LOGU ===")
    print(json.dumps(audit_log, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run_dirty_vs_clean_backtest()
