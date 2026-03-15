import math
import calendar
from config import WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL

_ttm_model = None

if WATSONX_API_KEY and WATSONX_PROJECT_ID:
    try:
        from ibm_watsonx_ai import APIClient, Credentials
        from ibm_watsonx_ai.foundation_models.inference import TSModelInference
        _creds     = Credentials(url=WATSONX_URL, api_key=WATSONX_API_KEY)
        _client    = APIClient(credentials=_creds, project_id=WATSONX_PROJECT_ID)
        _ttm_model = TSModelInference(
            model_id="ibm/granite-ttm-512-96-r2",
            api_client=_client
        )
        print("✅ IBM Granite TTM (Time Series) ready")
    except Exception as e:
        print(f"Granite TTM init failed: {e}")


def _seasonal_simulation(base_price, volatility, best_months, harvest_month):
    prices = []
    for i in range(12):
        month_num  = ((harvest_month - 1 + i) % 12) + 1
        dist       = min(abs(month_num - bm) for bm in best_months) if best_months else 6
        season_fac = math.cos(math.pi * dist / 6) * 0.5 + 0.5
        drift      = 1.0 + (i * 0.003)
        noise      = 1.0 + (volatility * 0.1 * math.sin(i * 1.3))
        price      = round(base_price * (0.85 + 0.30 * season_fac) * drift * noise, 4)
        prices.append({
            "month":      calendar.month_abbr[month_num],
            "price":      price,
            "forecasted": False,
            "source":     "Seasonal Model",
        })
    return prices


def forecast_price_trend(crop_id, base_price, volatility, best_months, harvest_month):
    if _ttm_model:
        try:
            import numpy as np
            history = []
            for i in range(24):
                m    = ((harvest_month - 1 - 24 + i) % 12) + 1
                dist = min(abs(m - bm) for bm in best_months) if best_months else 6
                sf   = math.cos(math.pi * dist / 6) * 0.5 + 0.5
                n    = 1.0 + volatility * 0.08 * math.sin(i * 0.7)
                history.append(base_price * (0.85 + 0.30 * sf) * n)

            ts_input = np.array(history, dtype=float).reshape(1, 24, 1)
            result   = _ttm_model.forecast(data=ts_input, prediction_length=12)
            forecast_values = result[0].flatten().tolist()

            output = []
            for i, val in enumerate(forecast_values):
                month_num = ((harvest_month - 1 + i) % 12) + 1
                output.append({
                    "month":      calendar.month_abbr[month_num],
                    "price":      round(float(val), 4),
                    "forecasted": True,
                    "source":     "IBM Granite TTM",
                })
            return output
        except Exception as e:
            print(f"Granite TTM forecast error: {e}")

    return _seasonal_simulation(base_price, volatility, best_months, harvest_month)