"""
MT16 QuantMind - FastMCP Quantitative Terminal Server (mcp_server.py)
------------------------------------------------------------------
FastMCP kullanılarak oluşturulan Model Context Protocol (MCP) sunucusu.
market_gateway.py modülündeki GLOBAL_REGISTRY ve get_universal_market_data araçlarını LLM ajanlarına ve harici MCP istemcilerine açar.
"""

import sys
import os

# python dizinini sys.path ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    FastMCP = None

from market_gateway import GLOBAL_REGISTRY, get_universal_market_data

# FastMCP Sunucusu Tanımı
mcp = FastMCP("MT16 QuantMind Quantitative Terminal") if FastMCP else None

if mcp:
    @mcp.tool()
    def fetch_live_market_data(market_type: str, ticker: str) -> dict:
        """
        BIST, NASDAQ, CRYPTO veya FOREX piyasasındaki bir varlığın yfinance motoru üzerinden
        anlık canlı fiyatını, sembolünü ve durumunu döner.
        """
        try:
            return get_universal_market_data(market_type=market_type, ticker=ticker)
        except Exception as e:
            return {"error": str(e), "success": False}

    @mcp.tool()
    def list_supported_assets() -> dict:
        """
        MT16 QuantMind Kuant Terminali tarafından desteklenen tüm pazar evrelerini,
        sembolleri ve piyasa kademelerini (tier) listeler.
        """
        return {
            "success": True,
            "markets": list(GLOBAL_REGISTRY.keys()),
            "registry": GLOBAL_REGISTRY
        }

def run_mcp_server():
    """MCP Sunucusunu başlatır."""
    if mcp:
        print("🚀 [FastMCP] MT16 QuantMind Quantitative Terminal MCP Server başlatılıyor...")
        mcp.run()
    else:
        print("⚠️ [FastMCP] 'mcp' kütüphanesi yüklü değil. Lütfen 'pip install mcp' komutunu çalıştırın.")

if __name__ == "__main__":
    run_mcp_server()
