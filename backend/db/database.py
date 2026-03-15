import psycopg2
import psycopg2.extras
from config import DATABASE_URL

_conn = None


def get_connection():
    global _conn
    if _conn is not None:
        try:
            # Test the connection is still alive
            _conn.cursor().execute("SELECT 1")
            return _conn
        except Exception:
            _conn = None

    if not DATABASE_URL:
        print("DATABASE_URL not set — running without database")
        return None

    try:
        _conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        _conn.autocommit = True
        print("✅ PostgreSQL (Neon) connected")
        return _conn
    except Exception as e:
        print(f"PostgreSQL connection failed: {e}")
        return None


def init_tables():
    conn = get_connection()
    if conn is None:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                id             SERIAL PRIMARY KEY,
                farm_location  VARCHAR(120),
                crop_id        VARCHAR(80),
                crop_name      VARCHAR(120),
                quantity_kg    DOUBLE PRECISION,
                harvest_month  INT,
                top_city       VARCHAR(120),
                top_buyer      VARCHAR(120),
                net_profit     DOUBLE PRECISION,
                distance_km    DOUBLE PRECISION,
                risk_label     VARCHAR(40),
                ai_provider    VARCHAR(120),
                created_at     TIMESTAMP DEFAULT NOW()
            )
        """)
        print("✅ PostgreSQL simulations table ready")
    except Exception as e:
        print(f"Table init error: {e}")


def log_simulation(farm_location, crop_id, crop_name, quantity_kg, harvest_month,
                   top_city, top_buyer, net_profit, distance_km, risk_label, ai_provider):
    conn = get_connection()
    if conn is None:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO simulations
              (farm_location, crop_id, crop_name, quantity_kg, harvest_month,
               top_city, top_buyer, net_profit, distance_km, risk_label, ai_provider)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (farm_location, crop_id, crop_name, quantity_kg, harvest_month,
              top_city, top_buyer, net_profit, distance_km, risk_label, ai_provider))
    except Exception as e:
        print(f"Log simulation error: {e}")


def get_community_stats():
    conn = get_connection()
    if conn is None:
        return _empty_stats()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT COUNT(*) AS cnt FROM simulations")
        total = cur.fetchone()["cnt"]

        cur.execute("""
            SELECT crop_name, AVG(net_profit) AS avg_profit
            FROM simulations
            GROUP BY crop_name
            ORDER BY avg_profit DESC
            LIMIT 1
        """)
        top_crop_row = cur.fetchone()
        top_crop = {
            "name":       top_crop_row["crop_name"]  if top_crop_row else "—",
            "avg_profit": round(float(top_crop_row["avg_profit"]), 2) if top_crop_row else 0,
        }

        cur.execute("""
            SELECT top_city, COUNT(*) AS cnt
            FROM simulations
            GROUP BY top_city
            ORDER BY cnt DESC
            LIMIT 1
        """)
        top_city_row = cur.fetchone()
        top_city = {
            "name":  top_city_row["top_city"] if top_city_row else "—",
            "count": int(top_city_row["cnt"]) if top_city_row else 0,
        }

        cur.execute("SELECT AVG(net_profit) AS avg FROM simulations")
        avg_row    = cur.fetchone()
        avg_profit = round(float(avg_row["avg"]), 2) if avg_row and avg_row["avg"] else 0

        cur.execute("""
            SELECT farm_location, crop_name, top_city, top_buyer, net_profit
            FROM simulations
            ORDER BY net_profit DESC
            LIMIT 5
        """)
        top_routes = []
        for row in cur.fetchall():
            top_routes.append({
                "farm_location": row["farm_location"],
                "crop_name":     row["crop_name"],
                "top_city":      row["top_city"],
                "top_buyer":     row["top_buyer"],
                "net_profit":    round(float(row["net_profit"]), 2),
            })

        return {
            "total_simulations": total,
            "top_crop":          top_crop,
            "top_city":          top_city,
            "avg_net_profit":    avg_profit,
            "top_routes":        top_routes,
        }
    except Exception as e:
        print(f"Stats query error: {e}")
        return _empty_stats()


def _empty_stats():
    return {
        "total_simulations": 0,
        "top_crop":          {"name": "—", "avg_profit": 0},
        "top_city":          {"name": "—", "count": 0},
        "avg_net_profit":    0,
        "top_routes":        [],
    }