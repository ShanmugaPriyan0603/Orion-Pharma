# Troubleshooting Guide

## MongoDB Connection Issues

### Error: "Unable to connect to the remote server"

This is the most common issue. Here are the solutions:

### Solution 1: Start MongoDB Service (Recommended)

**Option A - Using the provided script:**
```bash
# Run as Administrator
start-mongodb.bat
```

**Option B - Using Windows Service:**
```bash
# Open Command Prompt as Administrator
net start MongoDB
```

**Option C - Manual start:**
```bash
# Create data directory if it doesn't exist
mkdir C:\data\db

# Start MongoDB manually
mongod --dbpath C:\data\db
```

### Solution 2: Check MongoDB Installation

1. **Verify MongoDB is installed:**
   ```bash
   where mongod
   ```

2. **If not found, install MongoDB:**
   - Download from: https://www.mongodb.com/try/download/community
   - Install with "Install MongoDB as a Service" option checked
   - Add MongoDB to PATH during installation

### Solution 3: Check MongoDB is Running

```bash
# Check if MongoDB port is listening
netstat -ano | findstr :27017

# Check MongoDB service status
sc query MongoDB
```

### Solution 4: Fix Connection String

The backend uses `mongodb://127.0.0.1:27017/pharmachain` (IPv4).

If you still have issues, verify in `backend/.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/pharmachain
```

### Solution 5: Firewall Issues

Windows Firewall might be blocking MongoDB:
```bash
# Add MongoDB to firewall exceptions (run as Administrator)
netsh advfirewall firewall add rule name="MongoDB" dir=in action=allow program="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" enable=yes
```

---

## Backend Won't Start

### Error: "Port 5000 already in use"

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or change the port in backend/.env
PORT=5001
```

### Error: "Cannot find module"

```bash
# Reinstall backend dependencies
cd backend
rmdir /s /q node_modules
npm install
```

---

## Frontend Won't Start

### Error: "Port 3000 already in use"

```bash
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in frontend/vite.config.js
server: { port: 3001 }
```

### Error: "Cannot find module"

```bash
# Reinstall frontend dependencies
cd frontend
rmdir /s /q node_modules
npm install
```

---

## Blockchain Issues

### Error: "Cannot connect to Hardhat node"

```bash
# Start Hardhat node
cd blockchain
npm run node

# In another terminal, deploy contract
npm run deploy
```

### Error: "Contract deployment failed"

1. Ensure Hardhat node is running on port 8545
2. Check `backend/.env` has correct RPC URL:
   ```
   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
   ```

---

## Location Search Not Working

The location search uses Nominatim (OpenStreetMap) API and requires internet.

If it's not working:
1. Check internet connectivity
2. The API has rate limits (1 request per second)
3. Try again after a few seconds

---

## Quick Diagnostic Commands

```bash
# Check all services
echo "=== MongoDB ===" && netstat -ano | findstr :27017
echo "=== Backend ===" && netstat -ano | findstr :5000
echo "=== Frontend ===" && netstat -ano | findstr :3000
echo "=== Blockchain ===" && netstat -ano | findstr :8545

# Check running Node processes
tasklist | findstr node

# Check MongoDB service
sc query MongoDB
```

---

## Complete Reset

If nothing works, try a complete reset:

```bash
# Stop all services
net stop MongoDB (if running)

# Kill all Node processes
taskkill /F /IM node.exe

# Clear temp files
cd backend && rmdir /s /q node_modules
cd ../frontend && rmdir /s /q node_modules
cd ../blockchain && rmdir /s /q node_modules

# Reinstall
cd backend && npm install
cd ../frontend && npm install
cd ../blockchain && npm install

# Start MongoDB
net start MongoDB

# Run the startup script
start.bat
```

---

## Still Having Issues?

1. **Check the logs:**
   - Backend: Look at the backend terminal window
   - MongoDB: `C:\data\log\mongod.log`
   - Blockchain: Look at the blockchain terminal window

2. **Verify prerequisites:**
   - Node.js v18+: `node --version`
   - npm: `npm --version`
   - MongoDB: `mongod --version`

3. **Run components individually:**
   ```bash
   # Terminal 1 - MongoDB
   mongod --dbpath C:\data\db

   # Terminal 2 - Backend
   cd backend && npm run dev

   # Terminal 3 - Frontend
   cd frontend && npm run dev

   # Terminal 4 - Blockchain (optional)
   cd blockchain && npm run node
   ```

---

## Contact/Support

If you're still experiencing issues, check:
- MongoDB logs: `C:\data\log\mongod.log`
- Windows Event Viewer: Application logs
- Node.js version compatibility
