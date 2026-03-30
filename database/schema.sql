-- BreathX Database Schema
-- SQLite Database for Urban Air Quality Intelligence Platform

PRAGMA foreign_keys = ON;

-- City Information Table
CREATE TABLE IF NOT EXISTS city_info (
    city_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    latitude REAL,
    longitude REAL,
    population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AQI Records Table
CREATE TABLE IF NOT EXISTS aqi_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    date DATE NOT NULL,
    aqi REAL NOT NULL,
    pm25 REAL,
    pm10 REAL,
    no2 REAL,
    so2 REAL,
    co REAL,
    o3 REAL,
    category TEXT,
    pollutant TEXT,
    source TEXT DEFAULT 'Central Pollution Control Board',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_name) REFERENCES city_info(city_name),
    UNIQUE(city_name, date)
);

-- Cached Reports Table for pre-computed analytics
CREATE TABLE IF NOT EXISTS cached_reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_data TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city_name, report_type)
);

-- Alerts Cache Table
CREATE TABLE IF NOT EXISTS alerts_cache (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    aqi_value REAL,
    date DATE,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aqi_city ON aqi_records(city_name);
CREATE INDEX IF NOT EXISTS idx_aqi_date ON aqi_records(date);
CREATE INDEX IF NOT EXISTS idx_aqi_city_date ON aqi_records(city_name, date);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts_cache(is_active, city_name);
