from typing import List, Optional
from enum import Enum
from datetime import datetime

try:
    from pydantic import BaseModel, Field, field_validator, ConfigDict, AliasChoices
    HAS_PYDANTIC = True
except ImportError:
    HAS_PYDANTIC = False
    
    class BaseModel:
        def __init__(self, **kwargs):
            self.ticker = str(kwargs.get("ticker", "BIST")).upper()
            self.verdict = kwargs.get("verdict", "HOLD")
            
            # Map camelCase to snake_case if needed for legacy support
            self.confidence_score = float(kwargs.get("confidenceScore", kwargs.get("confidence_score", 50.0)))
            self.entry_zone = str(kwargs.get("entryZone", kwargs.get("entry_zone", "Belirtilmedi")))
            self.target_price = str(kwargs.get("targetPrice", kwargs.get("target_price", "Belirtilmedi")))
            self.stop_loss = str(kwargs.get("stopLoss", kwargs.get("stop_loss", "Belirtilmedi")))
            self.active_shields = list(kwargs.get("activeShields", kwargs.get("active_shields", [])))
            
            self.reasoning = str(kwargs.get("reasoning", "Analiz tamamlandı."))
            self.timestamp = str(kwargs.get("timestamp", datetime.utcnow().isoformat()))

        def model_dump(self, by_alias: bool = True, **kwargs) -> dict:
            if by_alias:
                return {
                    "ticker": self.ticker,
                    "verdict": self.verdict,
                    "confidenceScore": self.confidence_score,
                    "entryZone": self.entry_zone,
                    "targetPrice": self.target_price,
                    "stopLoss": self.stop_loss,
                    "activeShields": self.active_shields,
                    "reasoning": self.reasoning,
                    "timestamp": self.timestamp,
                }
            return {
                "ticker": self.ticker,
                "verdict": self.verdict,
                "confidence_score": self.confidence_score,
                "entry_zone": self.entry_zone,
                "target_price": self.target_price,
                "stop_loss": self.stop_loss,
                "active_shields": self.active_shields,
                "reasoning": self.reasoning,
                "timestamp": self.timestamp,
            }

        @classmethod
        def model_validate(cls, obj: dict):
            return cls(**obj) if isinstance(obj, dict) else obj

class JuryVerdict(str, Enum):
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"

class JuryDecisionPayload(BaseModel):
    """
    BistApp MT16 Kuant Jüri Karar Veri Sözleşmesi (Pydantic v2 Modeli)
    TypeScript camelCase uyumluluğu için validation ve serialization alias'ları kullanır.
    """
    ticker: str = Field(..., description="Varlık kodu (Örn: THYAO, BTCUSDT)")
    verdict: JuryVerdict = Field(..., description="Nihai jüri kararı")
    
    confidence_score: float = Field(
        ..., 
        validation_alias=AliasChoices("confidenceScore", "confidence_score") if HAS_PYDANTIC else "confidenceScore",
        serialization_alias="confidenceScore",
        ge=0, 
        le=100, 
        description="Karar güven skoru (0-100)"
    )
    
    entry_zone: str = Field(
        ..., 
        validation_alias=AliasChoices("entryZone", "entry_zone") if HAS_PYDANTIC else "entryZone",
        serialization_alias="entryZone",
        description="Önerilen giriş fiyat bölgesi"
    )
    
    target_price: str = Field(
        ..., 
        validation_alias=AliasChoices("targetPrice", "target_price") if HAS_PYDANTIC else "targetPrice",
        serialization_alias="targetPrice",
        description="Hedef fiyat seviyesi"
    )
    
    stop_loss: str = Field(
        ..., 
        validation_alias=AliasChoices("stopLoss", "stop_loss") if HAS_PYDANTIC else "stopLoss",
        serialization_alias="stopLoss",
        description="Zarar kes (Stop-loss) seviyesi"
    )
    
    active_shields: List[str] = Field(
        ..., 
        validation_alias=AliasChoices("activeShields", "active_shields") if HAS_PYDANTIC else "activeShields",
        serialization_alias="activeShields",
        description="İşlem sırasında tetiklenen veya aktif olan kalkanlar"
    )
    
    reasoning: str = Field(..., description="Jürinin detaylı karar gerekçesi")
    
    timestamp: Optional[str] = Field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )

    if HAS_PYDANTIC:
        model_config = ConfigDict(
            populate_by_name=True,
            json_schema_extra={
                "example": {
                    "ticker": "THYAO",
                    "verdict": "STRONG_BUY",
                    "confidenceScore": 92.5,
                    "entryZone": "305.00 - 310.00",
                    "targetPrice": "365.00",
                    "stopLoss": "298.00",
                    "activeShields": ["BofA Accumulation Shield", "Volatility Shield"],
                    "reasoning": "Teknik kırılım ve kurumsal takas desteği teyit edildi.",
                    "timestamp": "2024-10-24T10:00:00Z"
                }
            }
        )

        @field_validator('ticker')
        @classmethod
        def ticker_must_be_upper(cls, v: str) -> str:
            return v.upper()

    def to_json_payload(self) -> dict:
        """
        Express Gateway'e gönderilmek üzere veriyi camelCase anahtarlarla döner.
        """
        if HAS_PYDANTIC:
            return self.model_dump(by_alias=True)
        return self.model_dump(by_alias=True)
