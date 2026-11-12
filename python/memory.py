"""
MT16 QuantMind - Küresel Ajan Hafızası ve Performans Takibi (memory.py)
--------------------------------------------------------------------
Ajanların (Teknik, Takas, Temel, Makro, Haber, Trend) geçmiş sinyal ve işlem
başarılarını SQLite tabanında kaydeder. Ajanların münazara ağırlıklarını
dinamik olarak günceller.
"""

from __future__ import annotations
import os
import sqlite3
import json
import time
import math
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent_memory.db")


class GlobalAgentMemory:
    """
    Tüm ajanların tarihsel isabet oranlarını, kümülatif kâr/zarar katkısını
    ve dinamik güven ağırlıklarını tutan hafıza motoru.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS agent_profiles (
                        agent_name TEXT PRIMARY KEY,
                        total_signals INTEGER DEFAULT 0,
                        correct_signals INTEGER DEFAULT 0,
                        accuracy_pct REAL DEFAULT 50.0,
                        weight REAL DEFAULT 1.0,
                        last_updated REAL
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS signal_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        agent_name TEXT,
                        ticker TEXT,
                        signal TEXT,
                        actual_outcome TEXT,
                        pnl_pct REAL,
                        timestamp REAL,
                        metadata TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS verbal_lessons (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticker TEXT,
                        decision TEXT,
                        outcome TEXT,
                        lesson TEXT,
                        reflection TEXT,
                        conceptual_perspective TEXT,
                        target_agent TEXT DEFAULT 'GeneralAgent',
                        timestamp REAL
                    )
                """)
                try:
                    cursor.execute("ALTER TABLE verbal_lessons ADD COLUMN target_agent TEXT DEFAULT 'GeneralAgent'")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE verbal_lessons ADD COLUMN reflection TEXT")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE verbal_lessons ADD COLUMN conceptual_perspective TEXT")
                except Exception:
                    pass

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS discovered_factors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        factor_name TEXT NOT NULL,
                        symbol TEXT NOT NULL,
                        formula TEXT,
                        correlation_score REAL,
                        evidence_summary TEXT,
                        timestamp REAL
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS episodic_memory (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT NOT NULL,
                        vector_json TEXT NOT NULL,
                        action TEXT NOT NULL,
                        pnl_pct REAL DEFAULT 0.0,
                        summary TEXT,
                        market_regime TEXT DEFAULT 'BULL',
                        volatility_state TEXT DEFAULT 'NORMAL',
                        macro_context TEXT DEFAULT 'NORMAL',
                        timestamp REAL
                    )
                """)
                try:
                    cursor.execute("ALTER TABLE episodic_memory ADD COLUMN market_regime TEXT DEFAULT 'BULL'")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE episodic_memory ADD COLUMN volatility_state TEXT DEFAULT 'NORMAL'")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE episodic_memory ADD COLUMN macro_context TEXT DEFAULT 'NORMAL'")
                except Exception:
                    pass
                conn.commit()
                self._seed_default_profiles(conn)
                self._seed_episodic_memory(conn)
                self._seed_verbal_lessons(conn)
        except Exception:
            pass

    def _seed_episodic_memory(self, conn):
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM episodic_memory")
            if cursor.fetchone()[0] == 0:
                now = time.time()
                samples = [
                    ("ASELS", [55.0, 0.12, 1.5, 2.1, 7.0, 0.08], "BUY", +6.4, "L2 OBI ve Z-Skor kırılımı sonrası +%6.4 kâr sağlandı.", "BULL", "NORMAL", "NORMAL"),
                    ("ASELS", [42.0, -0.18, -0.8, 3.2, 5.0, 0.12], "SELL", +3.1, "Ayı uyumsuzluğu ve OBI satıcılı seyrinde satış koruması başarı sağladı.", "BEAR", "HIGH", "FAIZ_ARTISI"),
                    ("THYAO", [68.0, 0.25, 2.2, 2.8, 8.0, 0.05], "BUY", +8.2, "Yüksek hacim ve kurumsal takas girişi ile +%8.2 yükseliş sağlandı.", "BULL", "NORMAL", "NORMAL"),
                    ("NVDA", [62.0, 0.20, 1.8, 3.5, 8.0, 0.04], "BUY", +12.5, "SEC 13F ve bilançoda nakit akışı ile hedef gerçekleşti.", "BULL", "HIGH", "NORMAL"),
                    ("BTCUSDT", [58.0, 0.15, 1.2, 6.5, 7.0, 0.02], "BUY", +14.2, "Borsalardan soğuk cüzdanlara net çıkış ile short squeeze yaşandı.", "SIDEWAYS", "HIGH", "JEOPOLITIK_KRIZ")
                ]
                for sym, vec, act, pnl, sum_text, reg, vol, mac in samples:
                    cursor.execute("""
                        INSERT INTO episodic_memory (symbol, vector_json, action, pnl_pct, summary, market_regime, volatility_state, macro_context, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (sym, json.dumps(vec), act, pnl, sum_text, reg, vol, mac, now - 86400 * 3))
                conn.commit()
        except Exception:
            pass

    def _seed_verbal_lessons(self, conn):
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM verbal_lessons")
            if cursor.fetchone()[0] == 0:
                now = time.time()
                lessons = [
                    (
                        "THYAO", "BUY", "LOSS",
                        "FOMO zirvesinde aşırı alım yapıldı ve ani düzeltmede zarar edildi.",
                        "Hacim patlaması tek başına yeterli değil, RSI aşırı alım bölgesindeyken girilmemeli.",
                        "Kavramsal Kural: Hacim patlaması + RSI>70 + Trend FOMO = VETO",
                        "TrendAgent", now - 86400 * 5
                    ),
                    (
                        "ASELS", "BUY", "LOSS",
                        "Faiz artışı döneminde yüksek borçlu yan sektör hissesi alındı.",
                        "Makro faiz baskısı altında finansman yükü yüksek şirketler değer kaybeder.",
                        "Kavramsal Kural: TCMB Sıkılaşma + Yüksek Kaldıraç = Savunmacı Pozisyon / AL VETO",
                        "RiskManagementAgent", now - 86400 * 4
                    ),
                    (
                        "BTCUSDT", "BUY", "LOSS",
                        "Kaldıraçlı long tasfiye dalgasında erken dip avcılığı yapıldı.",
                        "Likidasyon şelalesinde OBI tek başına dip teyidi veremez.",
                        "Kavramsal Kural: Kripto Fonlama > %0.05 + Long Tasfiye Dalgası = Bekle ve Soğuma Gör",
                        "RiskManagementAgent", now - 86400 * 2
                    )
                ]
                for tick, dec, out, les, ref, conc, agent, ts in lessons:
                    cursor.execute("""
                        INSERT INTO verbal_lessons (ticker, decision, outcome, lesson, reflection, conceptual_perspective, target_agent, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (tick, dec, out, les, ref, conc, agent, ts))
                conn.commit()
        except Exception:
            pass

    def log_verbal_lesson(
        self,
        ticker: str,
        decision: str,
        outcome: str,
        lesson: str,
        reflection: str = "",
        target_agent: str = "GeneralAgent",
        conceptual_perspective: str = ""
    ) -> bool:
        """
        FinCon ilhamlı Seçici İnanç Yayılımı (Verbal RL) ders kaydı.
        Her ders ilgili ajana (örn: TechnicalAgent, TrendAgent, RiskManagementAgent) atanır.
        BECERİ 3: Kavramsal Bakış (Conceptual Perspective) kuralını da saklar.
        """
        try:
            # Otomatik kavramsal kural türetme (eğer boşsa)
            if not conceptual_perspective:
                lower_l = lesson.lower()
                if "fomo" in lower_l or "aşırı alım" in lower_l:
                    conceptual_perspective = "Kavramsal Kural: Hacim patlaması + RSI>70 + Trend FOMO = VETO"
                elif "faiz" in lower_l or "borç" in lower_l:
                    conceptual_perspective = "Kavramsal Kural: TCMB Sıkılaşma + Yüksek Kaldıraç = AL VETO / Savunma"
                elif "tasfiye" in lower_l or "likidasyon" in lower_l:
                    conceptual_perspective = "Kavramsal Kural: Fonlama > %0.05 + Long Tasfiye = Bekle ve Soğuma Gör"
                else:
                    conceptual_perspective = f"Kavramsal Kural: #{ticker} {decision} sonrası {outcome} - {lesson[:60]}"

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO verbal_lessons (ticker, decision, outcome, lesson, reflection, conceptual_perspective, target_agent, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (ticker.upper(), decision, outcome, lesson, reflection, conceptual_perspective, target_agent, time.time()))
                conn.commit()
                return True
        except Exception:
            return False

    def get_recent_lessons(self, target_agent: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        FinCon Seçici İnanç Yayılımı: Sadece ilgili ajanın derslerini veya genel dersleri döner.
        Kavramsal Bakış (conceptual_perspective) kuralını da içerir.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if target_agent:
                    cursor.execute("""
                        SELECT ticker, decision, outcome, lesson, reflection, conceptual_perspective, target_agent, timestamp 
                        FROM verbal_lessons 
                        WHERE target_agent = ? OR target_agent = 'GeneralAgent' 
                        ORDER BY timestamp DESC LIMIT ?
                    """, (target_agent, limit))
                else:
                    cursor.execute("""
                        SELECT ticker, decision, outcome, lesson, reflection, conceptual_perspective, target_agent, timestamp 
                        FROM verbal_lessons 
                        ORDER BY timestamp DESC LIMIT ?
                    """, (limit,))
                rows = cursor.fetchall()
                return [{
                    "ticker": r[0],
                    "decision": r[1],
                    "outcome": r[2],
                    "lesson": r[3],
                    "reflection": r[4],
                    "conceptual_perspective": r[5] or "",
                    "target_agent": r[6],
                    "timestamp": r[7]
                } for r in rows]
        except Exception:
            return []

    def get_conceptual_rules(self, target_agent: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        BECERİ 3 (FinCon İlhamı): Trend Ajanı ve Risk Yöneticisi'ne otomatik olarak
        enjekte edilecek kavramsal kuralları getirir.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if target_agent:
                    cursor.execute("""
                        SELECT conceptual_perspective, target_agent, ticker, outcome, timestamp
                        FROM verbal_lessons
                        WHERE (target_agent = ? OR target_agent = 'GeneralAgent')
                          AND conceptual_perspective IS NOT NULL AND conceptual_perspective != ''
                        ORDER BY timestamp DESC LIMIT ?
                    """, (target_agent, limit))
                else:
                    cursor.execute("""
                        SELECT conceptual_perspective, target_agent, ticker, outcome, timestamp
                        FROM verbal_lessons
                        WHERE conceptual_perspective IS NOT NULL AND conceptual_perspective != ''
                        ORDER BY timestamp DESC LIMIT ?
                    """, (limit,))
                rows = cursor.fetchall()
                return [{
                    "rule": r[0],
                    "target_agent": r[1],
                    "ticker": r[2],
                    "outcome": r[3],
                    "timestamp": r[4]
                } for r in rows]
        except Exception:
            return []
        except Exception:
            return []

    def log_discovered_factor(self, factor_name: str, symbol: str, formula: str, correlation_score: float, evidence_summary: str) -> bool:
        """
        Microsoft Qlib / RD-Agent ilhamlı Otonom Faktör Keşfi kayıt fonksiyonu.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO discovered_factors (factor_name, symbol, formula, correlation_score, evidence_summary, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (factor_name, symbol.upper(), formula, float(correlation_score), evidence_summary, time.time()))
                conn.commit()
                return True
        except Exception:
            return False

    def get_discovered_factors(self, symbol: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Keşfedilen otonom faktör ve alt-küp kanıtlarını döner.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if symbol:
                    cursor.execute("""
                        SELECT id, factor_name, symbol, formula, correlation_score, evidence_summary, timestamp
                        FROM discovered_factors WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?
                    """, (symbol.upper(), limit))
                else:
                    cursor.execute("""
                        SELECT id, factor_name, symbol, formula, correlation_score, evidence_summary, timestamp
                        FROM discovered_factors ORDER BY timestamp DESC LIMIT ?
                    """, (limit,))
                rows = cursor.fetchall()
                return [{
                    "id": r[0],
                    "factor_name": r[1],
                    "symbol": r[2],
                    "formula": r[3],
                    "correlation_score": r[4],
                    "evidence_summary": r[5],
                    "timestamp": r[6]
                } for r in rows]
        except Exception:
            return []

    def _seed_default_profiles(self, conn):
        defaults = [
            ("teknik", 1.0),
            ("takas", 1.15),
            ("temel", 1.10),
            ("haber", 0.95),
            ("makro", 1.05),
            ("trend", 1.0),
            ("social", 0.85),
        ]
        cursor = conn.cursor()
        for name, initial_weight in defaults:
            cursor.execute("""
                INSERT OR IGNORE INTO agent_profiles (agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated)
                VALUES (?, 20, 12, 60.0, ?, ?)
            """, (name, initial_weight, time.time()))
        conn.commit()

    def get_all_profiles(self) -> Dict[str, Dict[str, Any]]:
        """
        Tüm ajanların güncel profil, isabet oranı ve ağırlıklarını döner.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated FROM agent_profiles")
                rows = cursor.fetchall()
                profiles = {}
                for r in rows:
                    profiles[r[0]] = {
                        "agent_name": r[0],
                        "total_signals": r[1],
                        "correct_signals": r[2],
                        "accuracy_pct": round(r[3], 2),
                        "dynamic_weight": round(r[4], 2),
                        "last_updated": r[5],
                    }
                return profiles
        except Exception:
            return {
                "teknik": {"accuracy_pct": 58.0, "dynamic_weight": 1.0},
                "takas": {"accuracy_pct": 65.0, "dynamic_weight": 1.15},
                "temel": {"accuracy_pct": 62.0, "dynamic_weight": 1.10},
            }

    def add_memory(self, agent_name: str, record: Dict[str, Any]) -> bool:
        """
        Bir ajanın tahmin/işlem kaydını ekler ve ağırlığını günceller.
        """
        try:
            name = str(agent_name).lower().strip()
            ticker = record.get("ticker", "BIST")
            signal = record.get("signal", "NOTR")
            outcome = record.get("outcome", "PENDING")
            pnl = float(record.get("pnl_pct", 0.0))
            is_correct = outcome == "SUCCESS" or pnl > 0.0

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO signal_history (agent_name, ticker, signal, actual_outcome, pnl_pct, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (name, ticker, signal, outcome, pnl, time.time(), json.dumps(record)))

                # Profil güncelle
                cursor.execute("SELECT total_signals, correct_signals FROM agent_profiles WHERE agent_name = ?", (name,))
                row = cursor.fetchone()
                if row:
                    total = row[0] + 1
                    correct = row[1] + (1 if is_correct else 0)
                    acc = (correct / total) * 100.0
                    # Dinamik ağırlık hesaplama (0.50 ile 1.50 arasında normalize)
                    new_weight = max(0.5, min(1.5, 0.5 + (acc / 100.0)))
                    cursor.execute("""
                        UPDATE agent_profiles
                        SET total_signals = ?, correct_signals = ?, accuracy_pct = ?, weight = ?, last_updated = ?
                        WHERE agent_name = ?
                    """, (total, correct, acc, new_weight, time.time(), name))
                else:
                    cursor.execute("""
                        INSERT INTO agent_profiles (agent_name, total_signals, correct_signals, accuracy_pct, weight, last_updated)
                        VALUES (?, 1, ?, ?, 1.0, ?)
                    """, (name, 1 if is_correct else 0, 100.0 if is_correct else 0.0, time.time()))

                conn.commit()
                return True
        except Exception:
            return False


# Global singleton instance
global_agent_memory = GlobalAgentMemory()


class EpisodicMemory:
    """
    META (Memory Enhanced Trading Agent) İlhamlı Epizodik Hafıza Motoru
    9-Küp durum vektörünü saklar ve kosinüs benzerliği (Cosine Similarity)
    kullanarak en benzer geçmiş epizotları ve sonuçlarını (kâr/zarar) bulur.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def add_episode(
        self,
        symbol: str,
        vector: List[float],
        action: str,
        pnl_pct: float = 0.0,
        summary: str = "",
        market_regime: str = "BULL",
        volatility_state: str = "NORMAL",
        macro_context: str = "NORMAL"
    ) -> bool:
        """
        BECERİ 3 (Bağlam Farkındalıklı Hafıza):
        Yeni bir epizot durum vektörünü market_regime, volatility_state ve macro_context ile kaydeder.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO episodic_memory (symbol, vector_json, action, pnl_pct, summary, market_regime, volatility_state, macro_context, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    symbol.upper(),
                    json.dumps(vector),
                    action,
                    float(pnl_pct),
                    summary,
                    (market_regime or "BULL").upper(),
                    (volatility_state or "NORMAL").upper(),
                    (macro_context or "NORMAL").upper(),
                    time.time()
                ))
                conn.commit()
                return True
        except Exception:
            return False

    def get_similar_episodes(
        self,
        current_vector: List[float],
        symbol: Optional[str] = None,
        top_k: int = 3,
        market_regime: Optional[str] = None,
        volatility_state: Optional[str] = None,
        macro_context: Optional[str] = None,
        metric_weight: float = 0.65,
        context_weight: float = 0.35
    ) -> List[Dict[str, Any]]:
        """
        BECERİ 3: Context-Aware Memory (Bağlam Farkındalıklı Epizodik Hafıza)
        Kosinüs Benzerliği hesaplarken 'metrik benzerliği' (%65) ile 'bağlam benzerliği'ni (%35)
        ayrı ayrı ağırlıklandırarak en uygun geçmiş epizotları döner.
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if symbol:
                    cursor.execute("""
                        SELECT id, symbol, vector_json, action, pnl_pct, summary, market_regime, volatility_state, macro_context, timestamp 
                        FROM episodic_memory WHERE symbol = ?
                    """, (symbol.upper(),))
                else:
                    cursor.execute("""
                        SELECT id, symbol, vector_json, action, pnl_pct, summary, market_regime, volatility_state, macro_context, timestamp 
                        FROM episodic_memory
                    """)
                rows = cursor.fetchall()
                if not rows:
                    return []

                def cosine_similarity(v1: List[float], v2: List[float]) -> float:
                    if not v1 or not v2:
                        return 0.0
                    min_len = min(len(v1), len(v2))
                    v1_slice = v1[:min_len]
                    v2_slice = v2[:min_len]
                    dot = sum(a * b for a, b in zip(v1_slice, v2_slice))
                    norm1 = math.sqrt(sum(a * a for a in v1_slice))
                    norm2 = math.sqrt(sum(b * b for b in v2_slice))
                    if norm1 == 0 or norm2 == 0:
                        return 0.0
                    return dot / (norm1 * norm2)

                scored = []
                has_context_query = bool(market_regime or volatility_state or macro_context)
                q_reg = (market_regime or "").upper()
                q_vol = (volatility_state or "").upper()
                q_mac = (macro_context or "").upper()

                for r in rows:
                    r_id, r_sym, r_vec_str, r_act, r_pnl, r_sum, r_reg, r_vol, r_mac, r_ts = r
                    try:
                        vec = json.loads(r_vec_str)
                        metric_sim = cosine_similarity(current_vector, vec)

                        # Bağlam Benzerliği (Context Similarity)
                        if has_context_query:
                            reg_sim = 1.0 if q_reg and q_reg == (r_reg or "").upper() else 0.2
                            vol_sim = 1.0 if q_vol and q_vol == (r_vol or "").upper() else 0.3
                            mac_sim = 1.0 if q_mac and q_mac == (r_mac or "").upper() else 0.4
                            context_sim = (0.45 * reg_sim) + (0.30 * vol_sim) + (0.25 * mac_sim)
                        else:
                            context_sim = 1.0

                        # Ayrı Ağırlıklandırma: 0.65 * metrik + 0.35 * bağlam
                        final_sim = (metric_weight * metric_sim) + (context_weight * context_sim) if has_context_query else metric_sim

                        scored.append({
                            "id": r_id,
                            "symbol": r_sym,
                            "action": r_act,
                            "similarity_score": round(final_sim, 4),
                            "metric_similarity": round(metric_sim, 4),
                            "context_similarity": round(context_sim, 4),
                            "market_regime": r_reg or "BULL",
                            "volatility_state": r_vol or "NORMAL",
                            "macro_context": r_mac or "NORMAL",
                            "pnl_pct": r_pnl,
                            "summary": r_sum,
                            "timestamp": r_ts
                        })
                    except Exception:
                        pass

                scored.sort(key=lambda x: x["similarity_score"], reverse=True)
                return scored[:top_k]
        except Exception:
            return []


episodic_memory = EpisodicMemory()
