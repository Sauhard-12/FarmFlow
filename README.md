🌾 FarmFlow
AI-Powered Crop Routing, Market Intelligence & Risk Analysis for Ontario Farmers

FarmFlow is a full-stack web platform that helps farmers make smarter decisions about where to sell crops, when to sell them, and whether storing them increases profit.
The system combines market demand mapping, environmental risk analysis, profit forecasting, and AI advisory to provide actionable insights for agricultural decision-making.

🚀 Features

🌍 Market Demand Mapping
Interactive map of Ontario showing:
High demand markets
Medium demand markets
Low demand markets
Farmers can visualize which cities offer the best selling opportunities.

🌦 Environmental Risk Analysis
Evaluates risks affecting crop transportation and sale:
Weather risk
Crop disease risk
Transportation congestion
Provides a risk score and active alerts.

📦 Storage vs Immediate Sell Optimization
Analyzes whether farmers should:
sell immediately
store crops
split sales between storage and immediate selling
Based on price appreciation forecasts and storage risk.

📊 Scenario Analysis
Simulates different market conditions:
Bear market
Base market
Bull market

Each scenario calculates:
price per kg
gross revenue
transportation cost
farm expenses
net profit

🤖 CropIQ – AI Agricultural Advisor
Interactive AI assistant that provides farm-specific advice such as:
Should I sell now or wait?
What market pays the most?
What is my break-even price?
What risks affect my harvest?

🌐 Community Insights
Aggregated analytics from simulations across users:
Most profitable crops
Most popular markets
Average farmer profit
Top performing routes


🏗 Project Architecture
FarmFlow uses a full-stack architecture.
Frontend (React + Vercel)
        ↓
FastAPI Backend (Render)
        ↓
Simulation Engines
   • Profit Engine
   • Expense Engine
   • Storage Engine
   • Environmental Risk Engine
        ↓
External Data APIs
   • Weather data
   • Market demand signals

🧰 Tech Stack
Frontend
React.js
JavaScript
Leaflet (interactive maps)
OpenStreetMap
Chart libraries for visualization

Deployment:
Vercel

Backend
Python
FastAPI
Uvicorn

Deployment:
Render

APIs & Data
Open-Meteo weather API
Market demand modeling
Population factors for demand scoring
