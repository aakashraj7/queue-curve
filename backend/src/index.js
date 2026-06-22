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

// Setup CORS configurations to support all client origins dynamically for hackathon robustness
const corsOriginChecker = (origin, callback) => {
  // Allow all origins dynamically with credentials. This echoes the request origin back to Access-Control-Allow-Origin
  if (origin) {
    console.log(`CORS allowed for origin: ${origin}`);
  }
  callback(null, true);
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
