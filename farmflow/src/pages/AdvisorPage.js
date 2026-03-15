import React, { useState, useRef, useEffect } from 'react';
import { useSim } from '../utils/SimContext';
import { askAdvisor } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ChatBot from '../components/ChatBot';
import './SubPage.css';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdvisorPage() {
  const { simData, formData } = useSim();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm CropIQ, your dedicated Ontario agricultural advisor. I have full context of your simulation. Ask me anything — pricing, storage, risk, market timing, or general farm advice." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!simData) navigate('/input');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const context = {
        farm_location: formData?.farm_location,
        crop_name: simData?.crop?.name,
        quantity_kg: formData?.quantity_kg,
        harvest_month: formData?.harvest_month,
        best_option: simData?.top_options?.[0] ? `${simData.top_options[0].city_name} → ${simData.top_options[0].buyer_name}` : null,
        true_net_profit: simData?.true_profit?.true_net_profit,
        breakeven_price: simData?.true_profit?.breakeven_price,
        env_risk_label: 'Medium Environmental Risk',
      };
      const res = await askAdvisor({ message: msg, context });
      setMessages(m => [...m, { role: 'ai', text: res.data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Unable to reach the advisor right now. Please try again.' }]);
    }
    setLoading(false);
  };

  const QUICK = [
    'Should I sell now or wait?',
    'What are the storage risks?',
    'Which market pays the best?',
    'What is the break-even price?',
  ];

  return (
    <div className="subpage">
      <NavBar />
      <div className="subpage-content">
        <div className="subpage-header">
          <h2>AI Agricultural Advisor</h2>
          <p>Powered by Gemini — Ontario-specific farm intelligence</p>
        </div>

        <div className="advisor-layout">
          {/* Context panel */}
          <div className="glass-card advisor-context">
            <h3>📋 Your Farm Context</h3>
            {formData && <>
              <div className="ctx-row"><span>Location</span><span className="ctx-val">{formData.farm_location}</span></div>
              <div className="ctx-row"><span>Crop</span><span className="ctx-val">{simData?.crop?.name}</span></div>
              <div className="ctx-row"><span>Quantity</span><span className="ctx-val">{formData.quantity_kg?.toLocaleString()} kg</span></div>
              <div className="ctx-row"><span>Month</span><span className="ctx-val">{MONTHS[formData.harvest_month]}</span></div>
              <div className="ctx-row"><span>Best Route</span><span className="ctx-val" style={{ fontSize: '0.82rem' }}>{simData?.top_options?.[0]?.city_name}</span></div>
              <div className="ctx-row"><span>Net Profit</span><span className="ctx-val" style={{ color: 'var(--green-glow)' }}>${simData?.true_profit?.true_net_profit?.toLocaleString()}</span></div>
            </>}

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,244,232,0.35)', marginBottom: 10 }}>Quick Questions</div>
              {QUICK.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'rgba(82,183,136,0.06)', border: '1px solid rgba(82,183,136,0.12)',
                    borderRadius: 8, padding: '8px 12px', color: 'rgba(248,244,232,0.65)',
                    fontSize: '0.82rem', cursor: 'pointer', marginBottom: 6,
                    fontFamily: 'DM Sans', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.borderColor = 'rgba(82,183,136,0.35)'}
                  onMouseLeave={e => e.target.style.borderColor = 'rgba(82,183,136,0.12)'}
                >{q}</button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="glass-card advisor-chat">
            <div className="advisor-messages">
              {messages.map((m, i) => (
                <div key={i} className={`adv-msg ${m.role}`}>{m.text}</div>
              ))}
              {loading && (
                <div className="adv-msg ai">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="advisor-input-row">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask your Ontario advisor anything..."
              />
              <button className="advisor-send" onClick={send} disabled={loading}>Send</button>
            </div>
          </div>
        </div>
      </div>
      <ChatBot />
    </div>
  );
}
