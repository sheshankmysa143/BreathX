# BreathX - Urban Air Intelligence Platform

A production-ready, full-stack air quality intelligence platform for monitoring and analyzing urban air quality across major Indian cities.

## Architecture

```text
BreathX/
├── app.py              # Flask Backend (Gunicorn in Production)
├── api_clients.py      # External API Clients (WAQI, OpenAQ)
├── static/             # Premium Design System (CSS, JS, Glassmorphism)
├── templates/          # Responsive HTML5 Templates
├── haskell-service/    # Haskell AQI Engine (High-Performance Analysis)
├── database/           # Database Schemas (PostgreSQL & SQLite Fallback)
├── Dockerfile          # Multi-stage Production Build
└── entrypoint.sh       # Multi-process Service Orchestrator
```

## Features

- **Real-time AQI Dashboard**: Live data for 10 major Indian cities with 1-hour caching.
- **Predictive Foresight**: 72-hour high-fidelity AQI projections using persistence decay algorithms.
- **Haskell Analysis Engine**: Functional logic for trend detection and health impact categorization.
- **Historical Backfill**: Automatic 14-day historical sync for new cities via OpenAQ v3.
- **Premium UI**: Dark-mode neon aesthetic with glassmorphism and motion-fluid charts.
- **Production Grade**: PostgreSQL backend with connection pooling and Gunicorn WSGI server.

## Deployment Choice

### 1. Production (Recommended - Railway + Docker)

The application is optimized for **Railway** using a multi-stage Docker build that bundles both the Python backend and the Haskell engine.

**Steps to Deploy:**
1.  **Create PostgreSQL Service**: Add a PostgreSQL instance in Railway.
2.  **Set Environment Variables**:
    - `DATABASE_URL`: (Injected by Railway)
    - `WAQI_API_KEY`: Your WAQI Token.
    - `OPENAQ_API_KEY`: Your OpenAQ API Key.
    - `RUN_INIT`: `true` (Initializes schema on first run).
3.  **Deploy**: Railway will auto-detect the `Dockerfile` and start the stack.

### 2. Production (Highly Recommended - Render Blueprint)

The project includes a `render.yaml` file for automated "one-click" infrastructure deployment.

**Steps to Deploy:**
1.  **Fork the Repository**: Push this code to your own GitHub/GitLab account.
2.  **New Blueprint**: Go to Render Dashboard -> **New** -> **Blueprint**.
3.  **Connect Repo**: Select your forked repository.
4.  **Configure**: Render will automatically detect the Blueprint.
    - Name your group (e.g., `breathx-production`).
    - Add `WAQI_API_KEY` and `OPENAQ_API_KEY` in the environment variables section.
5.  **Launch**: Click **Apply**. Render will create:
    - A PostgreSQL Database (`breathx-db`).
    - A Web Service (`breathx-platform`) running from the `Dockerfile`.

### 3. Local Development (Docker)

```bash
docker build -t breathx .
docker run -p 5000:5000 -e DATABASE_URL=your_postgres_url breathx
```

### 3. Local Development (Manual)

**Prerequisites:**
- Python 3.11+
- GHC 9.4+ (for Haskell engine)
- PostgreSQL (or local SQLite fallback)

**Setup Backend:**
```bash
pip install -r requirements.txt
python app.py
```

**Setup Haskell Service:**
```bash
cd haskell-service
cabal run BreathX
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cities` | GET | List all cities with latest AQI |
| `/api/aqi/<city>` | GET | Get city AQI, Forecast, and Haskell Analysis |
| `/api/compare` | GET | Cross-city air quality comparison |
| `/api/alerts` | GET | Active high-severity air quality alerts |

## Technology Stack

- **Frontend**: Vanilla JS, CSS3, Chart.js (Glassmorphism & Neon Design)
- **Backend**: Python 3.11, Flask, Gunicorn
- **Analysis**: Haskell 9.4 (AQI Engine)
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **Containerization**: Docker (Multi-stage builds)
- **Orchestration**: entrypoint.sh (Parallel process management)

## Database Schema

The platform uses a relational schema optimized for time-series AQI data:
- `city_info`: Geographical and demographic metadata.
- `aqi_records`: Core AQI and pollutant concentrations (PM2.5, PM10, etc.).
- `cached_reports`: Pre-computed Haskell analysis results.
- `alerts_cache`: Real-time severity-based alerts.

## License

MIT License - Capstone Project Release.
