import sqlite3
import os

DB_PATH = 'database/breathx.db'

def audit_data():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get all cities
    cities = [row['city_name'] for row in cur.execute("SELECT city_name FROM city_info").fetchall()]
    print(f"Auditing {len(cities)} cities for historical accuracy (Mar 15-28)...")
    print("-" * 60)
    print(f"{'City':<20} | {'Status':<15} | {'Source'}")
    print("-" * 60)

    for city in cities:
        # Check records in the target window
        records = cur.execute("""
            SELECT DISTINCT source FROM aqi_records 
            WHERE city_name = ? AND date BETWEEN '2026-03-15' AND '2026-03-28'
        """, (city,)).fetchall()

        sources = [r['source'] for r in records]
        
        if not sources:
            status = "MISSING"
            source_str = "No records found"
        elif 'Central Pollution Control Board' in sources:
            status = "INACCURATE"
            source_str = "Contains Sample Data"
        elif 'OpenAQ v3 Verified' in sources:
            status = "VERIFIED"
            source_str = "OpenAQ v3"
        else:
            status = "MIXED/OTHER"
            source_str = ", ".join(sources)

        print(f"{city:<20} | {status:<15} | {source_str}")

    conn.close()

if __name__ == "__main__":
    audit_data()
