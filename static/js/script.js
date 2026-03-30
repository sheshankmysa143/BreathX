/**
 * BreathX Frontend JavaScript
 * Urban Air Intelligence Platform
 */

// =============================================================================
// API Service
// =============================================================================

const API_BASE = '';

const ApiService = {
    async getCities() {
        const response = await fetch(`${API_BASE}/api/cities`);
        if (!response.ok) throw new Error('Failed to fetch cities');
        return response.json();
    },

    async getCityAQI(cityName, days = 30) {
        const response = await fetch(`${API_BASE}/api/aqi/${encodeURIComponent(cityName)}?days=${days}`);
        if (!response.ok) throw new Error(`Failed to fetch AQI for ${cityName}`);
        return response.json();
    },

    async compareCities(city1, city2, days = 30) {
        const response = await fetch(`${API_BASE}/api/compare?city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}&days=${days}`);
        if (!response.ok) throw new Error('Failed to compare cities');
        return response.json();
    },

    async getAlerts() {
        const response = await fetch(`${API_BASE}/api/alerts`);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        return response.json();
    },

    async getReport(cityName) {
        const response = await fetch(`${API_BASE}/api/report/${encodeURIComponent(cityName)}`);
        if (!response.ok) throw new Error(`Failed to fetch report for ${cityName}`);
        return response.json();
    }
};

// =============================================================================
// AQI Utilities
// =============================================================================

const AQIUtils = {
    getCategory(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Satisfactory';
        if (aqi <= 200) return 'Moderate';
        if (aqi <= 300) return 'Poor';
        if (aqi <= 400) return 'Very Poor';
        return 'Severe';
    },

    getCategoryClass(category) {
        return category.toLowerCase().replace(' ', '-');
    },

    getColor(aqi) {
        if (aqi <= 50) return '#10B981';
        if (aqi <= 100) return '#22C55E';
        if (aqi <= 200) return '#F59E0B';
        if (aqi <= 300) return '#F97316';
        if (aqi <= 400) return '#EF4444';
        return '#8B5CF6';
    },

    getDescription(category) {
        const descriptions = {
            'Good': 'Air quality is satisfactory and poses little or no risk.',
            'Satisfactory': 'Air quality is acceptable. However, there may be minor health concern for sensitive people.',
            'Moderate': 'May cause breathing discomfort to sensitive groups. Others are generally not affected.',
            'Poor': 'May cause breathing discomfort to most people on prolonged exposure. Sensitive people may experience more serious effects.',
            'Very Poor': 'May cause respiratory illness on prolonged exposure. Avoid outdoor activities.',
            'Severe': 'Health alert: everyone may experience more serious health effects. Stay indoors.'
        };
        return descriptions[category] || 'Unknown';
    },

    formatAQI(aqi) {
        return Math.round(aqi);
    }
};

// =============================================================================
// Chart Utilities
// =============================================================================

const ChartUtils = {
    // Shared chart instances to allow proper destruction before re-creation
    instances: {},

    destroyChart(id) {
        if (this.instances[id]) {
            this.instances[id].destroy();
            delete this.instances[id];
        }
    },

    drawSimpleChart(canvasId, labels, values) {
        this.destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => l.substring(5)), // MM-DD
                datasets: [{
                    label: 'AQI',
                    data: values,
                    borderColor: '#0EA5E9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: '#0EA5E9'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: false, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });
    },

    createTrendChart(canvasId, records, forecast, cityName) {
        this.destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Combine Historical + Forecast with Deduplication
        const combined = [];
        const seenDates = new Set();

        const histLabels = records.map(r => r.date).reverse();
        const histValues = records.map(r => r.aqi).reverse();
        
        histLabels.forEach((date, i) => {
            if (!seenDates.has(date)) {
                combined.push({ date, aqi: histValues[i], type: 'history' });
                seenDates.add(date);
            }
        });

        const foreLabels = (forecast || []).map(f => f.date);
        const foreValues = (forecast || []).map(f => f.aqi);

        foreLabels.forEach((date, i) => {
            if (!seenDates.has(date)) {
                combined.push({ date, aqi: foreValues[i], type: 'forecast' });
                seenDates.add(date);
            }
        });

        const labels = combined.map(c => c.date);
        const values = combined.map(c => c.aqi);
        const cutOff = combined.filter(c => c.type === 'history').length - 1;

        const colors = values.map(v => AQIUtils.getColor(v));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'AQI Level',
                    data: values,
                    borderColor: '#0EA5E9',
                    borderWidth: 3,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: colors,
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    segment: {
                        borderDash: ctx => ctx.p0DataIndex >= cutOff ? [6, 6] : undefined,
                        borderColor: ctx => ctx.p0DataIndex >= cutOff ? '#38BDF8' : '#0EA5E9'
                    },
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(14, 165, 233, 0)');
                        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.15)');
                        return gradient;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const isForecast = context.dataIndex > cutOff;
                                const type = isForecast ? 'PREDICTED' : 'VERIFIED';
                                return `[${type}] AQI: ${context.parsed.y} (${AQIUtils.getCategory(context.parsed.y)})`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: false,
                        grid: { color: '#F8FAFC' },
                        title: { display: true, text: 'AQI Value', font: { weight: 'bold', size: 11 } }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: {
                            callback: function(val, index) {
                                return UIUtils.formatDate(labels[index]).split(',')[1];
                            }
                        }
                    }
                }
            }
        });
    },

    createComparisonChart(canvasId, data) {
        this.destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const avg1 = data.analysis1.average_aqi || data.analysis1.averageAqi;
        const avg2 = data.analysis2.average_aqi || data.analysis2.averageAqi;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [data.city1, data.city2],
                datasets: [{
                    label: 'Average AQI',
                    data: [avg1, avg2],
                    backgroundColor: [AQIUtils.getColor(avg1), AQIUtils.getColor(avg2)],
                    borderRadius: 8,
                    barThickness: 60
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    createCategoryChart(canvasId, categoryCounts) {
        this.destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const categories = Object.keys(categoryCounts);
        const values = Object.values(categoryCounts);
        const colors = categories.map(cat => AQIUtils.getColor(
            cat === 'Good' ? 25 : cat === 'Satisfactory' ? 75 :
            cat === 'Moderate' ? 150 : cat === 'Poor' ? 250 :
            cat === 'Very Poor' ? 350 : 450
        ));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    hoverOffset: 15,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.label}: ${context.parsed} days`
                        }
                    }
                }
            }
        });
    }
};

// =============================================================================
// UI Utilities
// =============================================================================

const UIUtils = {
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
    },

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="alert-card high" style="margin: 0;"><div class="alert-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg></div><div class="alert-content"><div class="alert-title">Error</div><div class="alert-message">${message}</div></div></div>`;
        }
    },

    createAQIBadge(aqi) {
        const category = AQIUtils.getCategory(aqi);
        const categoryClass = AQIUtils.getCategoryClass(category);
        return `<span class="aqi-badge ${categoryClass}">${category}</span>`;
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
};

// =============================================================================
// Page Controllers
// =============================================================================

async function initDashboard() {
    const citiesContainer = document.getElementById('cities-grid');
    if (!citiesContainer) return;
    try {
        UIUtils.showLoading('cities-grid');
        const cities = await ApiService.getCities();
        if (cities.length === 0) {
            citiesContainer.innerHTML = '<p class="text-center text-muted">No city data available</p>';
            return;
        }
        citiesContainer.innerHTML = cities.map(city => `
            <a href="/city/${encodeURIComponent(city.city)}" class="city-card">
                <div class="city-header">
                    <div>
                        <div class="city-name">${city.city}</div>
                        <div class="city-country">${city.country || 'India'}</div>
                    </div>
                    ${UIUtils.createAQIBadge(city.aqi)}
                </div>
                <div class="aqi-display">
                    <span class="aqi-value" style="color: ${AQIUtils.getColor(city.aqi)}">${AQIUtils.formatAQI(city.aqi)}</span>
                    <span class="pollutant">${city.pollutant || 'PM2.5'}</span>
                </div>
                <div class="city-stats">
                    <div class="mini-stat">
                        <div class="mini-stat-value">${AQIUtils.getCategory(city.aqi)}</div>
                        <div class="mini-stat-label">Status</div>
                    </div>
                    <div class="mini-stat">
                        <div class="mini-stat-value">${city.date || 'Today'}</div>
                        <div class="mini-stat-label">Updated</div>
                    </div>
                    <div class="mini-stat">
                        <div class="mini-stat-value">${city.population ? (city.population / 1000000).toFixed(1) + 'M' : 'N/A'}</div>
                        <div class="mini-stat-label">Population</div>
                    </div>
                </div>
            </a>
        `).join('');
    } catch (error) {
        console.error('Dashboard error:', error);
        UIUtils.showError('cities-grid', 'Failed to load city data.');
    }
}

async function initCityDetails() {
    const cityName = document.getElementById('city-name')?.dataset.city;
    if (!cityName) return;
    const statsContainer = document.getElementById('city-stats');
    const chartContainer = document.getElementById('aqi-chart');
    const recordsContainer = document.getElementById('records-table');
    if (!statsContainer || !chartContainer || !recordsContainer) return;

    try {
        statsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        chartContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        recordsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        const data = await ApiService.getCityAQI(cityName);
        const analysis = data.analysis;
        const records = data.records;

        document.getElementById('city-name').textContent = cityName;

        const trendIcon = analysis.trend === 'improving' ? '↓' : analysis.trend === 'worsening' ? '↑' : '→';
        const trendClass = analysis.trend === 'improving' ? 'positive' : analysis.trend === 'worsening' ? 'negative' : '';

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(14, 165, 233, 0.15); color: #0EA5E9;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                    </div>
                    <div class="stat-value" style="color: ${AQIUtils.getColor(analysis.average_aqi)}">${AQIUtils.formatAQI(analysis.average_aqi)}</div>
                    <div class="stat-label">Average AQI</div>
                    <div class="stat-change ${trendClass}">${trendIcon} ${analysis.trend}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(239, 68, 68, 0.15); color: #EF4444;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </div>
                    <div class="stat-value" style="color: ${AQIUtils.getColor(analysis.max_aqi)}">${AQIUtils.formatAQI(analysis.max_aqi)}</div>
                    <div class="stat-label">Maximum AQI</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    </div>
                    <div class="stat-value" style="color: ${AQIUtils.getColor(analysis.min_aqi)}">${AQIUtils.formatAQI(analysis.min_aqi)}</div>
                    <div class="stat-label">Minimum AQI</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4m0 4h.01"/></svg>
                    </div>
                    <div class="stat-value">${analysis.alert || 'No Alert'}</div>
                    <div class="stat-label">Current Status</div>
                </div>
            </div>`;

        // Clear chart container spinner and re-inject canvas
        chartContainer.innerHTML = '<canvas id="chart-canvas" class="chart-canvas"></canvas>';
        const canvas = document.getElementById('chart-canvas');
        if (canvas) {
            ChartUtils.createTrendChart('chart-canvas', records, data.forecast, cityName);
        }

        recordsContainer.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>Date</th><th>AQI</th><th>Category</th><th>PM2.5</th><th>PM10</th><th>Pollutant</th></tr></thead>
                    <tbody>
                        ${records.slice(0, 15).map(record => `
                            <tr>
                                <td>${UIUtils.formatDate(record.date)}</td>
                                <td><strong style="color: ${AQIUtils.getColor(record.aqi)}">${record.aqi}</strong></td>
                                <td>${UIUtils.createAQIBadge(record.aqi)}</td>
                                <td>${record.pm25 || '-'}</td>
                                <td>${record.pm10 || '-'}</td>
                                <td>${record.pollutant || '-'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (error) {
        console.error('City details error:', error);
        UIUtils.showError('city-stats', 'Failed to load city data.');
    }
}

async function initCompare() {
    const citySelect1 = document.getElementById('city1-select');
    const citySelect2 = document.getElementById('city2-select');
    const compareBtn = document.getElementById('compare-btn');
    const comparisonResult = document.getElementById('comparison-result');
    if (!compareBtn || !comparisonResult) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('city1')) citySelect1.value = urlParams.get('city1');
    if (urlParams.get('city2')) citySelect2.value = urlParams.get('city2');

    if (urlParams.get('city1') && urlParams.get('city2')) await performComparison();

    compareBtn.addEventListener('click', performComparison);

    async function performComparison() {
        const city1 = citySelect1.value;
        const city2 = citySelect2.value;
        if (!city1 || !city2 || city1 === city2) {
            alert('Please select two different cities');
            return;
        }
        UIUtils.showLoading('comparison-result');
        try {
            const data = await ApiService.compareCities(city1, city2);
            const canvas = document.getElementById('comparison-chart');
            if (canvas) {
                canvas.width = 600;
                canvas.height = 300;
                ChartUtils.createComparisonChart('comparison-chart', {
                    city1: data.city1, city2: data.city2,
                    analysis1: data.analysis1, analysis2: data.analysis2
                });
            }
            comparisonResult.innerHTML = `
                <div class="comparison-container">
                    <div class="comparison-card">
                        <div class="comparison-header city1"><h3>${data.city1}</h3><div class="aqi-display">${AQIUtils.formatAQI(data.analysis1.average_aqi)}</div></div>
                        <div class="comparison-stats">
                            <div class="stat-row"><span>Average AQI</span><strong>${AQIUtils.formatAQI(data.analysis1.average_aqi)}</strong></div>
                            <div class="stat-row"><span>Max AQI</span><strong>${AQIUtils.formatAQI(data.analysis1.max_aqi)}</strong></div>
                            <div class="stat-row"><span>Min AQI</span><strong>${AQIUtils.formatAQI(data.analysis1.min_aqi)}</strong></div>
                            <div class="stat-row"><span>Trend</span><strong>${data.analysis1.trend}</strong></div>
                        </div>
                    </div>
                    <div class="comparison-card">
                        <div class="comparison-header city2"><h3>${data.city2}</h3><div class="aqi-display">${AQIUtils.formatAQI(data.analysis2.average_aqi)}</div></div>
                        <div class="comparison-stats">
                            <div class="stat-row"><span>Average AQI</span><strong>${AQIUtils.formatAQI(data.analysis2.average_aqi)}</strong></div>
                            <div class="stat-row"><span>Max AQI</span><strong>${AQIUtils.formatAQI(data.analysis2.max_aqi)}</strong></div>
                            <div class="stat-row"><span>Min AQI</span><strong>${AQIUtils.formatAQI(data.analysis2.min_aqi)}</strong></div>
                            <div class="stat-row"><span>Trend</span><strong>${data.analysis2.trend}</strong></div>
                        </div>
                    </div>
                </div>
                <div class="mt-xl text-center">
                    <div class="alert-card low" style="display: inline-block;">
                        <div class="alert-content"><div class="alert-title">${data.recommendation}</div></div>
                    </div>
                </div>`;
        } catch (error) {
            console.error('Comparison error:', error);
            UIUtils.showError('comparison-result', 'Failed to compare cities.');
        }
    }
}

async function initAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    try {
        UIUtils.showLoading('alerts-container');
        const data = await ApiService.getAlerts();
        const alerts = data.alerts || [];
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `<div class="alert-card low"><div class="alert-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg></div><div class="alert-content"><div class="alert-title">All Clear</div><div class="alert-message">No active air quality alerts at this time.</div></div></div>`;
            return;
        }
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-card ${alert.severity}">
                <div class="alert-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></div>
                <div class="alert-content">
                    <div class="alert-title">${alert.city} - ${alert.severity.toUpperCase()}</div>
                    <div class="alert-message">${alert.alert}</div>
                    <div class="alert-meta"><span>Max AQI: ${AQIUtils.formatAQI(alert.max_aqi)}</span><span>${alert.recommendation}</span></div>
                </div>
            </div>`).join('');
    } catch (error) {
        console.error('Alerts error:', error);
        UIUtils.showError('alerts-container', 'Failed to load alerts.');
    }
}

async function initRecommendations() {
    const cityName = document.getElementById('city-name')?.dataset.city;
    if (!cityName) return;
    const recommendationsContainer = document.getElementById('recommendations');
    if (!recommendationsContainer) return;
    try {
        UIUtils.showLoading('recommendations');
        const data = await ApiService.getCityAQI(cityName);
        const analysis = data.analysis;
        const avgAqi = analysis.average_aqi || analysis.averageAqi || 0;
        const category = AQIUtils.getCategory(avgAqi);
        recommendationsContainer.innerHTML = `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <div class="recommendation-icon" style="background: ${AQIUtils.getColor(avgAqi)}20; color: ${AQIUtils.getColor(avgAqi)};">${category === 'Good' ? '✓' : category === 'Satisfactory' ? '👍' : category === 'Moderate' ? '😐' : category === 'Poor' ? '😷' : category === 'Very Poor' ? '⚠️' : '☠️'}</div>
                    <div class="recommendation-content"><h3>${category} - ${cityName}</h3><p>${AQIUtils.getDescription(category)}</p></div>
                </div>
                <h4 class="mb-md">Health Recommendations</h4>
                <ul class="recommendation-list">
                    ${analysis.recommendation ? analysis.recommendation.split('. ').filter(r => r.trim()).map(rec => `<li>${rec.trim()}${rec.endsWith('.') ? '' : '.'}</li>`).join('') : '<li>No specific recommendations available.</li>'}
                </ul>
            </div>
            <div class="stats-grid mt-xl">
                <div class="stat-card"><div class="stat-label">General Population</div><p class="mt-sm">${avgAqi <= 100 ? 'Air quality is acceptable for most individuals.' : avgAqi <= 200 ? 'May cause discomfort to sensitive groups.' : 'Outdoor activities should be limited.'}</p></div>
                <div class="stat-card"><div class="stat-label">Sensitive Groups</div><p class="mt-sm">${avgAqi <= 50 ? 'No precautions needed.' : avgAqi <= 100 ? 'Consider reducing prolonged outdoor exposure.' : 'Avoid outdoor activities. Use air purifiers indoors.'}</p></div>
                <div class="stat-card"><div class="stat-label">Children</div><p class="mt-sm">${avgAqi <= 100 ? 'Safe for outdoor play with normal precautions.' : 'Limit outdoor activities. Ensure proper ventilation indoors.'}</p></div>
            </div>`;
    } catch (error) {
        console.error('Recommendations error:', error);
        UIUtils.showError('recommendations', 'Failed to load recommendations.');
    }
}

async function initReport() {
    const cityName = document.getElementById('city-name')?.dataset.city;
    if (!cityName) return;
    const reportContainer = document.getElementById('report-content');
    if (!reportContainer) return;

    try {
        UIUtils.showLoading('report-content');
        const data = await ApiService.getReport(cityName);
        const analysis = data.analysis;
        const records = data.records;
        const cityInfo = data.city_info;
        const avgAqi = analysis.average_aqi || analysis.averageAqi || 0;
        const category = AQIUtils.getCategory(avgAqi);

        // Populate unified layout
        reportContainer.innerHTML = `
            <div id="report-header" class="mb-xl">
                <div class="report-title">${cityName} Air Quality Report</div>
                <div class="report-meta">
                    <span>Country: ${cityInfo?.country || 'India'}</span>
                    <span>Period: ${data.report_period?.start || 'N/A'} to ${data.report_period?.end || 'N/A'}</span>
                    <span>Total Records: ${data.report_period?.total_records || 0}</span>
                </div>
            </div>

            <div id="summary-stats" class="mb-xl">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: ${AQIUtils.getColor(avgAqi)}">${AQIUtils.formatAQI(avgAqi)}</div>
                        <div class="stat-label">Average AQI</div>
                        <div class="stat-change ${analysis.trend === 'improving' ? 'positive' : 'negative'}">${analysis.trend}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: ${AQIUtils.getColor(analysis.max_aqi)}">${AQIUtils.formatAQI(analysis.max_aqi)}</div>
                        <div class="stat-label">Peak AQI</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: ${AQIUtils.getColor(analysis.min_aqi)}">${AQIUtils.formatAQI(analysis.min_aqi)}</div>
                        <div class="stat-label">Lowest AQI</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${category}</div>
                        <div class="stat-label">Overall Status</div>
                    </div>
                </div>
            </div>

            <div class="chart-section mb-xl">
                <h3 class="chart-title mb-md">AQI Trend Analysis</h3>
                <div class="chart-container" style="height: 350px;">
                    <canvas id="trend-chart-canvas"></canvas>
                </div>
            </div>

            <div class="report-grid">
                <div class="chart-section">
                    <h3 class="chart-title mb-md">Category Distribution</h3>
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="category-chart-canvas"></canvas>
                    </div>
                </div>
                <div id="key-findings">
                    <div class="alert-card ${avgAqi > 200 ? 'high' : avgAqi > 100 ? 'moderate' : 'low'}">
                        <div class="alert-content">
                            <div class="alert-title">Analysis Summary</div>
                            <div class="alert-message">${analysis.alert || 'Stability maintained.'}</div>
                        </div>
                    </div>
                    <h4 class="mt-lg mb-md">Category Breakdown</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Category</th><th>Days</th></tr></thead>
                            <tbody>
                                ${Object.entries(analysis.category_counts || {}).map(([cat, count]) => `
                                    <tr>
                                        <td>${UIUtils.createAQIBadge(cat === 'Good' ? 25 : cat === 'Satisfactory' ? 75 : cat === 'Moderate' ? 150 : cat === 'Poor' ? 250 : cat === 'Very Poor' ? 350 : 450)}</td>
                                        <td>${count}</td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

        // Initialize Charts
        ChartUtils.createTrendChart('trend-chart-canvas', records, data.forecast, cityName);
        ChartUtils.createCategoryChart('category-chart-canvas', analysis.category_counts || {});

    } catch (error) {
        console.error('Report error:', error);
        UIUtils.showError('report-content', 'Failed to generate analytical report.');
    }
}

async function initHomeMap() {
    const mapContainer = document.getElementById('india-map');
    const mapDataEl = document.getElementById('map-data');
    if (!mapContainer || !mapDataEl) return;

    try {
        const cities = JSON.parse(mapDataEl.textContent);
        
        // Initialize map centered on India
        const map = L.map('india-map', {
            scrollWheelZoom: false,
            attributionControl: false
        }).setView([22.5, 78.9], 5);

        // Add minimalist dark-themed tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        // Define icons based on AQI category
        cities.forEach(city => {
            const color = AQIUtils.getColor(city.aqi);
            const markerHtml = `
                <div class="map-marker-container">
                    <div class="map-marker-pulse" style="background-color: ${color}"></div>
                    <div class="map-marker-dot" style="background-color: ${color}"></div>
                </div>`;

            const icon = L.divIcon({
                html: markerHtml,
                className: 'custom-map-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const popupHtml = `
                <div class="map-popup">
                    <div class="map-popup-header">${city.name}</div>
                    <div class="map-popup-aqi" style="color: ${color}">${AQIUtils.formatAQI(city.aqi)}</div>
                    <div class="map-popup-category">${city.category}</div>
                    <a href="/city/${encodeURIComponent(city.name)}" class="map-popup-link">View Details &rarr;</a>
                </div>`;

            L.marker([city.lat, city.lng], { icon })
                .addTo(map)
                .bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });
        });

    } catch (error) {
        console.error('Map initialization error:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const page = document.body.dataset.page;
    switch (page) {
        case 'home': initHomeMap(); break;
        case 'dashboard': initDashboard(); break;
        case 'city-details': initCityDetails(); break;
        case 'compare': initCompare(); break;
        case 'alerts': initAlerts(); break;
        case 'recommendations': initRecommendations(); break;
        case 'report': initReport(); break;
    }
});

window.BreathX = { ApiService, AQIUtils, ChartUtils, UIUtils };
