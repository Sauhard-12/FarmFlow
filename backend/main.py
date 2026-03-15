from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import CROPS_BY_ID, CITIES, CROPS, MARKET_TYPES, RISK_DATA
from simulation.demand_engine      import score_cities
from simulation.profit_engine      import calculate_options
from simulation.expense_engine     import (calculate_expenses, calculate_true_profit,
                                           calculate_breakeven_price)
from simulation.environmental_risk import calculate_environmental_risk
from simulation.storage_engine     import calculate_store_vs_sell
from ai.ai_agent                   import ask_ai, ask_ai_with_intent, get_ai_provider_name
from ai.price_forecaster           import forecast_price_trend
from ai.prompts                    import (build_route_analysis_prompt, build_market_pulse_prompt,
                                           build_risk_summary_prompt, build_storage_advice_prompt,
                                           build_expense_summary_prompt)
from db.database import init_tables, log_simulation, get_community_stats

app = FastAPI(title="CropIQ API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_tables()


class SimulateRequest(BaseModel):
    farm_lat:            float
    farm_lng:            float
    farm_location:       str
    crop_id:             str
    harvest_month:       int
    quantity_kg:         float
    storage_capacity_kg: float
    acres:               Optional[float] = None
    expense_overrides:   Optional[dict]  = {}


class ChatRequest(BaseModel):
    message: str
    context: dict = {}


class MarketPulseRequest(BaseModel):
    crop_id:       str
    harvest_month: int


@app.get("/")
def health():
    return {
        "status":      "ok",
        "ai_provider": get_ai_provider_name(),
        "crop_count":  len(CROPS),
        "city_count":  len(CITIES),
        "version":     "3.0.0",
    }


@app.get("/crops")
def get_crops():
    return CROPS


@app.get("/cities")
def get_cities():
    return CITIES


@app.get("/market-types")
def get_market_types():
    return MARKET_TYPES


@app.get("/community/stats")
def community_stats():
    stats = get_community_stats()
    stats["ai_provider"] = get_ai_provider_name()
    return stats


@app.post("/simulate")
def simulate(req: SimulateRequest):

    crop = CROPS_BY_ID.get(req.crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail=f"Crop '{req.crop_id}' not found")
    if not (1 <= req.harvest_month <= 12):
        raise HTTPException(status_code=400, detail="harvest_month must be 1-12")

    typical_yield = RISK_DATA["typical_yield_kg_per_acre"].get(req.crop_id, 5000)
    acres = req.acres if req.acres and req.acres > 0 else round(req.quantity_kg / typical_yield, 2)

    city_demand = score_cities(req.farm_lat, req.farm_lng, crop, req.harvest_month)
    options = calculate_options(city_demand, crop, req.quantity_kg)
    if not options:
        raise HTTPException(status_code=500, detail="No distribution options calculated")
    top_option = options[0]

    expenses    = calculate_expenses(req.crop_id, req.quantity_kg, acres, req.expense_overrides or {})
    true_profit = calculate_true_profit(
        top_option["gross_revenue"],
        top_option["transport_cost"],
        expenses["total_farm_cost"],
    )
    breakeven = calculate_breakeven_price(
        top_option["transport_cost"],
        expenses["total_farm_cost"],
        req.quantity_kg,
    )

    env_risk = calculate_environmental_risk(
        req.farm_lat, req.farm_lng,
        req.crop_id, req.harvest_month,
        top_option["region"], top_option["distance_km"],
    )

    store_vs_sell = calculate_store_vs_sell(
        req.crop_id, crop, req.quantity_kg,
        req.storage_capacity_kg, top_option,
        req.harvest_month, true_profit["true_net_profit"],
        env_risk["score"],
    )

    scenarios = []
    for label, mult in [("Bear 🐻", 0.80), ("Base 📊", 1.00), ("Bull 🚀", 1.20)]:
        gross    = round(top_option["gross_revenue"] * mult, 2)
        trans    = top_option["transport_cost"]
        true_net = round(gross - trans - expenses["total_farm_cost"], 2)
        price_pk = round(gross / req.quantity_kg, 4) if req.quantity_kg > 0 else 0
        scenarios.append({
            "label":           label,
            "price_mult":      mult,
            "gross_revenue":   gross,
            "transport_cost":  trans,
            "farm_expenses":   expenses["total_farm_cost"],
            "true_net_profit": true_net,
            "net_profit":      true_net,
            "price_per_kg":    price_pk,
            "margin_pct":      round((true_net / gross * 100), 1) if gross > 0 else 0,
            "risk_label":      top_option["risk_label"],
            "above_breakeven": price_pk >= breakeven,
        })

    ai_recommendation = ask_ai(build_route_analysis_prompt(
        crop["name"], req.quantity_kg, req.harvest_month, req.farm_location, options
    ))
    risk_summary = ask_ai(build_risk_summary_prompt(
        crop["name"], top_option, scenarios
    ))
    market_commentary = ask_ai(build_market_pulse_prompt(
        crop["name"], req.harvest_month, crop["supply_index"]
    ))
    storage_advice = ask_ai(build_storage_advice_prompt(
        crop["name"], store_vs_sell, env_risk["label"],
        true_profit["true_net_profit"], breakeven
    ))
    expense_summary = ask_ai(build_expense_summary_prompt(
        crop["name"], expenses, true_profit, acres
    ))

    log_simulation(
        farm_location = req.farm_location,
        crop_id       = req.crop_id,
        crop_name     = crop["name"],
        quantity_kg   = req.quantity_kg,
        harvest_month = req.harvest_month,
        top_city      = top_option["city_name"],
        top_buyer     = top_option["buyer_name"],
        net_profit    = true_profit["true_net_profit"],
        distance_km   = top_option["distance_km"],
        risk_label    = top_option["risk_label"],
        ai_provider   = get_ai_provider_name(),
    )

    return {
        "crop":              crop,
        "top_options":       options,
        "top_option":        top_option,
        "city_demand":       city_demand,
        "expenses":          expenses,
        "true_profit":       true_profit,
        "breakeven_price":   breakeven,
        "acres_estimated":   acres,
        "env_risk":          env_risk,
        "store_vs_sell":     store_vs_sell,
        "scenarios":         scenarios,
        "ai_recommendation": {"text": ai_recommendation, "ai_provider": get_ai_provider_name()},
        "market_commentary": market_commentary,
        "risk_summary":      risk_summary,
        "storage_advice":    storage_advice,
        "expense_summary":   expense_summary,
        "ai_provider":       get_ai_provider_name(),
    }


@app.post("/advisor/chat")
def advisor_chat(req: ChatRequest):
    return ask_ai_with_intent(req.message, req.context)


@app.post("/chat")
def chat(req: ChatRequest):
    return ask_ai_with_intent(req.message, req.context)


@app.post("/environmental-risk")
def environmental_risk(req: dict):
    return calculate_environmental_risk(
        req["farm_lat"], req["farm_lng"],
        req["crop_id"], req["harvest_month"],
        req.get("destination_region", "GTA - Core"),
        req.get("distance_km", 100),
    )


@app.post("/store-vs-sell")
def store_vs_sell(req: dict):
    crop = CROPS_BY_ID.get(req["crop_id"])
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    return calculate_store_vs_sell(
        req["crop_id"], crop,
        req["quantity_kg"], req["storage_capacity_kg"],
        req["top_option"], req["true_net_profit"],
        req.get("harvest_month", 10),
        req.get("env_risk_score", 30),
    )


@app.post("/scenarios")
def scenarios(req: dict):
    crop = CROPS_BY_ID.get(req["crop_id"])
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    typical_yield = RISK_DATA["typical_yield_kg_per_acre"].get(req["crop_id"], 5000)
    acres = req.get("acres") or round(req["quantity_kg"] / typical_yield, 2)

    city_demand = score_cities(req["farm_lat"], req["farm_lng"], crop, req["harvest_month"])
    options = calculate_options(city_demand, crop, req["quantity_kg"])
    if not options:
        raise HTTPException(status_code=500, detail="No options")
    top = options[0]

    expenses = calculate_expenses(req["crop_id"], req["quantity_kg"], acres)
    result = []
    for label, mult in [("Bear 🐻", 0.80), ("Base 📊", 1.00), ("Bull 🚀", 1.20)]:
        gross    = round(top["gross_revenue"] * mult, 2)
        trans    = top["transport_cost"]
        true_net = round(gross - trans - expenses["total_farm_cost"], 2)
        price_pk = round(gross / req["quantity_kg"], 4) if req["quantity_kg"] > 0 else 0
        result.append({
            "label":         label,
            "gross_revenue": gross,
            "transport_cost":trans,
            "net_profit":    true_net,
            "price_per_kg":  price_pk,
            "margin_pct":    round((true_net / gross * 100), 1) if gross > 0 else 0,
            "risk_label":    top["risk_label"],
        })

    risk_text = ask_ai(build_risk_summary_prompt(crop["name"], top, result))
    return {"scenarios": result, "ai_risk_summary": risk_text, "top_option": top}


@app.post("/market-pulse")
def market_pulse(req: MarketPulseRequest):
    crop = CROPS_BY_ID.get(req.crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail=f"Crop '{req.crop_id}' not found")

    price_trend      = forecast_price_trend(
        crop["id"], crop["price_per_kg"],
        crop["price_volatility"], crop["best_months"], req.harvest_month,
    )
    best_sell_month  = max(price_trend, key=lambda x: x["price"])["month"]
    forecasted       = any(p["forecasted"] for p in price_trend)
    commentary       = ask_ai(build_market_pulse_prompt(
        crop["name"], req.harvest_month, crop["supply_index"]
    ))

    return {
        "crop":            crop,
        "price_trend":     price_trend,
        "best_sell_month": best_sell_month,
        "current_price":   crop["price_per_kg"],
        "commentary":      commentary,
        "forecasted":      forecasted,
        "ai_provider":     get_ai_provider_name(),
    }