import httpx
from config import RISK_DATA


def fetch_weather(lat, lng):
    """
    Open-Meteo free weather API. No API key needed.
    Returns 7-day daily forecast for the farm GPS coordinates.
    """
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum"
            "&timezone=America%2FToronto"
            "&forecast_days=7"
        )
        r = httpx.get(url, timeout=6.0)
        r.raise_for_status()
        data  = r.json()
        daily = data.get("daily", {})

        dates  = daily.get("time", [])
        max_t  = daily.get("temperature_2m_max", [])
        min_t  = daily.get("temperature_2m_min", [])
        precip = daily.get("precipitation_sum", [])
        snow   = daily.get("snowfall_sum", [])

        forecasts = []
        for i in range(len(dates)):
            forecasts.append({
                "date":     dates[i]  if i < len(dates)  else "",
                "max_temp": max_t[i]  if i < len(max_t)  else 20,
                "min_temp": min_t[i]  if i < len(min_t)  else 10,
                "qpf":      precip[i] if i < len(precip) else 0,
                "snow_qpf": snow[i]   if i < len(snow)   else 0,
            })

        return {"available": True, "forecasts": forecasts, "source": "Open-Meteo (open-meteo.com)"}

    except Exception as e:
        print(f"Open-Meteo weather fetch error: {e}")
        return {"available": False, "forecasts": [], "source": "error"}


def parse_weather_flags(forecasts, harvest_month):
    flags         = []
    risk_score    = 0.0
    min_temp_seen = 999
    max_rain_seen = 0

    for day in forecasts:
        min_t = day.get("min_temp", 20)
        max_t = day.get("max_temp", 20)
        rain  = day.get("qpf",      0)
        snow  = day.get("snow_qpf", 0)

        if min_t < min_temp_seen: min_temp_seen = min_t
        if rain  > max_rain_seen: max_rain_seen = rain

        if   min_t < 0:  flags.append("hard_frost");        risk_score = max(risk_score, 0.90)
        elif min_t < 2:  flags.append("frost_risk");        risk_score = max(risk_score, 0.70)
        if   rain  > 40: flags.append("heavy_rain");        risk_score = max(risk_score, 0.65)
        elif rain  > 25: flags.append("significant_rain");  risk_score = max(risk_score, 0.45)
        if   max_t > 35: flags.append("extreme_heat");      risk_score = max(risk_score, 0.55)
        if   snow  > 5:  flags.append("snowfall");          risk_score = max(risk_score, 0.60)

    unique_flags = list(set(flags))

    if   "heavy_rain"     in unique_flags or "significant_rain" in unique_flags: condition_type = "wet"
    elif "extreme_heat"   in unique_flags:                                        condition_type = "warm"
    elif "frost_risk"     in unique_flags or "hard_frost"       in unique_flags:  condition_type = "cool"
    else:                                                                          condition_type = "normal"

    return {
        "flags":          unique_flags,
        "risk_score":     round(risk_score, 3),
        "condition_type": condition_type,
        "min_temp":       min_temp_seen if min_temp_seen < 999 else None,
        "max_rain_mm":    max_rain_seen,
    }


def assess_disease_risk(crop_id, harvest_month, condition_type):
    all_diseases = RISK_DATA["crop_disease_risks"]
    diseases     = all_diseases.get(crop_id, all_diseases["default"])
    active       = []
    max_risk     = 0.0

    for disease in diseases:
        month_match = harvest_month in disease["risk_months"]
        cond_match  = disease["condition"] == "any" or disease["condition"] == condition_type
        if month_match and cond_match:
            sev = disease["severity"]
            active.append({
                "name":           disease["name"],
                "severity":       sev,
                "severity_label": "High" if sev >= 0.65 else "Medium" if sev >= 0.40 else "Low",
            })
            if sev > max_risk:
                max_risk = sev

    return {
        "active_diseases": active,
        "disease_count":   len(active),
        "risk_score":      round(max_risk, 3),
        "has_high_risk":   any(d["severity"] >= 0.65 for d in active),
    }


def assess_transport_risk(destination_region, harvest_month, distance_km):
    corridors = RISK_DATA["transport_corridor_risks"]
    corridor  = corridors.get(destination_region, corridors["Southwestern Ontario"])

    congestion   = corridor["congestion"]
    base_closure = corridor["weather_closure"]

    if   harvest_month in [11, 12, 1, 2, 3]:
        closure_risk = min(base_closure * 1.8, 1.0)
        season_note  = "Winter season — elevated road closure risk"
    elif harvest_month in [4, 10]:
        closure_risk = base_closure * 1.2
        season_note  = "Shoulder season — moderate weather risk"
    else:
        closure_risk = base_closure
        season_note  = "Summer/fall — normal road conditions"

    distance_factor        = min(distance_km / 800, 1.0)
    overall_transport_risk = round(
        congestion * 0.40 + closure_risk * 0.40 + distance_factor * 0.20, 3
    )

    return {
        "congestion_risk": round(congestion, 3),
        "closure_risk":    round(closure_risk, 3),
        "overall_risk":    overall_transport_risk,
        "risk_label":      "High" if overall_transport_risk >= 0.60 else "Medium" if overall_transport_risk >= 0.35 else "Low",
        "corridor_note":   corridor["note"],
        "season_note":     season_note,
    }


def calculate_environmental_risk(farm_lat, farm_lng, crop_id, harvest_month,
                                  destination_region, distance_km):
    weather_raw   = fetch_weather(farm_lat, farm_lng)
    weather_flags = parse_weather_flags(weather_raw["forecasts"], harvest_month)
    disease       = assess_disease_risk(crop_id, harvest_month, weather_flags["condition_type"])
    transport     = assess_transport_risk(destination_region, harvest_month, distance_km)

    composite     = (
        weather_flags["risk_score"] * 0.35 +
        disease["risk_score"]       * 0.35 +
        transport["overall_risk"]   * 0.30
    )
    composite_pct = round(composite * 100, 1)

    if   composite_pct <= 33: colour = "green"; label = "Low Environmental Risk"
    elif composite_pct <= 60: colour = "amber"; label = "Medium Environmental Risk"
    else:                     colour = "red";   label = "High Environmental Risk"

    alerts   = []
    flag_map = {
        "hard_frost":       "Hard frost forecast — harvest may be damaged",
        "frost_risk":       "Frost risk in 7-day window",
        "heavy_rain":       "Heavy rain forecast — field access and quality risk",
        "significant_rain": "Significant rain — monitor field conditions",
        "extreme_heat":     "Extreme heat — accelerated crop maturity risk",
        "snowfall":         "Snowfall forecast — transport delays likely",
    }
    for flag in weather_flags["flags"]:
        if flag in flag_map:
            alerts.append(flag_map[flag])
    for d in disease["active_diseases"]:
        alerts.append(f"{d['name']} risk active — {d['severity_label']} severity")
    if transport["risk_label"] == "High":
        alerts.append(transport["corridor_note"])

    return {
        "score":           composite_pct,
        "colour":          colour,
        "label":           label,
        "alerts":          alerts,
        "alert_count":     len(alerts),
        "weather_score":   round(weather_flags["risk_score"] * 100, 1),
        "disease_score":   round(disease["risk_score"] * 100, 1),
        "transport_score": round(transport["overall_risk"] * 100, 1),
        "weather": {
            "available":      weather_raw["available"],
            "source":         weather_raw["source"],
            "flags":          weather_flags["flags"],
            "condition_type": weather_flags["condition_type"],
            "min_temp":       weather_flags["min_temp"],
            "max_rain_mm":    weather_flags["max_rain_mm"],
        },
        "disease":   disease,
        "transport": transport,
    }