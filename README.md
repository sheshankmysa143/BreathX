# BreathX - Urban Air Intelligence Platform

A full-stack public web application for monitoring and analyzing urban air quality across major Indian cities.

## Architecture

BreathX/
├── app.py             # Flask application (Entry point)
├── static/            # Static assets (CSS, JS, Images)
├── templates/         # HTML templates
├── haskell-service/   # Haskell AQI Analysis Microservice
├── database/          # SQLite schema and sample data
└── docs/              # API Documentation

## Features

- **City-wise AQI Dashboard**: Real-time air quality data for 10 major Indian cities
- **AQI Classification**: Categorization into 6 health-based levels
- **Historical Trend Analysis**: 30-day trend visualization
- **City Comparison**: Side-by-side AQI comparison
- **Severe Air Alerts**: Automated alerts for unhealthy air quality
- **Health Recommendations**: Context-aware health advisories
- **Report Generation**: Comprehensive city air quality reports

## Prerequisites

- **Python 3.8+** (for Flask backend)
- **Glasgow Haskell Compiler (GHC) 8.10+** (for Haskell microservice)
- **Cabal or Stack** (for building Haskell)

## Installation

### 1. Flask Backend Setup

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install flask requests

# Initialize database and start server
python app.py
```

The Flask server will start on `http://localhost:5000`

### 2. Haskell Microservice Setup

```bash
# Navigate to haskell-service directory
cd haskell-service

# Using cabal (recommended)
cabal update
cabal install
cabal run BreathX

# Or using stack
stack update
stack build
stack run
```

The Haskell microservice will start on `http://localhost:8080`

## Running the Application

### Start Flask Backend
```bash
python app.py
```

### Start Haskell Microservice (in a separate terminal)
```bash
cd haskell-service
cabal run
```

### Access the Application
Open your browser and navigate to: `http://localhost:5000`

## Flask Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with overview stats |
| `/dashboard` | City dashboard with AQI grid |
| `/city/<city_name>` | Detailed city view |
| `/compare` | City comparison tool |
| `/alerts` | Air quality alerts |
| `/recommendations/<city_name>` | Health recommendations |
| `/reports/<city_name>` | Comprehensive report |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cities` | GET | List all cities with latest AQI |
| `/api/aqi/<city_name>` | GET | Get city AQI with analysis |
| `/api/compare` | GET | Compare two cities |
| `/api/alerts` | GET | Get all active alerts |
| `/api/report/<city_name>` | GET | Generate city report |

## Haskell Microservice Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze-city` | POST | Analyze AQI data for a city |
| `/compare-cities` | POST | Compare two cities |
| `/generate-alerts` | POST | Generate air quality alerts |

## AQI Categories

| Range | Category | Health Impact |
|-------|----------|---------------|
| 0-50 | Good | No health concerns |
| 51-100 | Satisfactory | Minor discomfort for sensitive people |
| 101-200 | Moderate | May cause breathing discomfort to sensitive groups |
| 201-300 | Poor | May cause breathing discomfort to most people |
| 301-400 | Very Poor | Respiratory illness on prolonged exposure |
| 401-500 | Severe | Health emergency - avoid all outdoor activities |

## Monitored Cities

1. Delhi
2. Mumbai
3. Bangalore
4. Chennai
5. Kolkata
6. Hyderabad
7. Pune
8. Jaipur
9. Lucknow
10. Ahmedabad

## Database

The SQLite database (`database/breathx.db`) is automatically initialized on first run with:
- City information
- 30 days of sample AQI data
- Cached reports

To reload sample data, delete the database file and restart the Flask app.

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom design system), Vanilla JavaScript
- **Backend**: Python 3, Flask
- **Database**: SQLite
- **Analytics**: Haskell ( GHC, Warp, Aeson)
- **HTTP Client**: Requests library (Python), Warp/WAI (Haskell)

## Development Notes

- The Flask backend includes a fallback analyzer when the Haskell service is unavailable
- CORS is enabled for local development
- The database auto-initializes with sample data on first run

## Sample API Usage

### Get City AQI
```bash
curl http://localhost:5000/api/aqi/Delhi
```

### Compare Cities
```bash
curl "http://localhost:5000/api/compare?city1=Delhi&city2=Mumbai"
```

### Haskell Service Direct Call
```bash
curl -X POST http://localhost:8080/analyze-city \
  -H "Content-Type: application/json" \
  -d '{"city": "Delhi", "records": [{"date": "2026-03-20", "aqi": 210}]}'
```

## License

MIT License - Public use encouraged for civic technology projects.
