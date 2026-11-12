from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from python.schemas import (
    MarketRegime,
    MarketData,
    DepthData,
    FundamentalData,
    NewsData,
    CompanyDirectData,
    TrendData,
    UnifiedContext,
    FinalDecision
)

class AnalyzeRequest(BaseModel):
    ticker: str = Field(..., description="BIST Hisse Kodu (orn: ASELS, THYAO, EREGL)")
    market_regime: Optional[MarketRegime] = Field(default=MarketRegime.BULL)
    market_data: Optional[MarketData] = None
    depth_data: Optional[DepthData] = None
    fundamental_data: Optional[FundamentalData] = None
    news_data: Optional[NewsData] = None
    vbts_level: Optional[int] = Field(default=0, ge=0, le=4)
    company_direct_data: Optional[CompanyDirectData] = None
    trend_data: Optional[TrendData] = None


class CustomRuleRequest(BaseModel):
    name: str = Field(..., description="Kuralın ismi")
    patron_selling: Optional[bool] = Field(default=None, description="Patron satışı aktif mi?")
    dcf_overvalued_pct: Optional[float] = Field(default=None, description="DCF adil değere göre aşırı değerleme yüzdesi eşiği")
    action: str = Field(default="VETO", description="Kural eşleştiğinde uygulanacak aksiyon")


class StressTestRequest(BaseModel):
    tickers: List[str] = Field(default=["THYAO", "ASELS", "EREGL", "GARAN", "TUPRS"], description="Stres testine tabi tutulacak BIST hisseleri")
    scenario: str = Field(default="USD_SPIKE", description="Senaryo ismi ('USD_SPIKE', 'FAIZ_SHOCK', 'GEOPOLITIC_CRISIS')")
    sim_runs: int = Field(default=1000, ge=10, le=10000, description="Simülasyon turu")


class NotificationTestRequest(BaseModel):
    message: Optional[str] = "Bistapp MT16 Otonom Asistan: Telegram bildirim sistemi testi başarılı."
    priority: Optional[str] = "NORMAL"


class GlobalEvaluateRequest(BaseModel):
    symbol: str = Field(..., description="Küresel hisse veya kripto sembolü (orn: AAPL, TSLA, BTC/USDT)")
    market_regime: Optional[MarketRegime] = Field(default=MarketRegime.BULL)


class MacroEvaluateRequest(BaseModel):
    ticker: Optional[str] = Field(default="ASELS", description="BIST Hisse Kodu (orn: ASELS, GARAN, THYAO)")
    scenario: Optional[str] = Field(default="FAIZ_ARTISI_250BP", description="Makro senaryo (FAIZ_ARTISI_250BP, DOLAR_10_ARTIS, JEOPOLITIK_KRİZ)")
    usd_try_change: Optional[float] = Field(default=0.85, description="USD/TRY değişim yüzdesi")
    brent_change: Optional[float] = Field(default=1.20, description="Brent ham petrol değişim yüzdesi")
    xbank_change: Optional[float] = Field(default=-1.40, description="XBANK bankacılık endeksi değişim yüzdesi")


class KillSwitchRequest(BaseModel):
    reason: str = Field(default="Manuel Acil Durum Kapatma", description="Kill-switch tetiklenme sebebi")


class LessonLogRequest(BaseModel):
    ticker: str
    decision: str
    outcome: str
    lesson: str
    reflection: Optional[str] = ""
    target_agent: Optional[str] = "GeneralAgent"


class FactorRegisterRequest(BaseModel):
    factor_name: str
    symbol: str
    formula: str
    correlation_score: float
    evidence_summary: str


class OrderRequest(BaseModel):
    ticker: str = Field(..., description="BIST Hisse Kodu")
    side: str = Field(..., description="'BUY' veya 'SELL'")
    qty: int = Field(..., gt=0, description="Toplam adet")
    execution_style: str = Field(default="ICEBERG", description="'TWAP', 'VWAP' veya 'ICEBERG'")
    price_limit: Optional[float] = Field(default=None)
    paper_trading: bool = Field(default=True)


class AuthRegisterRequest(BaseModel):
    email: str = Field(..., description="Kullanıcı e-posta adresi")
    password: str = Field(..., min_length=6, description="Kullanıcı parolası (en az 6 karakter)")
    subscription_status: Optional[str] = Field(default="FREE", description="Abonelik türü (FREE, PRO, ENTERPRISE)")


class AuthLoginRequest(BaseModel):
    email: str = Field(..., description="Kullanıcı e-posta adresi")
    password: str = Field(..., description="Kullanıcı parolası")


class ExportReportRequest(BaseModel):
    ticker: str = Field(default="ASELS", description="Hisse veya varlık kodu")
    format: str = Field(default="excel", description="İhraç formatı: 'excel' / 'xlsx' veya 'word' / 'docx'")
    decision_data: Optional[Dict[str, Any]] = Field(default=None, description="Çoklu ajan karar çıktısı JSON")
    analysis_text: Optional[str] = Field(default=None, description="Opsiyonel analist yorumu veya LLM metni")


class PortfolioVaRRequest(BaseModel):
    portfolio: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"ticker": "THYAO", "value_tl": 300000.0},
        {"ticker": "ASELS", "value_tl": 250000.0},
        {"ticker": "KCHOL", "value_tl": 200000.0},
    ], description="Mevcut portföy varlık listesi")
    new_asset: Optional[Dict[str, Any]] = Field(default=None, description="Opsiyonel olası yeni alım (ticker, value_tl)")
    confidence_level: Optional[float] = Field(default=0.95, description="Güven seviyesi (0.90, 0.95, 0.99)")
    time_horizon_days: Optional[int] = Field(default=1, description="Zaman ufku (gün)")


class NlpSearchRequest(BaseModel):
    query: Optional[str] = None
    text: Optional[str] = None


class ValidatePsychologyRequest(BaseModel):
    user_id: Optional[str] = "trader_1"
    ticker: str = "ASELS"
    side: str = "BUY"
    order_type: Optional[str] = "LIMIT"
    order_amount_tl: Optional[float] = 0.0
    lot: Optional[float] = 0.0
    price: Optional[float] = 0.0
    portfolio_total_tl: Optional[float] = 1000000.0


class TaxCalculateRequest(BaseModel):
    ticker: str = "ASELS"
    asset_type: str = "BIST_EQUITY"
    buy_date: str = "2024-01-02"
    sell_date: str = "2026-10-07"
    buy_price_tl: float = 100.0
    sell_price_tl: float = 180.0
    lot_count: float = 1000.0


class MirrorSignalRequest(BaseModel):
    leader_id: str = "leader_kemal_alpha"
    ticker: str = "THYAO"
    action: str = "BUY"
    old_weight_pct: float = 20.0
    new_weight_pct: float = 30.0
    execution_price: float = 282.50
    follower_portfolio_tl: float = 100000.0
    max_allocation_pct: float = 25.0


class KapAnalyzeRequest(BaseModel):
    ticker: str = "ASELS"
    title: str = ""
    body_text: str = ""
    disclosure_type: Optional[str] = None
    custom_amount_tl: Optional[float] = None


class SmartOrderRequest(BaseModel):
    order_type: str = "TRAILING_STOP"  # TRAILING_STOP veya STEP_GRID
    ticker: str = "ASELS"
    current_price: float = 372.80
    entry_price: Optional[float] = 340.00
    peak_price: Optional[float] = 385.00
    side: Optional[str] = "BUY"
    atr_value: Optional[float] = None
    atr_multiplier: Optional[float] = 2.0
    trailing_pct: Optional[float] = 2.5
    grid_levels: Optional[int] = 5
    step_pct: Optional[float] = 1.2
    total_capital_tl: Optional[float] = 100000.0
    allocation_mode: Optional[str] = "EQUAL"


class SmartOrderPlanRequest(BaseModel):
    ticker: str = "ASELS"
    side: str = "BUY"
    total_qty: int = 1000
    current_price: float = 100.0


class AnalystSurpriseRequest(BaseModel):
    ticker: str = Field(default="ASELS", description="BIST Hisse Kodu")
    actual_net_income: float = Field(default=7800.0, description="Açıklanan net kâr (Milyon TL)")
    consensus_estimate: float = Field(default=6400.0, description="Konsensüs piyasa beklentisi (Milyon TL)")


class SocialAutoPostRequest(BaseModel):
    ticker: str = Field(default="ASELS", description="BIST Hisse Kodu")
    platform: Optional[str] = Field(default="telegram", description="Hedef platform ('telegram', 'twitter' veya 'all')")
    force_refresh: Optional[bool] = Field(default=False, description="Taze analiz koşturulsun mu?")


class McpToolCallRequest(BaseModel):
    name: str = Field(..., description="MCP Araç Adı (get_stock_price, run_debate_analysis, get_market_sentiment)")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Araç parametreleri")


class TaskQueueAnalyzeRequest(BaseModel):
    ticker: str = Field(default="ASELS", description="BIST Hisse Kodu")
    market_regime: Optional[str] = Field(default="BULL", description="Piyasa rejimi")


class QuizSubmitRequest(BaseModel):
    username: str = "demo_user"
    quiz_id: str
    answers: List[int]


class TelegramConfigRequest(BaseModel):
    enabled: bool = True
    bot_token: str = ""
    chat_id: str = ""
    notify_bofa_dumps: bool = True
    notify_wall_breach: bool = True
    notify_fomo_risk: bool = True


class TelegramTestRequest(BaseModel):
    message: str = "🤖 BIST Terminal Test Mesajı"


class BacktestRunRequest(BaseModel):
    ticker: str = "ASELS"
    period_years: int = 1
    initial_capital: float = 100000.0
    risk_threshold: float = 2.5
    simulate_future: bool = True
    simulation_days: int = 30


class FactorDiscoveryRequest(BaseModel):
    ticker: str
    metrics: Dict[str, Any]
    alpha_target: Optional[float] = 0.15


class PortfolioOptimizeRequest(BaseModel):
    returns: List[float]
    volatilities: List[float]
    asset_classes: List[str] # ["BIST", "NASDAQ", "CRYPTO"]
    aversion: float = 3.0
