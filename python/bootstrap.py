
import sys
from types import ModuleType

def mock_module(name):
    if name not in sys.modules:
        m = ModuleType(name)
        sys.modules[name] = m
        return m
    return sys.modules[name]

# Mock pydantic
pydantic = mock_module('pydantic')
class BaseModel:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
    def dict(self): return self.__dict__
    def model_dump(self): return self.__dict__
pydantic.BaseModel = BaseModel
def Field(default=None, **kwargs): return default
pydantic.Field = Field

# Mock requests
requests = mock_module('requests')
class Session:
    def __init__(self): self.headers = {}
requests.Session = Session

# Mock fastapi
fastapi = mock_module('fastapi')
class FastAPI:
    def __init__(self, **kwargs):
        self.routes = []
        self.user_middleware = []
    def add_middleware(self, *args, **kwargs): pass
    def include_router(self, *args, **kwargs): pass
    def get(self, *args, **kwargs): return lambda f: f
    def post(self, *args, **kwargs): return lambda f: f
    def on_event(self, *args, **kwargs): return lambda f: f
fastapi.FastAPI = FastAPI
fastapi.HTTPException = Exception
fastapi.Header = lambda x: None
fastapi.Depends = lambda x: x
fastapi.Query = lambda x, **y: x
fastapi.Body = lambda x, **y: x
fastapi.APIRouter = lambda **x: FastAPI()

# Mock others
mock_module('yfinance')
mock_module('google.generativeai')
mock_module('pandas')
mock_module('numpy')
mock_module('apscheduler')
mock_module('apscheduler.schedulers.background')

print("Mocks initialized.")
