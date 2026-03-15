import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCrops, runSimulation } from '../utils/api';
import { useSim } from '../utils/SimContext';
import './InputForm.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Realistic defaults per crop: [quantity_kg, acres, storage_capacity_kg, harvest_month]
const CROP_DEFAULTS = {
  soybeans:              [320000,  100, 80000,  10],
  grain_corn:            [1080000, 100, 200000, 10],
  winter_wheat:          [450000,  100, 100000,  8],
  canola:                [220000,  100, 50000,   9],
  barley:                [380000,  100, 80000,   9],
  oats:                  [320000,  100, 70000,   9],
  dry_field_beans:       [240000,  100, 60000,  10],
  hay_alfalfa:           [800000,  100, 150000,  7],
  apples:                [180000,   10, 30000,  10],
  potatoes:              [350000,   10, 80000,  10],
  carrots:               [280000,   10, 60000,  10],
  onions:                [300000,   10, 70000,   9],
  greenhouse_tomatoes:   [85000,     1,     0,   6],
  greenhouse_peppers:    [55000,     1,     0,   6],
  greenhouse_cucumbers:  [70000,     1,     0,   6],
  greenhouse_lettuce:    [25000,     1,     0,   6],
  greenhouse_strawberries:[18000,    1,     0,   6],
  sweet_corn:            [90000,    10,     0,   8],
  field_tomatoes:        [350000,   10,     0,   9],
  field_strawberries:    [80000,     10,    0,   7],
  highbush_blueberries:  [50000,     10,    0,   8],
  raspberries:           [35000,     10,    0,   8],
  garlic:                [50000,     10, 20000,   8],
  ginseng:               [18000,     10, 10000,  10],
  hops:                  [18000,     10,  8000,   9],
  sweet_potato:          [180000,    10, 40000,  10],
  tobacco:               [28000,     10, 10000,   9],
  asparagus:             [22000,     10,     0,   6],
  green_beans:           [60000,     10,     0,   8],
  cabbage:               [320000,    10, 60000,  10],
  broccoli:              [80000,     10,     0,   8],
  pumpkins_squash:       [150000,    10, 20000,  10],
  peaches:               [120000,    10,     0,   9],
  pears:                 [140000,    10, 20000,  10],
  sweet_cherries:        [80000,     10,     0,   7],
  sour_cherries:         [90000,     10,     0,   7],
  plums_prunes:          [100000,    10,     0,   9],
  wine_grapes_vinifera:  [55000,     10,     0,  10],
  wine_grapes_labrusca:  [70000,     10,     0,  10],
};

const DEFAULT_CROP = 'soybeans';

export default function InputForm() {
  const navigate = useNavigate();
  const { setSimData, setFormData } = useSim();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const getDefaults = (cropId) => {
    const d = CROP_DEFAULTS[cropId] || [100000, 20, 20000, 10];
    return { quantity_kg: d[0], acres: d[1], storage_capacity_kg: d[2], harvest_month: d[3] };
  };

  const [form, setForm] = useState({
    farm_lat: 43.6532,
    farm_lng: -79.3832,
    farm_location: '',
    crop_id: DEFAULT_CROP,
    ...getDefaults(DEFAULT_CROP),
  });

  useEffect(() => {
    getCrops().then(r => setCrops(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When crop changes, auto-update quantity/acres/storage to realistic defaults
  const handleCropChange = (cropId) => {
    const d = getDefaults(cropId);
    setForm(f => ({ ...f, crop_id: cropId, ...d }));
  };

  const handleAddressInput = (value) => {
    setAddressInput(value);
    setForm(f => ({ ...f, farm_location: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 3) {
      setSuggestions([]); setShowSuggestions(false); return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(value)}&countrycodes=ca&format=json&addressdetails=1&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 350);
  };

  const handleSelectSuggestion = (s) => {
    setAddressInput(s.display_name);
    setShowSuggestions(false); setSuggestions([]);
    setForm(f => ({
      ...f,
      farm_lat: parseFloat(s.lat),
      farm_lng: parseFloat(s.lon),
      farm_location: s.display_name,
    }));
  };

  const formatMain = (s) => {
    const a = s.address || {};
    return a.road || a.hamlet || a.village || a.town || a.city || s.display_name.split(',')[0];
  };

  const formatSub = (s) => {
    const a = s.address || {};
    return [a.county, a.state, a.country].filter(Boolean).join(', ');
  };

  const handleAnalyze = async () => {
    if (!form.farm_location) {
      setError('Please select a farm location from the suggestions.');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await runSimulation(form);
      setSimData(res.data);
      setFormData(form);
      document.body.style.animation = 'zoomTransition 0.6s ease forwards';
      setTimeout(() => { navigate('/dashboard'); document.body.style.animation = ''; }, 500);
    } catch {
      setError('Simulation failed. Is your backend running?');
      setLoading(false);
    }
  };

  const categories = [...new Set(crops.map(c => c.category))];

  return (
    <div className="input-page">
      <div className="input-bg-orb" />
      <button className="back-btn" onClick={() => navigate('/')}>← Back</button>

      <div className="input-card glass-card">
        <div className="input-header">
          <h2>Farm Details</h2>
          <p>Enter your farm parameters to generate AI-powered market analysis</p>
        </div>

        <div className="input-grid">

          {/* Address autocomplete */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label>Farm Address</label>
            <div className="address-input-wrap">
              <span className="address-icon">📍</span>
              <input
                type="text"
                value={addressInput}
                onChange={e => handleAddressInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="Search your farm address in Ontario..."
                autoComplete="off"
                className="address-input"
              />
              {searching && <span className="address-spinner" />}
              {addressInput && !searching && (
                <button className="address-clear" onClick={() => {
                  setAddressInput(''); setSuggestions([]);
                  setForm(f => ({ ...f, farm_location: '', farm_lat: 43.6532, farm_lng: -79.3832 }));
                }}>✕</button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item" onMouseDown={() => handleSelectSuggestion(s)}>
                    <span className="suggestion-icon">📍</span>
                    <div className="suggestion-text">
                      <span className="suggestion-main">{formatMain(s)}</span>
                      <span className="suggestion-secondary">{formatSub(s)}</span>
                    </div>
                  </div>
                ))}
                <div className="suggestions-footer">© OpenStreetMap contributors</div>
              </div>
            )}

            {form.farm_location && (
              <div className="address-confirmed">
                ✅ Location selected
                <span className="address-coords">{form.farm_lat.toFixed(4)}, {form.farm_lng.toFixed(4)}</span>
              </div>
            )}
          </div>

          {/* Crop — auto-fills defaults on change */}
          <div className="input-group">
            <label>Crop</label>
            <select value={form.crop_id} onChange={e => handleCropChange(e.target.value)}>
              {categories.map(cat => (
                <optgroup key={cat} label={cat}>
                  {crops.filter(c => c.category === cat).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Quantity (kg)</label>
              <input type="number" value={form.quantity_kg}
                onChange={e => set('quantity_kg', parseInt(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Farm Size (acres)</label>
              <input type="number" value={form.acres}
                onChange={e => set('acres', parseInt(e.target.value))} />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Harvest Month</label>
              <select value={form.harvest_month} onChange={e => set('harvest_month', parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Storage Capacity (kg)</label>
              <input type="number" value={form.storage_capacity_kg}
                onChange={e => set('storage_capacity_kg', parseInt(e.target.value))} />
            </div>
          </div>
        </div>

        {error && <div className="input-error">{error}</div>}

        <button className="btn-primary analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Analyze'}
        </button>
      </div>
    </div>
  );
}