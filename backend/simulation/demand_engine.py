import math
from config import CITIES


def haversine_km(lat1, lng1, lat2, lng2):
    R     = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a     = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) *
             math.cos(math.radians(lat2)) *
             math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def score_cities(farm_lat, farm_lng, crop, harvest_month):
    results = []
    for city in CITIES:
        dist            = haversine_km(farm_lat, farm_lng, city["lat"], city["lng"])
        base_demand     = 0.6 * city["population_factor"] + 0.4 * city["restaurant_density"]
        season_bonus    = 1.0 if harvest_month in crop["best_months"] else 0.72
        distance_factor = max(0.25, 1.0 - dist / 1200)
        demand_score    = base_demand * season_bonus * distance_factor

        if   demand_score >= 0.35: demand_label = "High"
        elif demand_score >= 0.12: demand_label = "Medium"
        else:                      demand_label = "Low"

        results.append({
            "city_id":            city["id"],
            "city_name":          city["name"],
            "lat":                city["lat"],
            "lng":                city["lng"],
            "region":             city["region"],
            "distance_km":        round(dist, 1),
            "demand_score":       round(demand_score, 4),
            "demand_label":       demand_label,
            "population_factor":  city["population_factor"],   # ← always included
            "restaurant_density": city["restaurant_density"],
            "population_2021":    city.get("population_2021", 0),
        })

    results.sort(key=lambda x: x["demand_score"], reverse=True)
    return results