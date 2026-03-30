# BreathX API Documentation

## Overview

BreathX is a public urban air intelligence platform that provides real-time air quality data and analysis for Indian cities. The platform consists of:

- **Flask Backend**: Main API server serving the web application and API endpoints
- **Haskell Microservice**: Advanced AQI analysis engine
- **SQLite Database**: Persistent storage for AQI records

## Architecture

```
Frontend (HTML/CSS/JS)
       |
       v
Flask Backend (Port 5000)
       |
       | HTTP/JSON
       v
Haskell Microservice (Port 8080)
       |
       v
SQLite Database
```

## Flask API Endpoints

### Page Routes

#### `GET /`
- **Description**: Home page with overview stats
- **Response**: HTML page with overall AQI stats, top polluted cities, and recent alerts

#### `GET /dashboard`
- **Description**: Main dashboard with all cities' current AQI
- **Response**: HTML page with city grid and filter options

#### `GET /city/<city_name>`
- **Description**: Detailed view for a specific city
- **Parameters**: `city_name` - Name of the city
- **Response**: HTML page with historical data, charts, and analysis

#### `GET /compare`
- **Description**: City comparison page
- **Query Parameters**:
  - `city1` (optional): First city to compare
  - `city2` (optional): Second city to compare
- **Response**: HTML page for comparing two cities

#### `GET /alerts`
- **Description**: Air quality alerts page
- **Response**: HTML page with all active severe alerts

#### `GET /recommendations/<city_name>`
- **Description**: Health recommendations for a city
- **Parameters**: `city_name` - Name of the city
- **Response**: HTML page with health advisories

#### `GET /reports/<city_name>`
- **Description**: Comprehensive report for a city
- **Parameters**: `city_name` - Name of the city
- **Response**: HTML page with detailed analysis and charts

### API Routes

#### `GET /api/cities`
- **Description**: Get list of all cities with latest AQI data
- **Response**:
```json
[
  {
    "city": "Delhi",
    "aqi": 285,
    "category": "Poor",
    "date": "2026-03-29",
    "pollutant": "PM2.5",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "population": 32941000
  }
]
```

#### `GET /api/aqi/<city_name>`
- **Description**: Get AQI records and analysis for a city
- **Parameters**:
  - `city_name`: Name of the city
  - `days` (optional): Number of days to fetch (default: 30)
- **Response**:
```json
{
  "city": "Delhi",
  "records": [
    {
      "date": "2026-03-29",
      "aqi": 285,
      "pm25": 162,
      "pm10": 225,
      "category": "Poor",
      "pollutant": "PM2.5"
    }
  ],
  "analysis": {
    "city": "Delhi",
    "average_aqi": 255,
    "max_aqi": 425,
    "min_aqi": 165,
    "trend": "worsening",
    "category_counts": {
      "Good": 2,
      "Moderate": 5,
      "Poor": 15,
      "Very Poor": 8
    },
    "alert": "Unhealthy air quality - Sensitive groups should stay indoors.",
    "recommendation": "Reduce prolonged outdoor exposure..."
  }
}
```

#### `GET /api/compare`
- **Description**: Compare AQI between two cities
- **Query Parameters**:
  - `city1`: First city name
  - `city2`: Second city name
  - `days` (optional): Number of days to compare (default: 30)
- **Response**:
```json
{
  "city1": "Delhi",
  "city2": "Bangalore",
  "analysis1": {
    "city": "Delhi",
    "average_aqi": 255,
    "max_aqi": 425,
    "min_aqi": 165,
    "trend": "worsening",
    "category_counts": {...},
    "alert": "...",
    "recommendation": "..."
  },
  "analysis2": {
    "city": "Bangalore",
    "average_aqi": 78,
    "max_aqi": 98,
    "min_aqi": 58,
    "trend": "stable",
    "category_counts": {...},
    "alert": "Good air quality...",
    "recommendation": "No precautions necessary..."
  },
  "better_city": "Bangalore",
  "recommendation": "Bangalore has better air quality."
}
```

#### `GET /api/alerts`
- **Description**: Get all active severe air quality alerts
- **Response**:
```json
{
  "alerts": [
    {
      "city": "Delhi",
      "alert": "Unhealthy air quality - Sensitive groups should stay indoors.",
      "severity": "high",
      "max_aqi": 425,
      "recommendation": "Reduce prolonged outdoor exposure..."
    }
  ]
}
```

#### `GET /api/report/<city_name>`
- **Description**: Generate comprehensive report for a city
- **Parameters**: `city_name` - Name of the city
- **Response**:
```json
{
  "city": "Delhi",
  "city_info": {
    "country": "India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "population": 32941000
  },
  "report_period": {
    "start": "2026-02-27",
    "end": "2026-03-29",
    "total_records": 30
  },
  "analysis": {...},
  "records": [...]
}
```

## Haskell Microservice Endpoints

The Haskell microservice runs on port 8080 and provides advanced analytics.

### `POST /analyze-city`

Analyzes AQI data for a single city.

**Request**:
```json
{
  "city": "Delhi",
  "records": [
    {"date": "2026-03-20", "aqi": 210, "pm25": 115},
    {"date": "2026-03-21", "aqi": 245, "pm25": 132},
    {"date": "2026-03-22", "aqi": 310, "pm25": 178}
  ]
}
```

**Response**:
```json
{
  "city": "Delhi",
  "average_aqi": 255,
  "max_aqi": 310,
  "min_aqi": 210,
  "trend": "worsening",
  "category_counts": [
    ["Poor", 2],
    ["Very Poor", 1]
  ],
  "alert": "Air quality is unhealthy",
  "recommendation": "Reduce outdoor activity"
}
```

### `POST /compare-cities`

Compares AQI data between two cities.

**Request**:
```json
{
  "city1": "Delhi",
  "city2": "Mumbai",
  "records1": [...],
  "records2": [...]
}
```

**Response**:
```json
{
  "city1": "Delhi",
  "city2": "Mumbai",
  "analysis1": {...},
  "analysis2": {...},
  "better_city": "Mumbai",
  "recommendation": "Mumbai has better air quality."
}
```

### `POST /generate-alerts`

Generates air quality alerts based on AQI data.

**Request**:
```json
{
  "city": "Delhi",
  "records": [
    {"date": "2026-03-20", "aqi": 310},
    {"date": "2026-03-21", "aqi": 345}
  ]
}
```

**Response**:
```json
{
  "city": "Delhi",
  "alert": "Very poor air quality - Health emergency warning issued.",
  "severity": "high",
  "max_aqi": 345,
  "recommendation": "Avoid outdoor activities..."
}
```

## AQI Categories

| AQI Range | Category | Description |
|-----------|----------|-------------|
| 0-50 | Good | Air quality is satisfactory |
| 51-100 | Satisfactory | Acceptable for most people |
| 101-200 | Moderate | Sensitive groups may experience effects |
| 201-300 | Poor | Most people may experience discomfort |
| 301-400 | Very Poor | Health alert - avoid outdoor activities |
| 401-500 | Severe | Health emergency - stay indoors |

## Error Responses

All API endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common error codes:
- `404`: Resource not found (e.g., city not found)
- `400`: Bad request (missing parameters)
- `500`: Internal server error
