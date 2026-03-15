import os
from ai.prompts import build_intent_classification_prompt, build_advisor_chat_prompt, build_market_pulse_prompt

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

_provider    = "Static fallback (no AI keys configured)"
_groq_client = None

CROPIQ_SYSTEM_PROMPT = """You are CropIQ, an AI agricultural advisor specialized exclusively in Ontario, Canada farming markets.

Your knowledge is grounded in:
- OMAFRA (Ontario Ministry of Agriculture, Food and Rural Affairs) pricing guides
- Grain Farmers of Ontario market benchmarks
- Statistics Canada 2021 agricultural census data
- Ontario Food Terminal wholesale pricing patterns

Responsible AI rules:
1. Never fabricate crop prices, statistics, or government program details
2. If uncertain about a specific figure, say based on typical Ontario averages
3. Only advise on Ontario agriculture and farm economics
4. Always flag high-risk advice with a caution
5. Do not provide legal or financial investment advice

You are concise, practical, and always use CAD currency."""

if GROQ_API_KEY:
    try:
        from groq import Groq
        _groq_client = Groq(api_key=GROQ_API_KEY)
        # Test connection
        _groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        _provider = "Groq — Llama 3.3 70B"
        print("✅ Groq (Llama 3.3 70B) ready")
    except Exception as e:
        print(f"Groq init failed: {e}")
        _groq_client = None

if not _groq_client:
    print("⚠️  No AI provider configured — using static responses")


def get_ai_provider_name():
    return _provider


def _call_groq(prompt, system=CROPIQ_SYSTEM_PROMPT):
    response = _groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=500,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


def classify_intent(user_message):
    if not _groq_client:
        return "general"
    try:
        prompt = build_intent_classification_prompt(user_message)
        intent = _call_groq(
            prompt,
            system="You are a text classifier. Reply with only the category name, nothing else."
        ).lower().strip()
        valid = {"pricing_question", "storage_question", "route_question",
                 "risk_question", "expense_question", "general"}
        return intent if intent in valid else "general"
    except Exception as e:
        print(f"Intent classification error: {e}")
        return "general"


def ask_ai(prompt):
    if _groq_client:
        try:
            return _call_groq(prompt)
        except Exception as e:
            print(f"Groq error: {e}")
    return (
        "Based on Ontario market data: prioritize high-demand urban markets such as Toronto, "
        "Ottawa, and Hamilton. Sell at least 60% of yield immediately after harvest to reduce "
        "storage risk. Monitor OMAFRA pricing guides for seasonal price movements."
    )


def ask_ai_with_intent(user_message, context):
    intent = classify_intent(user_message)

    if intent == "pricing_question" and context.get("crop_name"):
        prompt = build_market_pulse_prompt(
            context["crop_name"],
            context.get("harvest_month", 10),
            context.get("supply_index", 0.5),
        ) + f"\n\nSpecific question: {user_message}"
    else:
        prompt = build_advisor_chat_prompt(user_message, context)

    response_text = ask_ai(prompt)
    return {
        "response":    response_text,
        "intent":      intent,
        "ai_provider": _provider,
    }