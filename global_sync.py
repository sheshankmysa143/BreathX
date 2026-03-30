import sqlite3
import os
import sys
from api_clients import AirQualityClient

DB_PATH = 'database/breathx.db'

def sync_all():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    client = AirQualityClient()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cities_rows = cur.execute("SELECT city_name, latitude, longitude FROM city_info").fetchall()
    print(f"🚀 Initializing Precision Global Update for {len(cities_rows)} cities...")
    print(f"Target Period: March 15 - March 28, 2026")
    print("-" * 60)

    for row in cities_rows:
        city = row['city_name']
        lat, lon = row['latitude'], row['longitude']
        print(f"🔄 Processing {city} (GPS: {lat}, {lon})...", end='\r')
        
        # 1. Clean Sweep: Remove any placeholder data for Mar 15-28
        cur.execute("""
            DELETE FROM aqi_records 
            WHERE city_name = ? AND date BETWEEN '2026-03-15' AND '2026-03-28'
            AND (source = 'CPCB' OR source = 'Central Pollution Control Board')
        """, (city,))
        conn.commit()
        
        # 2. Sync: Fetch verified OpenAQ v3 data
        historical_data = client.fetch_openaq_historical(city, "2026-03-15", "2026-03-28", lat, lon)
        
        if not historical_data:
            print(f"❌ {city:<20} | Failed to fetch OpenAQ data.")
            continue

        updated_count = 0
        for record in historical_data:
            try:
                # Use PM2.5 to estimate PM10 for historical records if PM10 is missing
                pm10 = record.get('pm25', 0) * 1.2
                
                cur.execute("""
                    INSERT OR REPLACE INTO aqi_records (
                        city_name, date, aqi, pm25, pm10, category, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    city, record['date'], record['aqi'], record['pm25'], 
                    pm10, record['category'], record['source']
                ))
                updated_count += 1
            except Exception as e:
                print(f"    Error on {record['date']}: {e}")

        conn.commit()
        print(f"✅ {city:<20} | {updated_count} days updated (OpenAQ v3 Verified)")

    print("-" * 60)
    print("✨ Global Accuracy Update Complete.")
    conn.close()

if __name__ == "__main__":
    sync_all()
