def calculate_risk(crop, distance_km):
    supply_component     = crop["supply_index"]     * 0.40
    volatility_component = crop["price_volatility"] * 0.35
    distance_component   = min(distance_km / 1200, 1.0) * 0.25
    risk_score           = supply_component + volatility_component + distance_component

    if   risk_score < 0.35: risk_label = "Low Risk"
    elif risk_score < 0.65: risk_label = "Medium Risk"
    else:                   risk_label = "High Risk"

    return round(risk_score, 4), risk_label