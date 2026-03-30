import os
import requests
import logging
from datetime import datetime, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AirQualityClient:
    def __init__(self):
        self.waqi_token = os.getenv('WAQI_API_KEY')
        self.openaq_key = os.getenv('OPENAQ_API_KEY')
        self.openaq_base = "https://api.openaq.org/v3"
        
    def fetch_waqi_data(self, city_name):
        """Fetch real-time AQI and Forecast from WAQI."""
        if not self.waqi_token or self.waqi_token == "your_waqi_token_here":
            logger.warning(f"WAQI API Key missing. Skipping real-time fetch for {city_name}.")
            return None
            
        url = f"https://api.waqi.info/feed/{city_name}/?token={self.waqi_token}"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'ok':
                    logger.info(f"API Success - Fetched {city_name} data + forecast from WAQI")
                    return self._normalize_waqi(data['data'], city_name)
                else:
                    logger.error(f"API Failed - WAQI error for {city_name}: {data.get('data')}")
            else:
                logger.error(f"API Failed - WAQI status {response.status_code} for {city_name}")
        except Exception as e:
            logger.error(f"API Failed - WAQI connection error for {city_name}: {str(e)}")
        return None

    def fetch_openaq_historical(self, city_name, date_from, date_to, lat=None, lon=None):
        """Fetch historical daily AQI records from OpenAQ v3 with GPS precision."""
        if not self.openaq_key or self.openaq_key == "your_openaq_key_here":
            logger.warning("OpenAQ API Key missing. Skipping historical backfill.")
            return []

        # 1. Find Location ID (using Coordinates if available)
        location_id = self._get_location_id(city_name, lat, lon)
        if not location_id:
            return []

        # 2. Find Sensor ID for PM2.5
        sensor_id = self._get_pm25_sensor_id(location_id)
        if not sensor_id:
            return []

        # 3. Fetch Daily Averages
        url = f"{self.openaq_base}/sensors/{sensor_id}/days"
        params = {
            "date_from": date_from,
            "date_to": date_to,
            "limit": 100
        }
        headers = {"X-API-Key": self.openaq_key}

        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return self._normalize_openaq_historical(data.get('results', []), city_name)
        except Exception as e:
            logger.error(f"OpenAQ Historical fetch failed for {city_name}: {str(e)}")
        
        return []

    def _get_location_id(self, city_name, lat=None, lon=None):
        """Search for OpenAQ v3 location ID using coords, golden mapping, or name search."""
        # NEW: Golden Station ID Mapping for 100% Hub Reliability
        GOLDEN_STATIONS = {
            'Delhi': 13,
            'Mumbai': 18,
            'Bangalore': 23,
            'Kolkata': 20,
            'Hyderabad': 3301, # Sanathnagar
            'Chennai': 3289    # Manali
        }
        
        if city_name in GOLDEN_STATIONS:
            return GOLDEN_STATIONS[city_name]

        url = f"{self.openaq_base}/locations"
        headers = {"X-API-Key": self.openaq_key}

        # Priority 1: Coordinate-based Radius Search (limited to 25km)
        if lat and lon:
            params = {
                "coordinates": f"{lat},{lon}",
                "radius": 25000, 
                "limit": 1
            }
            try:
                res = requests.get(url, headers=headers, params=params, timeout=5).json()
                if res.get('results'):
                    return res['results'][0]['id']
            except: pass

        # Priority 2: Locality name search (using correct country ID for India: 9)
        params = {"countries_id": 9, "locality": city_name, "limit": 1}
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5).json()
            if res.get('results'):
                return res['results'][0]['id']
        except: pass

        # Priority 3: Fuzzy name search (if locality fails)
        params = {"countries_id": 9, "name": city_name, "limit": 1}
        try:
            res = requests.get(url, headers=headers, params=params, timeout=5).json()
            if res.get('results'):
                return res['results'][0]['id']
        except: pass

        return None

    def _get_pm25_sensor_id(self, location_id):
        """Find PM2.5 sensor ID for a location."""
        url = f"{self.openaq_base}/locations/{location_id}/sensors"
        headers = {"X-API-Key": self.openaq_key}
        try:
            res = requests.get(url, headers=headers, timeout=5).json()
            for s in res.get('results', []):
                if s['parameter']['name'] == 'pm25':
                    return s['id']
        except: pass
        return None

    def _normalize_waqi(self, data, city_name):
        """Map WAQI JSON to BreathX format with Forecast support."""
        iaqi = data.get('iaqi', {})
        forecast_pm25 = data.get('forecast', {}).get('daily', {}).get('pm25', [])
        
        forecast_data = []
        today_str = datetime.now().strftime('%Y-%m-%d')
        
        for f in forecast_pm25:
            if f['day'] >= today_str:
                forecast_data.append({'date': f['day'], 'aqi': f['avg']})
        
        # Sort and deduplicate if necessary
        forecast_data = sorted(forecast_data, key=lambda x: x['date'])
        
        logger.info(f"Extracted {len(forecast_data)} forecast days for {city_name}")

        return {
            'city_name': city_name,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'aqi': float(data.get('aqi', 0)),
            'pm25': float(iaqi.get('pm25', {}).get('v', 0)),
            'pm10': float(iaqi.get('pm10', {}).get('v', 0)),
            'no2': float(iaqi.get('no2', {}).get('v', 0)),
            'pollutant': data.get('dominentpol', 'PM2.5').upper(),
            'forecast': forecast_data,
            'source': 'WAQI Real-time'
        }

    def _normalize_openaq_historical(self, results, city_name):
        """Map OpenAQ v3 daily results to BreathX format."""
        historical_records = []
        for r in results:
            historical_records.append({
                'city_name': city_name,
                'date': r['day'],
                'aqi': float(r['value']),
                'pm25': float(r['value']),
                'category': self._calculate_category(r['value']),
                'source': 'OpenAQ v3 Verified'
            })
        return historical_records

    def _calculate_category(self, aqi):
        if aqi <= 50: return "Good"
        if aqi <= 100: return "Satisfactory"
        if aqi <= 200: return "Moderate"
        if aqi <= 300: return "Poor"
        if aqi <= 400: return "Very Poor"
        return "Severe"
