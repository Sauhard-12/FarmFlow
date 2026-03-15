import React, { useEffect, useState } from 'react';
import { useSim } from '../utils/SimContext';
import { getEnvRisk } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import './SubPage.css';

export default function EnvRisk() {
  const { simData, formData } = useSim();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!simData) { navigate('/input'); return; }
    const top = simData.top_options?.[0];
    getEnvRisk({
      farm_lat: formData.farm_lat, farm_lng: formData.farm_lng,
      crop_id: formData.crop_id, harvest_month: formData.harvest_month,
      destination_region: top?.region || 'GTA - Core',
      distance_km: top?.distance_km || 100,
    }).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const scoreColor = (s) => s <= 33 ? '#52b788' : s <= 60 ? '#d4a853' : '#e05252';

  return (
    <div className="subpage">
      <NavBar />
      <div className="subpage-content">
        <div className="subpage-header">
          <h2>Environmental Risk</h2>
          <p>Real-time weather, disease, and transport risk analysis for your farm</p>
        </div>

        {loading ? (
          <div className="subpage-loading"><span className="spinner" /> Fetching live weather data...</div>
        ) : data ? (
          <div className="subpage-grid">
            {/* Score card */}
            <div className="risk-score-card glass-card">
              <div className="risk-score-circle" style={{ '--color': scoreColor(data.score) }}>
                <span className="rsc-num">{data.score}</span>
                <span className="rsc-label">/100</span>
              </div>
              <div className="rsc-name" style={{ color: scoreColor(data.score) }}>{data.label}</div>
            </div>

            {/* Breakdown */}
            <div className="glass-card risk-breakdown">
              <h3>Risk Breakdown</h3>
              {[
                { label: 'Weather Risk', val: data.weather_score },
                { label: 'Disease Risk', val: data.disease_score },
                { label: 'Transport Risk', val: data.transport_score },
              ].map(r => (
                <div key={r.label} className="risk-bar-row">
                  <div className="rb-label">{r.label}</div>
                  <div className="rb-track">
                    <div className="rb-fill" style={{ width: `${r.val}%`, background: scoreColor(r.val) }} />
                  </div>
                  <div className="rb-val">{r.val}</div>
                </div>
              ))}
            </div>

            {/* Weather */}
            <div className="glass-card risk-detail">
              <h3>🌤 Weather Forecast</h3>
              <div className="detail-row"><span>Condition Type</span><span>{data.weather?.condition_type}</span></div>
              <div className="detail-row"><span>Min Temp</span><span>{data.weather?.min_temp ?? 'N/A'}°C</span></div>
              <div className="detail-row"><span>Max Rain</span><span>{data.weather?.max_rain_mm ?? 0} mm</span></div>
              <div className="detail-row"><span>Source</span><span style={{ fontSize: '0.78rem', opacity: 0.6 }}>{data.weather?.source}</span></div>
              {data.weather?.flags?.length > 0 && (
                <div className="weather-flags">
                  {data.weather.flags.map(f => <span key={f} className="weather-flag">{f.replace(/_/g,' ')}</span>)}
                </div>
              )}
            </div>

            {/* Disease */}
            <div className="glass-card risk-detail">
              <h3>🌿 Disease Risk</h3>
              {data.disease?.active_diseases?.length === 0 && (
                <div className="no-risk">No active disease risks for this period ✓</div>
              )}
              {data.disease?.active_diseases?.map((d, i) => (
                <div key={i} className="disease-item">
                  <span className="disease-name">{d.name}</span>
                  <span className="disease-sev" style={{ color: d.severity >= 0.65 ? '#e05252' : d.severity >= 0.4 ? '#d4a853' : '#52b788' }}>
                    {d.severity_label}
                  </span>
                </div>
              ))}
            </div>

            {/* Transport */}
            <div className="glass-card risk-detail">
              <h3>🚛 Transport Risk</h3>
              <div className="detail-row"><span>Risk Level</span>
                <span style={{ color: scoreColor(data.transport_score) }}>{data.transport?.risk_label}</span>
              </div>
              <div className="detail-row"><span>Congestion</span><span>{(data.transport?.congestion_risk * 100).toFixed(0)}%</span></div>
              <div className="detail-row"><span>Closure Risk</span><span>{(data.transport?.closure_risk * 100).toFixed(0)}%</span></div>
              <p className="transport-note">{data.transport?.corridor_note}</p>
              <p className="transport-note">{data.transport?.season_note}</p>
            </div>

            {/* Alerts */}
            {data.alerts?.length > 0 && (
              <div className="glass-card risk-alerts">
                <h3>⚠️ Active Alerts</h3>
                {data.alerts.map((a, i) => (
                  <div key={i} className="alert-item">{a}</div>
                ))}
              </div>
            )}
          </div>
        ) : <div className="subpage-error">Failed to load environmental data</div>}
      </div>
      <ChatBot />
    </div>
  );
}
