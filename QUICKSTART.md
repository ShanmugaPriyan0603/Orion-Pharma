# Quick Start Guide

## Prerequisites Check

Before running, ensure you have:
- [ ] Node.js v18+ installed
- [ ] MongoDB installed and running
- [ ] All dependencies installed (`npm run install:all`)

## Start the Application

### Option 1: Use the Start Script (Windows)

```bash
start.bat
```

### Option 2: Manual Start

Open 3 separate terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Blockchain (Optional):**
```bash
cd blockchain
npm run node
```

## Access the Application

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:5000/api
- **Verify Portal:** http://localhost:3000/verify

## First Time Setup

### 1. Create Your First Batch

On the Dashboard:
1. Click "+ New Batch"
2. Fill in the form:
   - Batch ID: `BATCH001`
   - Medicine Name: `Insulin Plus`
   - Origin: `New York`
   - Destination: `Charlotte`
3. Click "Create"

### 2. Try Simulations

Select your batch and use the Simulation Controls:
- **Normal** - Generate normal temperature reading
- **Breach** - Simulate temperature breach
- **Temperature Spike** - Critical emergency scenario
- **Move Stage** - Advance through supply chain
- **Simulate Delay** - Add delay event

### 3. Test Verification

1. Go to http://localhost:3000/verify
2. Enter `BATCH001`
3. Click "Verify"
4. See complete verification report

## Demo Script

For a complete demo, follow this sequence:

```
1. Create batch "BATCH001"
   → Trust Score: 100 (SAFE)

2. Click "Normal" temperature simulation
   → Temperature fluctuates normally
   → Trust Score remains stable

3. Click "Breach" 
   → Temperature: 38°C (outside safe range)
   → Trust Score: 70 (RISKY)
   → New alert appears

4. Click "Temperature Spike"
   → Temperature: 48°C (critical!)
   → Trust Score: 40 (UNSAFE)
   → Critical alert banner

5. Click "Move Stage"
   → Advances: Manufacturer → Warehouse → Distributor → Pharmacy

6. Go to Verify page
   → Enter "BATCH001"
   → See complete verification with warnings
```

## Troubleshooting

### MongoDB Connection Error
```bash
# Start MongoDB
mongod --dbpath /data/db
```

### Port Already in Use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
```

### Frontend Won't Start
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Next Steps

- Explore the blockchain integration by deploying the smart contract
- Customize the trust score rules in `backend/services/trustScoreService.js`
- Add more simulation scenarios
- Extend the verification portal with QR code scanning

---

**Happy Building! 🚀**
