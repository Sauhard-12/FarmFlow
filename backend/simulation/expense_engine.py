from config import RISK_DATA


def calculate_expenses(crop_id, quantity_kg, acres, farmer_overrides=None):
    farmer_overrides = farmer_overrides or {}
    defaults         = RISK_DATA["ontario_typical_expenses_per_acre"].get(
        crop_id,
        RISK_DATA["ontario_typical_expenses_per_acre"]["grain_corn"]
    )

    def get(field):
        return farmer_overrides.get(field, defaults.get(field, 0))

    seed            = get("seed")
    fertilizer      = get("fertilizer")
    crop_protection = get("crop_protection")
    fuel            = get("fuel_field_ops")
    labour          = get("labour")
    drying          = get("drying")
    insurance       = get("insurance")
    land_rent       = get("land_cash_rent")

    variable_per_acre = seed + fertilizer + crop_protection + fuel + labour + drying + insurance
    total_per_acre    = variable_per_acre + land_rent

    total_variable = round(variable_per_acre * acres, 2)
    total_land     = round(land_rent * acres, 2)
    total_farm     = round(total_per_acre * acres, 2)
    cost_per_kg    = round(total_farm / quantity_kg, 4) if quantity_kg > 0 else 0

    return {
        "per_acre": {
            "seed":            round(seed, 2),
            "fertilizer":      round(fertilizer, 2),
            "crop_protection": round(crop_protection, 2),
            "fuel":            round(fuel, 2),
            "labour":          round(labour, 2),
            "drying":          round(drying, 2),
            "insurance":       round(insurance, 2),
            "land_cash_rent":  round(land_rent, 2),
            "variable_total":  round(variable_per_acre, 2),
            "grand_total":     round(total_per_acre, 2),
        },
        "total_variable_cost": total_variable,
        "total_land_cost":     total_land,
        "total_farm_cost":     total_farm,
        "cost_per_kg":         cost_per_kg,
        "acres":               acres,
        "using_defaults":      len(farmer_overrides) == 0,
        "data_source":         "OMAFRA Ontario crop budgets 2024-2025",
    }


def calculate_true_profit(gross_revenue, transport_cost, farm_expenses_total):
    revenue_after_transport = round(gross_revenue - transport_cost, 2)
    true_net_profit         = round(revenue_after_transport - farm_expenses_total, 2)
    margin_pct = round((true_net_profit / gross_revenue) * 100, 1) if gross_revenue > 0 else 0
    return {
        "gross_revenue":           gross_revenue,
        "transport_cost":          transport_cost,
        "revenue_after_transport": revenue_after_transport,
        "farm_expenses":           farm_expenses_total,
        "true_net_profit":         true_net_profit,
        "true_margin_pct":         margin_pct,
        "is_profitable":           true_net_profit > 0,
    }


def calculate_breakeven_price(transport_cost, farm_expenses_total, quantity_kg):
    if quantity_kg <= 0:
        return 0
    return round((transport_cost + farm_expenses_total) / quantity_kg, 4)