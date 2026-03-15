import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

WATSONX_API_KEY    = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL        = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
DATABASE_URL       = os.getenv("DATABASE_URL", "")

DATA_DIR = Path(__file__).parent / "data"

with open(DATA_DIR / "ontario_cities.json", encoding="utf-8")  as f: CITIES       = json.load(f)
with open(DATA_DIR / "crops.json", encoding="utf-8")           as f: CROPS        = json.load(f)
with open(DATA_DIR / "market_types.json", encoding="utf-8")    as f: MARKET_TYPES = json.load(f)
with open(DATA_DIR / "storage_data.json", encoding="utf-8")    as f: STORAGE_DATA = json.load(f)
with open(DATA_DIR / "risk_data.json", encoding="utf-8")       as f: RISK_DATA    = json.load(f)

CROPS_BY_ID        = {c["id"]: c for c in CROPS}
CITIES_BY_ID       = {c["id"]: c for c in CITIES}
MARKET_TYPES_BY_ID = {m["id"]: m for m in MARKET_TYPES}