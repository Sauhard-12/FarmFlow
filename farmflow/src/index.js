import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { SimProvider } from './utils/SimContext';
import Landing from './pages/Landing';
import InputForm from './pages/InputForm';
import Dashboard from './pages/Dashboard';
import EnvRisk from './pages/EnvRisk';
import StoragePage from './pages/StoragePage';
import ScenarioPage from './pages/ScenarioPage';
import AdvisorPage from './pages/AdvisorPage';
import CommunityPage from './pages/CommunityPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SimProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/input" element={<InputForm />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/env-risk" element={<EnvRisk />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/scenarios" element={<ScenarioPage />} />
        <Route path="/advisor" element={<AdvisorPage />} />
        <Route path="/community" element={<CommunityPage />} />
      </Routes>
    </BrowserRouter>
  </SimProvider>
);
