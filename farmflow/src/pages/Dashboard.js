import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, useMap } from 'react-leaflet';
import { useSim } from '../utils/SimContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

function getHeatColor(demandScore, maxScore) {
  const ratio = demandScore / (maxScore || 1);
  if (ratio >= 0.6) return '#52b788';   // green  = high demand
  if (ratio >= 0.25) return '#d4a853';  // yellow = medium demand
  return '#e05252';                     // red    = low demand
}

function getDemandLabel(demandScore, maxScore) {
  const ratio = demandScore / (maxScore || 1);
  if (ratio >= 0.6) return 'High';
  if (ratio >= 0.25) return 'Medium';
  return 'Low';
}

// Population lookup from city_demand (full list with population_factor)
function getPopFactor(cityId, cityDemand) {
  const found = cityDemand?.find(c => c.city_id === cityId);
  return found?.population_factor ?? null;
}

// Radius based on real population_factor (0.004 to 1.0 scale)
function getRadius(populationFactor) {
  const pop = populationFactor || 0.01;
  // Toronto (1.0) → 50km, small towns (0.004) → 8km
  return Math.max(8000, Math.min(50000, pop * 50000));
}

function MapFit({ farmLat, farmLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([farmLat, farmLng], 7, { animate: true });
  }, [map, farmLat, farmLng]);
  return null;
}

export default function Dashboard() {
  const { simData, formData } = useSim();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!simData) { navigate('/input'); return; }
    setTimeout(() => setVisible(true), 100);
  }, [simData, navigate]);

  if (!simData) return null;

  const options    = simData.top_options || [];
  const cityDemand = simData.city_demand || [];
  const farmLat    = formData?.farm_lat || 43.65;
  const farmLng    = formData?.farm_lng || -79.38;

  const allDemandScores = options.map(o => o.demand_score || 0);
  const maxScore        = Math.max(...allDemandScores);

  // Deduplicate cities, merging population_factor from city_demand
  const uniqueCities = [];
  const seen = new Set();
  for (const o of options) {
    if (!seen.has(o.city_id)) {
      seen.add(o.city_id);
      const popFactor = o.population_factor ?? getPopFactor(o.city_id, cityDemand);
      uniqueCities.push({ ...o, population_factor: popFactor });
    }
  }

  const top    = simData.top_options?.[0];
  const profit = simData.true_profit;

  return (
    <div className={`dashboard ${visible ? 'visible' : ''}`}>
      <NavBar />

      {/* Summary strip */}
      <div className="dash-summary glass-card">
        <div className="summary-item">
          <span className="summary-label">Best Market</span>
          <span className="summary-val">{top?.city_name} → {top?.buyer_name}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-label">Net Profit</span>
          <span className="summary-val green">${profit?.true_net_profit?.toLocaleString()} CAD</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-label">Crop</span>
          <span className="summary-val">{simData.crop?.name}</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-label">AI Provider</span>
          <span className="summary-val">{simData.ai_recommendation?.ai_provider || 'Static'}</span>
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer
          center={[farmLat, farmLng]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapFit farmLat={farmLat} farmLng={farmLng} />

          {/* Farm marker */}
          <Circle
            center={[farmLat, farmLng]}
            radius={3000}
            pathOptions={{ color: '#f8f4e8', fillColor: '#f8f4e8', fillOpacity: 0.9, weight: 2 }}
          />

          {/* Route lines + city heat circles */}
          {uniqueCities.map((city) => {
            const color  = getHeatColor(city.demand_score, maxScore);
            const label  = getDemandLabel(city.demand_score, maxScore);
            const radius = 15000;
            const popPct = city.population_factor != null
              ? (city.population_factor * 100).toFixed(1) + '%'
              : 'N/A';

            return (
              <React.Fragment key={city.city_id}>
                <Polyline
                  positions={[[farmLat, farmLng], [city.lat, city.lng]]}
                  pathOptions={{ color, opacity: 0.35, weight: 1.5, dashArray: '6 6' }}
                />
                <Circle
                  center={[city.lat, city.lng]}
                  radius={radius}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.22, weight: 1.5 }}
                  eventHandlers={{
                    click: () => setSelected({
                      ...city,
                      demand_label: label,
                      heat_color: color,
                      pop_pct: popPct,
                    })
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'DM Sans', minWidth: 160 }}>
                      <strong style={{ fontSize: '1rem' }}>{city.city_name}</strong>
                      <div style={{ marginTop: 6, fontSize: '0.85rem', opacity: 0.8 }}>
                        Demand: <span style={{ color }}>{label}</span><br />
                        Distance: {city.distance_km} km<br />
                        Score: {(city.demand_score * 100).toFixed(1)}%<br />
                        Population Factor: {popPct}
                      </div>
                    </div>
                  </Popup>
                </Circle>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="map-legend glass-card">
          <div className="legend-title">Demand Heatmap</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#52b788' }} />High Demand</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#d4a853' }} />Medium Demand</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#e05252' }} />Low Demand</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#f8f4e8' }} />Your Farm</div>
          <div className="legend-divider" />
          <div className="legend-note">Circle size = population</div>
        </div>

        {/* Selected city card */}
        {selected && (
          <div className="city-card glass-card">
            <button className="city-card-close" onClick={() => setSelected(null)}>✕</button>
            <h3>{selected.city_name}</h3>
            <div className="city-region">{selected.region}</div>
            <div className="city-stats">
              <div className="city-stat">
                <span className="cs-label">Distance</span>
                <span className="cs-val">{selected.distance_km} km</span>
              </div>
              <div className="city-stat">
                <span className="cs-label">Demand</span>
                <span className="cs-val" style={{ color: selected.heat_color }}>
                  {selected.demand_label}
                </span>
              </div>
              <div className="city-stat">
                <span className="cs-label">Score</span>
                <span className="cs-val">{(selected.demand_score * 100).toFixed(1)}%</span>
              </div>
              <div className="city-stat">
                <span className="cs-label">Pop. Factor</span>
                <span className="cs-val">{selected.pop_pct}</span>
              </div>
            </div>
            <div className="city-buyers">
              <div className="cb-title">Best Buyer Options</div>
              {options
                .filter(o => o.city_id === selected.city_id)
                .slice(0, 3)
                .map((o, i) => (
                  <div key={i} className="cb-row">
                    <span>{o.buyer_icon} {o.buyer_name}</span>
                    <span className="cb-profit">${o.net_profit?.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <ChatBot />
    </div>
  );
}