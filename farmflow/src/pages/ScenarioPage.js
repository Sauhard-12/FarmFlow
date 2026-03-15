import React, { useEffect, useState } from 'react';
import { useSim } from '../utils/SimContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import './SubPage.css';

export default function ScenarioPage() {
  const { simData } = useSim();
  const navigate = useNavigate();

  useEffect(() => {
    if (!simData) navigate('/input');
  }, [simData, navigate]);

  if (!simData) return null;

  // Read scenarios directly from simData — no extra API call needed
  const scenarios = simData.scenarios || [];
  const riskSummary = simData.risk_summary;

  const labelColors = {
    'Bear 🐻': '#e05252',
    'Base 📊': '#d4a853',
    'Bull 🚀': '#52b788',
  };

  const getColor = (label) => {
    for (const key of Object.keys(labelColors)) {
      if (label?.includes(key.split(' ')[0])) return labelColors[key];
    }
    return '#52b788';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
      <div style={{
        background: '#1a3a2a', border: '1px solid rgba(82,183,136,0.3)',
        borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem'
      }}>
        <div style={{ color: 'rgba(248,244,232,0.6)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: val >= 0 ? '#52b788' : '#e05252', fontWeight: 600 }}>
          Net Profit: {val >= 0 ? '' : '-'}${Math.abs(val)?.toLocaleString()}
        </div>
      </div>
    );
  };

  const hasNegative = scenarios.some(s => s.net_profit < 0);

  return (
    <div className="subpage">
      <NavBar />
      <div className="subpage-content">
        <div className="subpage-header">
          <h2>Scenario Analysis</h2>
          <p>Bear, Base, and Bull case profit projections for your harvest</p>
        </div>

        {scenarios.length === 0 ? (
          <div className="subpage-loading">No scenario data available. Please run a simulation first.</div>
        ) : (
          <>
            {/* Scenario cards */}
            <div className="scenario-cards">
              {scenarios.map((s, i) => {
                const color = getColor(s.label);
                const isNeg = s.net_profit < 0;
                return (
                  <div key={i} className="scenario-card">
                    <div className="scenario-label">{s.label}</div>
                    <div className="scenario-profit" style={{ color }}>
                      {isNeg ? '-' : ''}${Math.abs(s.net_profit)?.toLocaleString()}
                    </div>
                    <div className="scenario-margin" style={{ color: isNeg ? '#e05252' : 'rgba(248,244,232,0.5)' }}>
                      Margin: {s.margin_pct}%
                      {isNeg && <span style={{ marginLeft: 6, fontSize: '0.75rem' }}>⚠️ Loss</span>}
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div className="detail-row">
                        <span>Price/kg</span>
                        <span>${s.price_per_kg?.toFixed(3)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Gross Revenue</span>
                        <span>${s.gross_revenue?.toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span>Transport</span>
                        <span>-${s.transport_cost?.toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span>Farm Expenses</span>
                        <span>-${s.farm_expenses?.toLocaleString()}</span>
                      </div>
                      <div className="detail-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6, paddingTop: 6 }}>
                        <span style={{ fontWeight: 600 }}>Net Profit</span>
                        <span style={{ color, fontWeight: 700 }}>
                          {isNeg ? '-' : ''}${Math.abs(s.net_profit)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Risk Level</span>
                        <span>{s.risk_label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note about negative values */}
            {hasNegative && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
                color: '#ffaaaa', fontSize: '0.85rem', lineHeight: 1.6
              }}>
                ⚠️ <strong>Bear scenario shows a loss</strong> — this means farm expenses and transport costs
                exceed revenue at a 20% price drop. Consider reducing costs or targeting higher-value markets.
              </div>
            )}

            {/* Bar chart */}
            <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
              <h3 style={{ color: 'var(--cream)', marginBottom: 20, fontSize: '1rem' }}>
                📊 Profit Comparison
              </h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenarios} barSize={52}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'rgba(248,244,232,0.5)', fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(248,244,232,0.5)', fontSize: 12 }}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {hasNegative && (
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                    )}
                    <Bar dataKey="net_profit" name="Net Profit" radius={[6, 6, 0, 0]}>
                      {scenarios.map((s, i) => (
                        <Cell key={i} fill={getColor(s.label)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense breakdown */}
            <div className="glass-card" style={{ padding: 24, marginTop: 20 }}>
              <h3 style={{ color: 'var(--cream)', marginBottom: 16, fontSize: '1rem' }}>💸 Cost Breakdown</h3>
              {simData.expenses && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {Object.entries(simData.expenses.per_acre || {}).map(([k, v]) => (
                    <div key={k} className="detail-row">
                      <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                      <span>${Number(v)?.toLocaleString()}/acre</span>
                    </div>
                  ))}
                  <div className="detail-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ fontWeight: 600 }}>Total Farm Cost</span>
                    <span style={{ color: '#e05252', fontWeight: 700 }}>${simData.expenses.total_farm_cost?.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Cost per kg</span>
                    <span>${simData.expenses.cost_per_kg?.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Risk Summary */}
            {riskSummary && (
              <div className="glass-card" style={{ padding: 24, marginTop: 20 }}>
                <h3 style={{ color: 'var(--cream)', marginBottom: 12, fontSize: '1rem' }}>🤖 AI Risk Analysis</h3>
                <p style={{ color: 'rgba(248,244,232,0.7)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {riskSummary}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <ChatBot />
    </div>
  );
}