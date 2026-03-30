-- BreathX Database Schema (PostgreSQL Version)
-- Optimized for production-ready air quality intelligence platform

-- Extension for potential future spatial analysis (optional)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- City Information Table
CREATE TABLE IF NOT EXISTS city_info (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    population BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AQI Records Table
CREATE TABLE IF NOT EXISTS aqi_records (
    record_id SERIAL PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    aqi DOUBLE PRECISION NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    category VARCHAR(50),
    pollutant VARCHAR(50),
    source VARCHAR(255) DEFAULT 'Central Pollution Control Board',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_city FOREIGN KEY (city_name) REFERENCES city_info(city_name),
    CONSTRAINT uq_city_date UNIQUE(city_name, date)
);

-- Cached Reports Table for pre-computed analytics
CREATE TABLE IF NOT EXISTS cached_reports (
    report_id SERIAL PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    report_data TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_city_report UNIQUE(city_name, report_type)
);

-- Alerts Cache Table
CREATE TABLE IF NOT EXISTS alerts_cache (
    alert_id SERIAL PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    aqi_value DOUBLE PRECISION,
    date DATE,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aqi_city ON aqi_records(city_name);
CREATE INDEX IF NOT EXISTS idx_aqi_date ON aqi_records(date);
CREATE INDEX IF NOT EXISTS idx_aqi_city_date ON aqi_records(city_name, date);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts_cache(is_active, city_name);
