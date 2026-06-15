const { Server } = require('socket.io');
const Patient = require('../models/Patient');
const QueueSettings = require('../models/QueueSettings');

let io = null;

const getQueueData = async () => {
  // Ensure default settings exist
  let settings = await QueueSettings.findOne();
  if (!settings) {
    settings = await QueueSettings.create({ averageConsultationTime: 15 });
  }

  // Fetch active queue: serving patients first, then waiting patients sorted by creation time
  const serving = await Patient.find({ status: 'serving' }).sort({ calledAt: 1 });
  const waiting = await Patient.find({ status: 'waiting' }).sort({ createdAt: 1 });
  const activeQueue = [...serving, ...waiting];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch skipped queue for today
  const skippedQueue = await Patient.find({
    status: 'skipped',
    createdAt: { $gte: startOfToday }
  }).sort({ createdAt: 1 });

  // Compute analytics dynamically
  const completedToday = await Patient.find({
    status: 'completed',
    completedAt: { $gte: startOfToday }
  });

  const patientsServed = completedToday.length;

  // Wait time calculations (only for patients who were actually served today)
  const activeOrCompletedToday = await Patient.find({
    status: { $in: ['serving', 'completed'] },
    calledAt: { $gte: startOfToday }
  });

  let totalWaitTimeMs = 0;
  let waitCount = 0;
  for (const p of activeOrCompletedToday) {
    if (p.calledAt && p.createdAt) {
      totalWaitTimeMs += (p.calledAt - p.createdAt);
      waitCount++;
    }
  }
  const averageWaitTime = waitCount > 0 ? parseFloat(((totalWaitTimeMs / (1000 * 60)) / waitCount).toFixed(1)) : 0;

  // Consultation time calculations
  let totalConsultationTimeMs = 0;
  let consultCount = 0;
  for (const p of completedToday) {
    if (p.completedAt && p.calledAt) {
      totalConsultationTimeMs += (p.completedAt - p.calledAt);
      consultCount++;
    }
  }
  const averageConsultationTime = consultCount > 0 ? parseFloat(((totalConsultationTimeMs / (1000 * 60)) / consultCount).toFixed(1)) : 0;

  const skippedPatientsCount = await Patient.countDocuments({
    status: 'skipped',
    createdAt: { $gte: startOfToday }
  });

  const activeQueueCount = activeQueue.length;

  return {
    activeQueue,
    skippedQueue,
    settings,
    analytics: {
      patientsServed,
      averageWaitTime,
      averageConsultationTime,
      skippedPatientsCount,
      activeQueueCount
    }
  };
};

const recalculateWaitTimes = async () => {
  let settings = await QueueSettings.findOne();
  if (!settings) {
    settings = await QueueSettings.create({ averageConsultationTime: 15 });
  }
  const avgTime = settings.averageConsultationTime;

  const serving = await Patient.find({ status: 'serving' });
  const servingCount = serving.length;

  // Serving patients wait time is 0
  for (const p of serving) {
    p.estimatedWaitTime = 0;
    await p.save();
  }

  // Waiting patients wait time is (index + servingCount) * averageConsultationTime
  const waiting = await Patient.find({ status: 'waiting' }).sort({ createdAt: 1 });
  for (let i = 0; i < waiting.length; i++) {
    waiting[i].estimatedWaitTime = (i + servingCount) * avgTime;
    await waiting[i].save();
  }
};

const broadcastQueueUpdate = async (eventType = null, eventData = null) => {
  if (!io) return;
  try {
    const data = await getQueueData();
    io.emit('queue-updated', data);

    if (eventType && eventData) {
      io.emit(eventType, eventData);
    }
  } catch (error) {
    console.error('Error broadcasting queue update:', error);
  }
};

const init = (server, allowedOrigin) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigin || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', async (socket) => {
    console.log(`Socket Client Connected: ${socket.id}`);

    // Send the current state immediately upon client connection
    try {
      const data = await getQueueData();
      socket.emit('queue-updated', data);
    } catch (error) {
      console.error('Error sending initial queue state:', error);
    }

    socket.on('disconnect', () => {
      console.log(`Socket Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = {
  init,
  getIO,
  recalculateWaitTimes,
  broadcastQueueUpdate,
  getQueueData
};
