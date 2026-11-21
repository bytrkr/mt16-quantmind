import sys
import importlib
from types import ModuleType

def mock_module(name):
    if name in sys.modules:
        return sys.modules[name]
    try:
        return importlib.import_module(name)
    except ImportError:
        m = ModuleType(name)
        sys.modules[name] = m
        return m

# Yalnizca gercek paket yoksa fallback mock olustur
for pkg in ['pydantic', 'requests', 'fastapi', 'yfinance', 'google.generativeai', 'pandas', 'numpy', 'apscheduler', 'apscheduler.schedulers.background']:
    mock_module(pkg)
