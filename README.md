# PharmaChain Intelligence System

A comprehensive blockchain-powered pharmaceutical supply chain monitoring system with real-time IoT simulation, trust scoring, predictive analytics, and tamper-proof verification.

![PharmaChain](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 📦 **Batch Management** | Create and track medicine batches through the supply chain |
| 🌡️ **Temperature Monitoring** | Real-time temperature tracking with simulated IoT sensors |
| 📍 **Location Tracking** | Live shipment tracking with interactive maps |
| 🧠 **Trust Score Engine** | Dynamic scoring based on temperature, delays, and route adherence |
| 🔮 **Predictive Analytics** | AI-powered breach prediction using trend analysis |
| 🚨 **Alert System** | Multi-severity alerts for temperature breaches and anomalies |
| 🔗 **Blockchain Logging** | Tamper-proof hash storage on Ethereum blockchain |
| 🎨 **Minimal UI** | Clean, Apple-style design with light theme |

### Trust Score Calculation

```
Start: 100 points

Events affecting score:
├── Temperature Breach: -30
├── Predicted Breach: -15
├── Delay Event: -20
├── Route Deviation: -25
├── Stability Bonus: +2
└── Recovery Bonus: +5

Status Levels:
├── SAFE:   80-100 (Green)
├── RISKY:  50-79  (Orange)
└── UNSAFE: 0-49   (Red)
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Chart.js** for temperature graphs
- **Leaflet** for live location tracking
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **Ethers.js** for blockchain integration
- **Nominatim API** for location search

### Blockchain
- **Ethereum** (Hardhat local network)
- **Solidity 0.8.19** smart contracts
- **SHA256** hash storage

## 📁 Project Structure

```
pharmachain/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   ├── trustScoreService.js
│   │   ├── simulationService.js
│   │   ├── predictionService.js
│   │   └── blockchainService.js
│   ├── utils/           # Helper functions
│   ├── app.js           # Express app
│   └── server.js        # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   │   ├── MapView.jsx
│   │   │   ├── TemperatureChart.jsx
│   │   │   ├── TrustScoreCard.jsx
│   │   │   ├── AlertPanel.jsx
│   │   │   ├── Timeline.jsx
│   │   │   ├── SimulationControls.jsx
│   │   │   └── LocationAutocomplete.jsx
│   │   ├── pages/       # Application pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BatchDetails.jsx
│   │   │   └── Verify.jsx
│   │   ├── context/     # React context
│   │   ├── services/    # API services
│   │   ├── utils/       # Helper utilities
│   │   └── App.jsx
│   └── package.json
│
├── blockchain/
│   ├── contracts/       # Solidity contracts
│   │   └── LogStorage.sol
│   ├── scripts/         # Deployment scripts
│   └── hardhat.config.js
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **MongoDB** (running locally or Atlas connection)
- **Git**

### Installation

#### 1. Navigate to Project

```bash
cd D:/Projects/Inventory/Blockchain
```

#### 2. Install Dependencies

```bash
# Install all dependencies (backend, frontend, blockchain)
npm run install:all

# Or install individually:
cd backend && npm install
cd ../frontend && npm install
cd ../blockchain && npm install
```

### Running the Application

You need to run 3 services:

#### 1. Start MongoDB

```bash
mongod
```

#### 2. Start Backend Server

```bash
cd backend
npm run dev

# Server runs on http://localhost:5000
```

#### 3. Start Frontend

```bash
cd frontend
npm run dev

# Frontend runs on http://localhost:3000
```

#### 4. (Optional) Start Local Blockchain

```bash
cd blockchain
npm run node

# In another terminal for deployment:
npm run deploy
```

### Quick Start (Windows)

Double-click `start.bat` to launch all services automatically.

## 📖 API Endpoints

### Batch Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch/create` | Create new batch |
| GET | `/api/batch` | Get all batches |
| GET | `/api/batch/:id` | Get batch details |
| GET | `/api/batch/verify/:batchId` | Verify batch (public) |
| DELETE | `/api/batch/:id` | Delete a batch |

### Simulation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate/temperature` | Simulate temperature change |
| POST | `/api/simulate/location` | Move to next stage |
| POST | `/api/simulate/delay` | Simulate delay |
| POST | `/api/simulate/spike` | Temperature spike (critical) |
| GET | `/api/simulate/predict/:batchId` | Get prediction |
| GET | `/api/simulate/trust/:batchId` | Get trust score |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get all alerts |
| GET | `/api/alerts/active` | Get active alerts |
| GET | `/api/alerts/stats` | Get statistics |
| GET | `/api/alerts/batch/:batchId` | Get batch alerts |
| PUT | `/api/alerts/:id/resolve` | Resolve alert |

### Location

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/location/search?query=<text>` | Search locations globally |

## 🎮 Demo Flow

Follow this sequence to demo the system:

### 1. Create a Batch

1. Open http://localhost:3000
2. Click "New Batch"
3. Enter details:
   - Batch ID: `BATCH001`
   - Medicine Name: `Insulin Plus`
   - Origin: Search and select "New York"
   - Destination: Search and select "Los Angeles"
4. Click "Create"

### 2. Monitor the Batch

1. Click on the created batch card
2. View the map showing current location
3. See temperature graph updating every 5 seconds
4. Watch trust score (starts at 100)

### 3. Simulate Events

Use the Simulation Controls:

**Normal Operation:**
- Click "Normal" to generate normal temperature readings

**Temperature Breach:**
- Click "Breach" to simulate temperature outside safe range
- Watch trust score drop by 30 points
- See new alert appear in the feed

**Critical Spike:**
- Click "Temperature Spike (Critical)" for emergency scenario
- Temperature jumps to 45°C+
- Trust score drops significantly
- Critical alert banner appears

**Move Stages:**
- Click "Move Stage" to advance through supply chain
- Stages: Manufacturer → Warehouse → Distributor → Pharmacy

**Simulate Delay:**
- Click "Simulate Delay" to add delay event
- Trust score drops by 20 points

### 4. View Detailed Analytics

1. Click "View Details" for full analytics
2. See temperature chart with historical data
3. View journey timeline
4. Check blockchain hash for verification

### 5. Test Verification Portal

1. Navigate to http://localhost:3000/verify
2. Enter batch ID: `BATCH001`
3. Click "Verify"
4. See complete verification report:
   - Trust status (SAFE/RISKY/UNSAFE)
   - Temperature history
   - Journey timeline
   - Blockchain verification status

## 🔗 Smart Contract

### LogStorage.sol

The smart contract provides:

```solidity
// Store a hash on blockchain
function storeHash(string memory hash) public

// Retrieve all hashes
function getHashes() public view returns (string[] memory)

// Get hash count
function getHashCount() public view returns (uint256)

// Verify hash exists
function hashExists(string memory hash) public view returns (bool)
```

### Contract Addresses

After deploying to local Hardhat network:

```bash
# Default local deployment
Network: http://127.0.0.1:8545
Chain ID: 31337
```

The contract address will be printed after deployment.

## 🎨 UI Design

The application features a clean, minimal Apple-inspired design:

- **Light theme** with white backgrounds and subtle shadows
- **SF Pro-style typography** with system fonts
- **Rounded corners** (18px-24px) for cards and buttons
- **Subtle animations** and hover effects
- **Badge indicators** for status (Safe/Risky/Unsafe)
- **Clean navigation** with blur effects

### Color Palette

| Color | Usage |
|-------|-------|
| `#1d1d1f` | Primary text |
| `#86868b` | Secondary text |
| `#f5f5f7` | Background secondary |
| `#0071e3` | Primary accent (blue) |
| `#34c759` | Success (green) |
| `#ff9500` | Warning (orange) |
| `#ff3b30` | Danger (red) |

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create new batch with location search
- [ ] View batch in list
- [ ] Open batch details
- [ ] Simulate normal temperature
- [ ] Simulate temperature breach
- [ ] Simulate temperature spike
- [ ] Move to next stage
- [ ] Simulate delay
- [ ] Verify trust score updates
- [ ] Check alerts appear
- [ ] Test verification portal
- [ ] Verify blockchain hash stored
- [ ] Delete batch

## 🐛 Troubleshooting

### MongoDB Connection Error

```bash
# Ensure MongoDB is running
mongod --dbpath /data/db

# Or use MongoDB Atlas connection
# Update MONGODB_URI in backend/.env
```

### Port Already in Use

```bash
# Backend (5000)
# Update PORT in backend/.env

# Frontend (3000)
# Update server.port in frontend/vite.config.js
```

### Location Search Not Working

The location search uses Nominatim (OpenStreetMap) API. Ensure you have internet connectivity.

### Blockchain Not Connecting

```bash
# Start Hardhat node
cd blockchain
npm run node

# Ensure contract is deployed
npm run deploy
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PharmaChain System                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Frontend   │───▶│   Backend   │───▶│  Blockchain │      │
│  │  (React)    │◀───│  (Express)  │◀───│  (Ethereum) │      │
│  │             │    │             │    │             │      │
│  │ - Dashboard │    │ - REST API  │    │ - Hash      │      │
│  │ - Details   │    │ - Services  │    │   Storage   │      │
│  │ - Verify    │    │ - MongoDB   │    │             │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                            │                                │
│                            ▼                                │
│                     ┌─────────────┐                         │
│                     │   MongoDB   │                         │
│                     │             │                         │
│                     │ - Batches   │                         │
│                     │ - Logs      │                         │
│                     │ - Alerts    │                         │
│                     └─────────────┘                         │
│                                                             │
│                            │                                │
│                            ▼                                │
│                     ┌─────────────┐                         │
│                  ┌──│   Nominatim │                         │
│                  │  │   (OSM)     │                         │
│                  │  └─────────────┘                         │
│                  │                                          │
│                  └──▶ Location Search                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📝 License

MIT License - feel free to use this project for hackathons, learning, or production purposes.

## 👥 Contributing

This is a hackathon-ready project. Contributions welcome!

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Built with ❤️ for the pharmaceutical supply chain**
