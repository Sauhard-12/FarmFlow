import axios from 'axios';

const API = axios.create({ baseURL: 'https://farmflow-1-gcrx.onrender.com/' });

export const getHealth = () => API.get('/');
export const getCrops = () => API.get('/crops');
export const getCities = () => API.get('/cities');

export const runSimulation = (params) => API.post('/simulate', params);
export const getEnvRisk = (params) => API.post('/environmental-risk', params);
export const getScenarios = (params) => API.post('/scenarios', params);
export const getStorageAnalysis = (params) => API.post('/store-vs-sell', params);
export const askAdvisor = (params) => API.post('/advisor/chat', params);
export const getCommunityStats = () => API.get('/community/stats');

export default API;