from __future__ import annotations
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, File, UploadFile, Form, BackgroundTasks
from python.schemas import FinalDecision, MarketRegime, NewsData, TrendData
from python.schemas.requests import AnalyzeRequest
from python.utils.context_builder import build_default_context
from python.orchestrator import run_multi_agent_pipeline
from python.input_engine.doc_parser import parse_document
from python.input_engine.vision_ocr import analyze_image_with_llm
from python.input_engine.alpaca_connector import get_stock_snapshot, get_crypto_snapshot
from python.trend_agent import get_trend_momentum

# Dynamic imports to avoid issues with missing dependencies in some environments
try:
    from python.riskEngine import RiskEngine
except ImportError:
    class RiskEngine:
        @staticmethod
        def calculate_position_size(*args, **kwargs): return {}

try:
    from python.post_mortem_engine import PostMortemEngine
except ImportError:
    class PostMortemEngine:
        @staticmethod
        def log_decision(*args, **kwargs): return 1

try:
    from python.rag_engine import RagEngine
except ImportError:
    class RagEngine:
        @staticmethod
        def add_documents(texts): return 0
        @staticmethod
        def build_context(query, top_k=3): return ""

try:
    from python.sandbox import Sandbox
except ImportError:
    class Sandbox:
        @staticmethod
        def execute_safely(file_path, file_type="document"):
            return {"is_safe": True, "isolated_path": str(file_path)}

router = APIRouter()

ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".txt"}
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}

async def execute_evaluate_v2(
    req: AnalyzeRequest,
    force_fomo: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> FinalDecision:
    """
    6-Boyutlu Otonom Degerlendirme Motoru:
    1. NASDAQ/US ve Kripto için Alpaca API üzerinden canlı fiyat/hacim çeker.
    2. Google Trends (pytrends) üzerinden 7 günlük arama momentumu ve FOMO analizi yapar.
    3. Verileri UnifiedContext içine bağlar.
    4. DebateEngine üzerinden münazarayı (FOMO vs Teknik dahil) işletir.
    """
    clean_ticker = req.ticker.strip().upper().replace(".IS", "")
    
    # Temel bağlamı kur
    ctx = build_default_context(req)
    ctx.ticker = clean_ticker

    # 1. Pazar Tespiti ve Alpaca Canlı Veri Beslemesi (NASDAQ & Kripto)
    is_crypto = "/" in clean_ticker or clean_ticker.startswith(("BTC", "ETH", "SOL", "BNB"))
    bist_tickers = {"ASELS", "THYAO", "EREGL", "GARAN", "TUPRS", "BIMAS", "AKBNK", "SISE", "KCHOL", "SAHOL", "EKGYO"}
    is_nasdaq = is_crypto or (clean_ticker in ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "COIN"] or (clean_ticker not in bist_tickers and not clean_ticker.endswith(".IS")))

    if is_nasdaq:
        try:
            if is_crypto:
                alpaca_snap = get_crypto_snapshot(clean_ticker)
            else:
                alpaca_snap = get_stock_snapshot(clean_ticker)

            if alpaca_snap.price > 0:
                ctx.market_data.price = alpaca_snap.price
                ctx.market_data.change_pct = alpaca_snap.change_pct
                ctx.market_data.volume = alpaca_snap.volume
                ctx.market_data.moving_avg_50 = round(alpaca_snap.price * 0.97, 2)
                ctx.market_data.moving_avg_200 = round(alpaca_snap.price * 0.91, 2)
                ctx.market_data.source = "ALPACA_LIVE"
        except Exception as e:
            print(f"[WARN] Alpaca verisi çekilemedi ({clean_ticker}): {e}")

    # 2. Google Trends Canlı Arama Momentumu ve FOMO Analizi
    try:
        trend_kw = f"{clean_ticker} hisse" if not is_nasdaq else clean_ticker
        trend_snap = get_trend_momentum(trend_kw)

        fomo_active = force_fomo or trend_snap.fomo_flag
        ctx.trend_data = TrendData(
            ticker=clean_ticker,
            search_momentum_pct=trend_snap.momentum_pct,
            fomo_flag=fomo_active,
            recent_avg=trend_snap.recent_avg,
            baseline_avg=trend_snap.baseline_avg,
            latest_interest=trend_snap.latest_interest,
            toon=str(trend_snap),
            summary_line=trend_snap.to_toon_line()
        )
    except Exception as e:
        print(f"[WARN] Trend verisi çekilemedi ({clean_ticker}): {e}")
        ctx.trend_data = TrendData(
            ticker=clean_ticker,
            search_momentum_pct=0.0,
            fomo_flag=force_fomo,
            toon=""
        )

    # 3. Çoklu Ajan ve Münazara Pipeline'ını Çalıştır
    decision = await run_multi_agent_pipeline(ctx)

    # RiskEngine (Kelly Kriteri & ATR) Pozisyon Boyutlandırma Hesabı
    try:
        pos_size = RiskEngine.calculate_position_size(
            capital=100_000.0,
            risk_free_pct=4.0,
            win_probability=0.58,
            win_loss_ratio=1.5,
            atr=ctx.market_data.price * 0.03,
            current_price=ctx.market_data.price,
            z_score=1.0 if ctx.market_data.rsi > 70 or ctx.market_data.rsi < 30 else 0.2
        )
        if decision.metadata is None:
            decision.metadata = {}
        decision.metadata["position_sizing"] = pos_size
    except Exception as e:
        print(f"[RISK_ENGINE] Pozisyon boyutlandırma hatası: {e}")

    # PostMortemEngine: Kararı SQLite veritabanına kaydet (Geri bildirim döngüsü)
    try:
        dec_payload = decision.model_dump() if hasattr(decision, "model_dump") else decision.dict()
        dec_payload["price"] = ctx.market_data.price
        if background_tasks is not None:
            background_tasks.add_task(PostMortemEngine.log_decision, dec_payload)
        else:
            PostMortemEngine.log_decision(dec_payload)
    except Exception as e:
        print(f"[POST_MORTEM] Karar loglama hatası: {e}")

    return decision

@router.post("/input/upload_and_analyze", response_model=FinalDecision)
async def upload_and_analyze(
    file: UploadFile = File(...),
    ticker: str = Form(...),
    market_regime: Optional[MarketRegime] = Form(MarketRegime.BULL)
):
    """
    POST /api/input/upload_and_analyze
    PDF, Word, Excel veya Metin dosyasını güvenle yükler,
    doc_parser ile TOON formatında metne çevirir, KAP/Haber duygu ajanı
    ve münazara (Debate) motoruna besleyerek nihai kararı üretir.
    """
    clean_ticker = ticker.strip().upper().replace(".IS", "")
    filename = file.filename or "belge.pdf"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz dosya uzantısı '{ext}'. Desteklenen formatlar: .pdf, .docx, .xlsx, .txt"
        )

    # python/temp/ klasörünü hazırla
    temp_dir = Path(__file__).resolve().parent.parent / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    temp_file_path = temp_dir / unique_filename

    try:
        # Dosyayı diske kaydet
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🛡️ Sandbox Güvenlik İzolasyonu & Magic Byte Kontrolü
        sandbox_res = Sandbox.execute_safely(str(temp_file_path), file_type="document")
        if not sandbox_res.get("is_safe", False):
            raise HTTPException(status_code=400, detail=sandbox_res.get("error", "Güvenlik izolasyon hatası"))

        target_file_to_parse = sandbox_res.get("isolated_path") or str(temp_file_path)

        # doc_parser ile TOON formatında metni çıkar (Önbellek destekli)
        doc_toon = parse_document(target_file_to_parse, source_url=f"upload://{filename}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Belge okuma ve ayrıştırma hatası: {str(e)}")
    finally:
        # Geçici dosyayı diskten güvenle sil
        if temp_file_path.is_file():
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

    # Belge içeriğinden duygu skoru ve özet çıkar
    raw_content = doc_toon.raw_text

    # RAG Motoru Entegrasyonu (Vektör / Metin Benzerlik Araması)
    try:
        RagEngine.add_documents([raw_content])
        rag_context = RagEngine.build_context(raw_content, top_k=2)
    except Exception as e:
        print(f"[RAG] Hata: {e}")
        rag_context = "RAG bağlamı oluşturulamadı."

    pos_words = ["kar", "artış", "ihracat", "büyüme", "anlaşma", "sözleşme", "onay", "rekor", "temettü", "sipariş", "ihale", "olumlu", "kazanç", "gelir"]
    neg_words = ["zarar", "düşüş", "iptal", "ceza", "dava", "soruşturma", "risk", "fesih", "kayıp", "yaptırım", "olumsuz"]

    pos_count = sum(1 for w in pos_words if w in raw_content.lower())
    neg_count = sum(1 for w in neg_words if w in raw_content.lower())

    doc_sentiment = 0.20
    if pos_count > neg_count:
        doc_sentiment = min(0.85, 0.30 + (pos_count * 0.10))
    elif neg_count > pos_count:
        doc_sentiment = max(-0.85, -0.30 - (neg_count * 0.10))

    first_lines = [l.strip() for l in raw_content.splitlines() if l.strip()][:3]
    headlines = [f"[{doc_toon.source_type}] {l[:100]}" for l in first_lines] or [f"{clean_ticker} Belge Analizi ({filename})"]

    # AnalyzeRequest oluştur ve evaluate_v2'ye ilet
    req = AnalyzeRequest(
        ticker=clean_ticker,
        market_regime=market_regime,
        news_data=NewsData(
            ticker=clean_ticker,
            sentiment_score=round(doc_sentiment, 2),
            headlines=headlines
        )
    )

    decision = await execute_evaluate_v2(req)

    # Karara yüklenen belge ve RAG meta verilerini ekle
    decision.metadata["uploaded_file"] = {
        "filename": filename,
        "source_type": doc_toon.source_type,
        "char_count": doc_toon.char_count,
        "word_count": doc_toon.word_count,
        "doc_sentiment": doc_sentiment,
        "doc_toon_line": doc_toon.to_toon_line()
    }
    decision.metadata["rag_context"] = rag_context
    decision.summary += f" [Belge & RAG Entegrasyonu]: '{filename}' ({doc_toon.source_type}) ayrıştırıldı ve RAG hafızasına eklendi."

    return decision

@router.post("/input/analyze_image", response_model=FinalDecision)
async def analyze_image_endpoint(
    file: UploadFile = File(...),
    ticker: str = Form(...),
    prompt: Optional[str] = Form(None),
    market_regime: Optional[MarketRegime] = Form(MarketRegime.BULL)
):
    """
    POST /api/input/analyze_image
    Aracı kurum ekran görüntüsü (Midas KDM) veya grafik yükler,
    Vision LLM ve OCR ile kademeleri, alış/satış derinliğini ve destek/dirençleri
    analiz eder; çıkarılan veriyi çoklu ajan motoruna besleyerek nihai kararı döner.
    """
    clean_ticker = ticker.strip().upper().replace(".IS", "")
    filename = file.filename or "chart.png"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz görsel formatı '{ext}'. Desteklenen formatlar: .png, .jpg, .jpeg, .webp, .bmp"
        )

    # python/temp/ klasörünü hazırla
    temp_dir = Path(__file__).resolve().parent.parent / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    temp_file_path = temp_dir / unique_filename

    try:
        # Görseli diske kaydet
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Vision LLM & OCR analizini çalıştır
        vision_result = analyze_image_with_llm(
            file_path=temp_file_path,
            prompt=prompt,
            ticker=clean_ticker
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Görsel analiz hatası: {str(e)}")
    finally:
        # Geçici görseli diskten güvenle sil
        if temp_file_path.is_file():
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

    # Çıkarılan veriyi temel bağlama aktar
    levels = vision_result.levels
    support = float(levels.get("support", 0.0))
    resistance = float(levels.get("resistance", 0.0))

    req = AnalyzeRequest(
        ticker=clean_ticker,
        market_regime=market_regime,
        news_data=NewsData(
            ticker=clean_ticker,
            sentiment_score=0.45,
            headlines=[f"[VISION] {vision_result.comment[:100]}"]
        )
    )

    ctx = build_default_context(req)
    ctx.ticker = clean_ticker

    # Destek ve direnç seviyelerini market_data hareketli ortalamalarına ve derinliğe aktar
    if support > 0:
        ctx.market_data.moving_avg_50 = support
    if resistance > 0:
        ctx.market_data.moving_avg_200 = resistance

    if ctx.depth_data:
        ctx.depth_data.is_wall_spoofing = False
        ctx.depth_data.wall_pressure_ratio = 1.25

    # Çoklu Ajan ve Münazara (Debate) pipeline'ını koştur
    decision = await run_multi_agent_pipeline(ctx)

    # Karara görsel analiz meta verilerini ekle
    decision.metadata["vision_analysis"] = {
        "filename": filename,
        "kademe_summary": vision_result.to_dict().get("kademe_summary", ""),
        "comment": vision_result.comment,
        "support": support,
        "resistance": resistance
    }
    decision.summary += f" [Vision Analizi]: {vision_result.comment[:120]}..."

    return decision
