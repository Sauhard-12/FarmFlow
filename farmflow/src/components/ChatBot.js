import React, { useState, useRef, useEffect } from 'react';
import { askAdvisor } from '../utils/api';
import { useSim } from '../utils/SimContext';
import './ChatBot.css';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm CropIQ, your Ontario agricultural advisor. Ask me anything about your farm." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { simData, formData } = useSim();
  const bottomRef = useRef(null);

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
        best_option: simData?.top_options?.[0]?.city_name,
        true_net_profit: simData?.true_profit?.true_net_profit,
      };
      const res = await askAdvisor({ message: msg, context });
      setMessages(m => [...m, { role: 'ai', text: res.data.response }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Unable to connect to advisor right now.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="chatbot-wrap">
      {open && (
        <div className="chatbot-panel glass-card">
          <div className="chatbot-header">
            <div className="chatbot-avatar">🌾</div>
            <div>
              <div className="chatbot-name">CropIQ</div>
              <div className="chatbot-status">Ontario AI Advisor</div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="chat-msg ai">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about your crops..."
            />
            <button onClick={send} disabled={loading}>→</button>
          </div>
        </div>
      )}
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '🌾'}
        {!open && <span className="fab-label">CropIQ</span>}
      </button>
    </div>
  );
}
