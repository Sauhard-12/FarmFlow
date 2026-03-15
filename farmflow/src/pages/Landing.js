import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const bgRef = useRef(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let frame;
    let t = 0;
    const animate = () => {
      t += 0.003;
      el.style.backgroundPosition = `${50 + Math.sin(t) * 5}% ${50 + Math.cos(t * 0.7) * 5}%`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleStart = () => {
    document.body.classList.add('zoom-transition');
    setTimeout(() => {
      navigate('/input');
      document.body.classList.remove('zoom-transition');
    }, 600);
  };

  return (
    <div className="landing" ref={bgRef}>
      <div className="landing-noise" />
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />

      <div className="landing-content">
        <div className="landing-badge">Ontario Agricultural Intelligence</div>
        <h1 className="landing-title">
          <span className="title-farm">Farm</span>
          <span className="title-flow">Flow</span>
        </h1>
        <p className="landing-sub">
          AI-powered crop routing, market intelligence & risk analysis<br />
          built exclusively for Ontario farmers.
        </p>
        <button className="btn-primary landing-cta" onClick={handleStart}>
          Get Started
        </button>
        <div className="landing-stats">
          <div className="stat-item"><span className="stat-num">39</span><span className="stat-label">Crops</span></div>
          <div className="stat-divider" />
          <div className="stat-item"><span className="stat-num">49</span><span className="stat-label">Cities</span></div>
          <div className="stat-divider" />
          <div className="stat-item"><span className="stat-num">AI</span><span className="stat-label">Powered</span></div>
        </div>
      </div>

      <div className="landing-scroll-hint">scroll to explore</div>
    </div>
  );
}
