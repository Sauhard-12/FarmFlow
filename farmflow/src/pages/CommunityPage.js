import React, { useEffect, useState } from 'react';
import { getCommunityStats } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useSim } from '../utils/SimContext';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import './SubPage.css';

export default function CommunityPage() {
  const { simData } = useSim();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!simData) { navigate('/input'); return; }
    getCommunityStats()
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="subpage">
      <NavBar />
      <div className="subpage-content">
        <div className="subpage-header">
          <h2>Community Insights</h2>
          <p>Aggregated data from Ontario farmers using FarmFlow</p>
        </div>

        {loading ? (
          <div className="subpage-loading"><span className="spinner" /> Loading community data...</div>
        ) : data ? (
          <div className="community-grid">

            <div className="glass-card community-card" style={{ padding: 28 }}>
              <div className="big-number">{data.total_simulations?.toLocaleString() || 0}</div>
              <div className="big-label">Total Simulations Run</div>
            </div>

            <div className="glass-card community-card" style={{ padding: 28 }}>
              <div className="big-number" style={{ color: 'var(--gold)' }}>{data.top_crop?.name || '—'}</div>
              <div className="big-label">Most Profitable Crop</div>
              {data.top_crop?.avg_profit > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--green-glow)' }}>
                  Avg ${data.top_crop.avg_profit?.toLocaleString()} CAD
                </div>
              )}
            </div>

            <div className="glass-card community-card" style={{ padding: 28 }}>
              <div className="big-number" style={{ color: '#52b788' }}>{data.top_city?.name || '—'}</div>
              <div className="big-label">Most Popular Market</div>
              {data.top_city?.count > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(248,244,232,0.5)' }}>
                  {data.top_city.count} routes
                </div>
              )}
            </div>

            <div className="glass-card community-card" style={{ padding: 28 }}>
              <div className="big-number">${data.avg_net_profit?.toLocaleString() || 0}</div>
              <div className="big-label">Average Net Profit (CAD)</div>
            </div>

            {data.top_routes?.length > 0 && (
              <div className="glass-card community-card" style={{ gridColumn: '1 / -1', padding: 28 }}>
                <h3 style={{ color: 'var(--cream)', marginBottom: 18, fontSize: '1rem' }}>🏆 Top 5 Routes</h3>
                <table className="top-routes-table">
                  <thead>
                    <tr>
                      <th>Farm</th>
                      <th>Crop</th>
                      <th>Market</th>
                      <th>Buyer</th>
                      <th style={{ textAlign: 'right' }}>Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_routes.map((r, i) => (
                      <tr key={i}>
                        <td>{r.farm_location}</td>
                        <td>{r.crop_name}</td>
                        <td>{r.top_city}</td>
                        <td>{r.top_buyer}</td>
                        <td style={{ textAlign: 'right', color: 'var(--green-glow)', fontWeight: 600 }}>
                          ${r.net_profit?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.total_simulations === 0 && (
              <div className="glass-card community-card" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
                <div style={{ color: 'rgba(248,244,232,0.5)', fontSize: '0.95rem' }}>
                  Be the first to contribute! Run a simulation and it will appear here.
                </div>
              </div>
            )}
          </div>
        ) : <div className="subpage-error">Failed to load community data</div>}
      </div>
      <ChatBot />
    </div>
  );
}
