import React, { useEffect, useState } from 'react';
import { useSim } from '../utils/SimContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './SubPage.css';

export default function StoragePage() {
  const { simData, formData } = useSim();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!simData) { navigate('/input'); return; }

    // Use store_vs_sell data directly from the simulation result
    const svs = simData.store_vs_sell;
    if (svs) {
      setData(svs);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [simData, navigate]);

  const scoreColor = (s) => s <= 30 ? '#52b788' : s <= 60 ? '#d4a853' : '#e05252';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#1a3a2a', border: '1px solid rgba(82,183,136,0.3)',
        borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem'
      }}>
        <div style={{ color: 'rgba(248,244,232,0.6)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.stroke || p.color }}>
            {p.name}: ${Number(p.value)?.toLocaleString()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="subpage">
      <NavBar />
      <div className="subpage-content">
        <div className="subpage-header">
          <h2>Storage vs Immediate Sell</h2>
          <p>Analysis of when to sell your harvest for maximum profit</p>
        </div>

        {loading ? (
          <div className="subpage-loading"><span className="spinner" /> Calculating storage scenarios...</div>
        ) : data ? (
          <div className="storage-grid">

            {/* Recommendation */}
            <div className="glass-card storage-card">
              <h3>📋 Recommendation</h3>
              <div className="rec-badge">
                {data.recommendation?.replace(/_/g, ' ').toUpperCase()}
              </div>
              <p className="rec-text">{data.rec_reason}</p>
              <div style={{ marginTop: 16 }}>
                <div className="detail-row">
                  <span>Optimal Storage</span>
                  <span>{data.optimal_months} month(s)</span>
                </div>
                <div className="detail-row">
                  <span>Store Qty</span>
                  <span>{Number(data.store_qty)?.toLocaleString()} kg</span>
                </div>
                <div className="detail-row">
                  <span>Sell Now Qty</span>
                  <span>{Number(data.sell_qty)?.toLocaleString()} kg</span>
                </div>
                <div className="detail-row">
                  <span>Max Advantage</span>
                  <span style={{ color: data.max_advantage >= 0 ? '#52b788' : '#e05252', fontWeight: 600 }}>
                    {data.max_advantage >= 0 ? '+' : ''}${Number(data.max_advantage)?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Risk */}
            <div className="glass-card storage-card">
              <h3>⚠️ Storage Risk</h3>
              <div className="risk-score-circle" style={{
                '--color': scoreColor(data.risk_score),
                margin: '12px auto', width: 90, height: 90
              }}>
                <span className="rsc-num" style={{ fontSize: '1.6rem' }}>{data.risk_score}</span>
                <span className="rsc-label">/100</span>
              </div>
              <div className="rsc-name" style={{
                color: scoreColor(data.risk_score), textAlign: 'center', marginBottom: 16
              }}>
                {data.risk_label}
              </div>
              <div className="detail-row">
                <span>Price Volatility</span>
                <span>{data.risk_breakdown?.price_volatility}</span>
              </div>
              <div className="detail-row">
                <span>Perishability</span>
                <span>{data.risk_breakdown?.perishability}</span>
              </div>
              <div className="detail-row">
                <span>Environmental</span>
                <span>{data.risk_breakdown?.environmental}</span>
              </div>
            </div>

            {/* Profit Comparison */}
            <div className="glass-card storage-card">
              <h3>💰 Profit Comparison</h3>
              <div className="detail-row">
                <span>Sell All Now</span>
                <span style={{ color: '#52b788', fontWeight: 600 }}>
                  ${Number(data.sell_all_now_profit)?.toLocaleString()}
                </span>
              </div>
              <div className="detail-row">
                <span>Best if Stored</span>
                <span style={{
                  color: data.best_stored_profit > data.sell_all_now_profit ? '#52b788' : '#e05252',
                  fontWeight: 600
                }}>
                  ${Number(data.best_stored_profit)?.toLocaleString()}
                </span>
              </div>
              <div className="detail-row">
                <span>Storage Coverage</span>
                <span>{data.coverage_pct}%</span>
              </div>
              <div className="detail-row">
                <span>Max Storable Months</span>
                <span>{data.storage_months_max}</span>
              </div>
              <div className="detail-row">
                <span>Can Store?</span>
                <span style={{ color: data.can_store ? '#52b788' : '#e05252' }}>
                  {data.can_store ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* AI Storage Advice */}
            {simData?.storage_advice && (
              <div className="glass-card storage-card">
                <h3>🤖 AI Storage Advice</h3>
                <p className="rec-text">{simData.storage_advice}</p>
              </div>
            )}

            {/* Monthly chart */}
            {data.monthly_scenarios?.length > 0 && (
              <div className="glass-card storage-card" style={{ gridColumn: '1 / -1' }}>
                <h3>📈 Monthly Profit Forecast</h3>
                <div style={{ height: 280, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly_scenarios}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="month_label"
                        tick={{ fill: 'rgba(248,244,232,0.5)', fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(248,244,232,0.5)', fontSize: 12 }}
                        tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="net_if_stored"
                        stroke="#52b788"
                        strokeWidth={2.5}
                        dot={{ fill: '#52b788', r: 3 }}
                        name="If Stored"
                      />
                      <Line
                        type="monotone"
                        dataKey="sell_all_now"
                        stroke="#d4a853"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                        name="Sell Now"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(248,244,232,0.55)' }}>
                    <span style={{ width: 24, height: 3, background: '#52b788', display: 'inline-block', borderRadius: 2 }} />
                    If Stored
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(248,244,232,0.55)' }}>
                    <span style={{ width: 24, height: 0, borderTop: '2px dashed #d4a853', display: 'inline-block' }} />
                    Sell Now
                  </div>
                </div>

                {/* Monthly scenario table */}
                <div style={{ marginTop: 20, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        {['Month', 'Future Price', 'Appreciation', 'Net if Stored', 'Advantage', 'Better?'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '6px 10px',
                            color: 'rgba(248,244,232,0.4)', fontWeight: 500,
                            fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly_scenarios.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '7px 10px', color: 'rgba(248,244,232,0.75)' }}>{s.month_label}</td>
                          <td style={{ padding: '7px 10px', color: 'rgba(248,244,232,0.75)' }}>${s.future_price?.toFixed(3)}/kg</td>
                          <td style={{ padding: '7px 10px', color: s.appreciation_pct >= 0 ? '#52b788' : '#e05252' }}>
                            {s.appreciation_pct >= 0 ? '+' : ''}{s.appreciation_pct}%
                          </td>
                          <td style={{ padding: '7px 10px', color: 'rgba(248,244,232,0.75)' }}>${Number(s.net_if_stored)?.toLocaleString()}</td>
                          <td style={{ padding: '7px 10px', color: s.advantage >= 0 ? '#52b788' : '#e05252', fontWeight: 600 }}>
                            {s.advantage >= 0 ? '+' : ''}${Number(s.advantage)?.toLocaleString()}
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            {s.better_to_store
                              ? <span style={{ color: '#52b788' }}>✓ Store</span>
                              : <span style={{ color: '#e05252' }}>✗ Sell</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="subpage-error">
            No storage data available. Please run a simulation first.
          </div>
        )}
      </div>
      <ChatBot />
    </div>
  );
}