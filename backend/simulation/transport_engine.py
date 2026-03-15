from config import STORAGE_DATA

COST_PER_KM_PER_KG   = STORAGE_DATA["transport_cost_per_km_per_kg"]
BASE_HANDLING_PER_KG = STORAGE_DATA["base_handling_cost_per_kg"]


def calculate_transport_cost(distance_km, quantity_kg):
    linehaul = distance_km * COST_PER_KM_PER_KG * quantity_kg
    handling = BASE_HANDLING_PER_KG * quantity_kg
    return round(linehaul + handling, 2)