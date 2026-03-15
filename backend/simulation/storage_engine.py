import calendar
from config import STORAGE_DATA, RISK_DATA


def calculate_store_vs_sell(crop_id, crop, quantity_kg, storage_capacity_kg,
                             top_option, harvest_month, true_net_profit, env_risk_score):

    appreciation   = STORAGE_DATA["monthly_price_appreciation"].get(crop_id, [0.0] * 6)
    storage_months = crop.get("storage_months", 0)
    cost_per_month = crop.get("storage_cost_per_kg_month", 0.0)
    base_price     = crop["price_per_kg"]
    transport_cost = top_option["transport_cost"]
    price_vol      = crop.get("price_volatility", 0.30)

    storable_qty   = min(quantity_kg, storage_capacity_kg)
    sell_now_qty   = quantity_kg - storable_qty
    sell_now_rev   = round(sell_now_qty * top_option["price_per_kg"], 2)

    monthly_scenarios = []
    best_month_idx    = 0
    best_net          = true_net_profit

    for m in range(min(storage_months, 6)):
        appr_rate    = appreciation[m] if m < len(appreciation) else 0.0
        future_price = round(base_price * (1 + appr_rate), 4) if appr_rate > -0.90 else 0.0
        future_rev   = round(future_price * storable_qty, 2)
        store_cost   = round(cost_per_month * storable_qty * (m + 1), 2)
        net_stored   = round(sell_now_rev + future_rev - store_cost - transport_cost, 2)
        advantage    = round(net_stored - true_net_profit, 2)
        adv_pct      = round((advantage / abs(true_net_profit)) * 100, 1) if true_net_profit != 0 else 0
        month_num    = ((harvest_month - 1 + m + 1) % 12) + 1
        month_label  = calendar.month_abbr[month_num]

        monthly_scenarios.append({
            "month_number":       m + 1,
            "month_label":        month_label,
            "future_price":       future_price,
            "appreciation_pct":   round(appr_rate * 100, 1),
            "future_revenue":     future_rev,
            "storage_cost_total": store_cost,
            "sell_now_revenue":   sell_now_rev,
            "net_if_stored":      net_stored,
            "sell_all_now":       true_net_profit,
            "advantage":          advantage,
            "advantage_pct":      adv_pct,
            "better_to_store":    advantage > 0,
        })

        if net_stored > best_net:
            best_net       = net_stored
            best_month_idx = m

    # Recommendation
    can_store            = storage_months > 0 and storage_capacity_kg > 0
    has_positive_storage = any(s["better_to_store"] for s in monthly_scenarios)

    if not can_store:
        recommendation = "sell_all_now"
        rec_reason     = f"{crop['name']} cannot be stored — sell entire yield at harvest."
        store_qty = 0; sell_qty = quantity_kg; optimal_months = 0

    elif storable_qty <= 0:
        recommendation = "sell_all_now"
        rec_reason     = "No on-farm storage available — sell entire yield at harvest."
        store_qty = 0; sell_qty = quantity_kg; optimal_months = 0

    elif has_positive_storage:
        optimal_months = best_month_idx + 1
        store_qty      = round(storable_qty, 0)
        sell_qty       = round(quantity_kg - storable_qty, 0)
        store_pct      = round((store_qty / quantity_kg) * 100, 0)
        sell_pct       = 100 - store_pct
        advantage_amt  = round(best_net - true_net_profit, 0)

        if sell_qty > 0:
            recommendation = "split"
            rec_reason = (
                f"Store {store_pct:.0f}% ({store_qty:,.0f} kg) for {optimal_months} month(s) "
                f"and sell {sell_pct:.0f}% ({sell_qty:,.0f} kg) immediately. "
                f"Estimated advantage: +${advantage_amt:,.0f} CAD vs selling all now."
            )
        else:
            recommendation = "store_all"
            rec_reason = (
                f"Store entire yield for {optimal_months} month(s). "
                f"Estimated advantage: +${advantage_amt:,.0f} CAD vs selling now."
            )
    else:
        recommendation = "sell_all_now"
        rec_reason     = "Price appreciation does not offset storage costs — sell at harvest."
        store_qty = 0; sell_qty = quantity_kg; optimal_months = 0

    # Risk gauge (0-100)
    perishability      = 1.0 - min(storage_months / 12, 1.0)
    storage_risk_score = price_vol * 0.40 + perishability * 0.35 + (env_risk_score / 100) * 0.25
    storage_risk_pct   = round(storage_risk_score * 100, 1)

    if   storage_risk_pct <= 30: risk_colour = "green"; risk_label = "Low Storage Risk"
    elif storage_risk_pct <= 60: risk_colour = "amber"; risk_label = "Medium Storage Risk"
    else:                        risk_colour = "red";   risk_label = "High Storage Risk"

    coverage_pct = round((storage_capacity_kg / quantity_kg * 100), 1) if quantity_kg > 0 else 0

    return {
        "recommendation":      recommendation,
        "rec_reason":          rec_reason,
        "store_qty":           store_qty,
        "sell_qty":            sell_qty,
        "optimal_months":      optimal_months,
        "storage_capacity_kg": storage_capacity_kg,
        "storable_qty":        storable_qty,
        "coverage_pct":        coverage_pct,
        "can_store":           can_store,
        "storage_months_max":  storage_months,
        "sell_all_now_profit": true_net_profit,
        "best_stored_profit":  round(best_net, 2),
        "max_advantage":       round(best_net - true_net_profit, 2),
        "risk_score":    storage_risk_pct,
        "risk_colour":   risk_colour,
        "risk_label":    risk_label,
        "risk_breakdown": {
            "price_volatility": round(price_vol * 0.40 * 100, 1),
            "perishability":    round(perishability * 0.35 * 100, 1),
            "environmental":    round((env_risk_score / 100) * 0.25 * 100, 1),
        },
        "monthly_scenarios": monthly_scenarios,
    }