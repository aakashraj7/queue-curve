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

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
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
socketHandler.init(server, allowedOrigin);

// Start HTTP & WebSocket Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO listening for connections from ${allowedOrigin}`);
});
