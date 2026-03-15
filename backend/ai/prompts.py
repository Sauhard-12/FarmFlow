import calendar


def _month_name(m):
    return calendar.month_name[m] if 1 <= m <= 12 else str(m)


def build_route_analysis_prompt(crop_name, quantity_kg, harvest_month, farm_location, top_options):
    month        = _month_name(harvest_month)
    options_text = ""
    for i, o in enumerate(top_options[:3], 1):
        options_text += (
            f"\n  Option {i}: {o['city_name']} -> {o['buyer_name']}"
            f" | Net Profit: ${o['net_profit']:,.0f} CAD"
            f" | Price: ${o['price_per_kg']:.3f}/kg"
            f" | Distance: {o['distance_km']} km"
            f" | Demand: {o['demand_label']}"
            f" | Risk: {o['risk_label']}"
        )
    return f"""You are CropIQ, an AI agricultural advisor specialized exclusively in Ontario, Canada farming markets.
Only provide advice grounded in real Ontario data: OMAFRA pricing guides, Grain Farmers of Ontario benchmarks, Statistics Canada census data.
Never fabricate prices or statistics.

A farmer near {farm_location} is harvesting {quantity_kg:,.0f} kg of {crop_name} in {month}.
Top distribution options:{options_text}

Provide a concise, practical recommendation (3-4 sentences):
1. Which option to prioritize and why
2. Any timing or negotiation tips specific to {month} in Ontario
3. One risk to watch for

Be specific and actionable. Use CAD. No bullet points."""


def build_market_pulse_prompt(crop_name, harvest_month, supply_index):
    month        = _month_name(harvest_month)
    supply_level = (
        "high — lots of competition from other Ontario farms" if supply_index > 0.6
        else "moderate"                                        if supply_index > 0.4
        else "tight — favourable conditions for sellers"
    )
    return f"""You are CropIQ, an Ontario crop market analyst. Never fabricate statistics.

Crop: {crop_name} | Harvest month: {month} | Ontario supply level: {supply_level} (index: {supply_index})

Write 2-3 sentences: current Ontario market conditions for {crop_name} in {month},
whether now is a good time to sell or hold, and one key price driver right now.
Be concise and Ontario-specific."""


def build_advisor_chat_prompt(user_message, context):
    ctx_lines = []
    if context.get("farm_location"):   ctx_lines.append(f"Farm location: {context['farm_location']}")
    if context.get("crop_name"):       ctx_lines.append(f"Crop: {context['crop_name']}")
    if context.get("quantity_kg"):     ctx_lines.append(f"Quantity: {context['quantity_kg']:,} kg")
    if context.get("harvest_month"):   ctx_lines.append(f"Harvest month: {_month_name(context['harvest_month'])}")
    if context.get("best_option"):     ctx_lines.append(f"Best route: {context['best_option']}")
    if context.get("true_net_profit"): ctx_lines.append(f"True net profit: ${context['true_net_profit']:,.0f} CAD")
    if context.get("breakeven_price"): ctx_lines.append(f"Break-even price: ${context['breakeven_price']:.4f}/kg")
    if context.get("env_risk_label"):  ctx_lines.append(f"Environmental risk: {context['env_risk_label']}")
    if context.get("storage_rec"):     ctx_lines.append(f"Storage recommendation: {context['storage_rec']}")

    context_block = "\n".join(ctx_lines) if ctx_lines else "No simulation context provided."
    return f"""You are CropIQ — expert AI advisor for Ontario farmers. Deep knowledge of OMAFRA programs,
Grain Farmers of Ontario pricing, transport logistics, and seasonal Ontario demand patterns.
Never fabricate statistics. Only advise on Ontario agriculture and farm economics.

Farmer context:
{context_block}

Question: {user_message}

Answer in 3-5 sentences. Practical, Ontario-specific, CAD currency."""


def build_risk_summary_prompt(crop_name, top_option, scenarios):
    bear = next((s for s in scenarios if "Bear" in s["label"]), None)
    bull = next((s for s in scenarios if "Bull" in s["label"]), None)
    return f"""You are CropIQ, a responsible AI risk analyst for Ontario farmers. Never fabricate statistics.

Crop: {crop_name} | Route: {top_option['city_name']} -> {top_option['buyer_name']}
Bear net profit: ${bear['net_profit']:,.0f} CAD | Bull net profit: ${bull['net_profit']:,.0f} CAD
Risk level: {top_option['risk_label']} | Distance: {top_option['distance_km']} km

Write one sentence: main risk for this route and crop.
Write one sentence: one concrete Ontario-specific mitigation tip.
No bullet points."""


def build_storage_advice_prompt(crop_name, store_vs_sell, env_risk_label, true_net_profit, breakeven_price):
    rec = store_vs_sell
    return f"""You are CropIQ, an Ontario farm storage advisor. Never fabricate statistics.

Crop: {crop_name}
Storage recommendation: {rec['recommendation']} — {rec['rec_reason']}
Storage risk score: {rec['risk_score']:.0f}/100 ({rec['risk_label']})
Environmental risk: {env_risk_label}
True net profit if selling now: ${true_net_profit:,.0f} CAD
Break-even price: ${breakeven_price:.4f}/kg
Max advantage of storing: ${rec['max_advantage']:,.0f} CAD
Optimal storage duration: {rec['optimal_months']} month(s)

Write 2-3 sentences giving a clear, actionable storage strategy.
Mention the break-even price and whether environmental conditions support or threaten the storage plan.
Use CAD. Ontario-specific."""


def build_expense_summary_prompt(crop_name, expense_result, true_profit_result, acres):
    return f"""You are CropIQ, an Ontario farm economics advisor. Never fabricate statistics.

Crop: {crop_name} | Farm size: {acres} acres
Total farm cost: ${expense_result['total_farm_cost']:,.0f} CAD
Cost per kg: ${expense_result['cost_per_kg']:.4f}/kg
True net profit: ${true_profit_result['true_net_profit']:,.0f} CAD
True margin: {true_profit_result['true_margin_pct']}%
Profitable: {'Yes' if true_profit_result['is_profitable'] else 'No'}
Data source: {expense_result['data_source']}

Write 2-3 sentences interpreting these farm economics for this Ontario farmer.
Is the margin healthy compared to Ontario benchmarks?
One specific improvement tip. Use CAD. Ontario-specific."""


def build_intent_classification_prompt(user_message):
    return f"""Classify this Ontario farmer question into exactly one category.
Categories: pricing_question, storage_question, route_question, risk_question, expense_question, general
Question: {user_message}
Reply with only the category name. Nothing else."""