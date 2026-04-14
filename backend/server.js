const app = require('./app');
const connectDB = require('./config/database');
const { checkConnection: checkBlockchain } = require('./services/blockchainService');

const PORT = 5000;

// Retry configuration for MongoDB
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

// Start server
const startServer = async () => {
  let mongoConnected = false;
  let retries = 0;

  // Try to connect to MongoDB with retries
  while (!mongoConnected && retries < MAX_RETRIES) {
    try {
      console.log(`[MongoDB] Attempting connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
      await connectDB();
      mongoConnected = true;
      console.log('[MongoDB] Connected successfully');
    } catch (error) {
      retries++;
      if (retries < MAX_RETRIES) {
        console.log(`[MongoDB] Connection failed. Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error('[MongoDB] Max retries reached. Server will start without MongoDB.');
        console.error('[MongoDB] Please ensure MongoDB is running: net start MongoDB');
        console.error('[MongoDB] The API will return errors until MongoDB connects.');
      }
    }
  }

  // Check blockchain connection (non-blocking)
  checkBlockchain().then(result => {
    if (result.connected) {
      console.log(`[Blockchain] Connected at block ${result.blockNumber}`);
    } else {
      console.log('[Blockchain] Not connected (running in demo mode)');
    }
  });

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     PharmaChain Intelligence System - Backend Server     ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Server running on port ${PORT}`);
    console.log('║  API: http://localhost:5000/api');
    console.log('║  Docs: http://localhost:5000/api');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    if (mongoConnected) {
      console.log('║  [✓] MongoDB Connected');
    } else {
      console.log('║  [!] MongoDB Not Connected - Start MongoDB to enable API');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });

  // MongoDB reconnection watcher
  if (!mongoConnected) {
    const reconnectInterval = setInterval(async () => {
      try {
        const connectDB = require('./config/database');
        await connectDB();
        console.log('[MongoDB] Reconnected successfully!');
        clearInterval(reconnectInterval);
      } catch (error) {
        // Keep trying
      }
    }, 5000);
  }
};

startServer();
