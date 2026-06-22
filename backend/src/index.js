require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');
const queueRoutes = require('./routes/queueRoutes');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Setup CORS configurations to support Vercel domains and local dev environments dynamically
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (like server-to-server or postman)
  if (!origin) return callback(null, true);

  const isAllowed = allowedOrigins.some(allowed => {
    const cleanAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
    return origin === cleanAllowed;
  });

  const isVercel = origin.endsWith('.vercel.app');

  if (isAllowed || isVercel) {
    callback(null, true);
  } else {
    callback(null, false); // Block other origins safely without throwing unhandled exceptions
  }
};

app.use(cors({
  origin: corsOriginChecker,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/queue', queueRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Initialize WebSockets (Socket.IO)
socketHandler.init(server, corsOriginChecker);

// Start HTTP & WebSocket Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO listening for connections from configured origins.");
});
