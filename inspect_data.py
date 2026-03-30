import sqlite3
import os

DB_PATH = 'database/breathx.db'

def inspect_bangalore():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("--- Inspecting Bangalore Historical Records (Mar 15-28) ---")
    rows = cur.execute("""
        SELECT date, aqi, source, created_at FROM aqi_records 
        WHERE city_name = 'Bangalore' AND date BETWEEN '2026-03-15' AND '2026-03-28'
        ORDER BY date ASC
    """).fetchall()

    for r in rows:
        print(f"Date: {r['date']} | AQI: {r['aqi']:>6.2f} | Source: {r['source']:<30} | Created: {r['created_at']}")

    print("\n--- Summary ---")
    sources = cur.execute("""
        SELECT source, count(*) as count FROM aqi_records 
        WHERE city_name = 'Bangalore' AND date BETWEEN '2026-03-15' AND '2026-03-28'
        GROUP BY source
    """).fetchall()
    
    for s in sources:
        print(f"{s['source']}: {s['count']} records")

    conn.close()

if __name__ == "__main__":
    inspect_bangalore()
