from config import MARKET_TYPES_BY_ID
from simulation.transport_engine import calculate_transport_cost
from simulation.risk_engine      import calculate_risk


def calculate_options(city_demand, crop, quantity_kg):
    options    = []
    top_cities = city_demand[:8]

    for city in top_cities:
        for buyer_id in crop["preferred_buyers"]:
            buyer = MARKET_TYPES_BY_ID.get(buyer_id)
            if not buyer:
                continue

            actual_qty      = min(quantity_kg, buyer["max_volume_kg"])
            effective_price = crop["price_per_kg"] * buyer["price_multiplier"]
            gross_revenue   = round(effective_price * actual_qty, 2)
            transport_cost  = calculate_transport_cost(city["distance_km"], actual_qty)
            net_profit      = round(gross_revenue - transport_cost, 2)
            margin_pct      = round((net_profit / gross_revenue) * 100, 1) if gross_revenue > 0 else 0.0
            risk_score, risk_label = calculate_risk(crop, city["distance_km"])

            options.append({
                "city_id":            city["city_id"],
                "city_name":          city["city_name"],
                "lat":                city["lat"],
                "lng":                city["lng"],
                "region":             city["region"],
                "distance_km":        city["distance_km"],
                "demand_score":       city["demand_score"],
                "demand_label":       city["demand_label"],
                "population_factor":  city["population_factor"],   # ← passed through
                "restaurant_density": city["restaurant_density"],
                "population_2021":    city.get("population_2021", 0),
                "buyer_id":           buyer_id,
                "buyer_name":         buyer["name"],
                "buyer_icon":         buyer["icon"],
                "buyer_description":  buyer["description"],
                "price_per_kg":       round(effective_price, 4),
                "quantity_kg":        actual_qty,
                "gross_revenue":      gross_revenue,
                "transport_cost":     transport_cost,
                "net_profit":         net_profit,
                "margin_pct":         margin_pct,
                "risk_score":         risk_score,
                "risk_label":         risk_label,
            })

    options.sort(key=lambda x: x["net_profit"], reverse=True)
    return options[:15]