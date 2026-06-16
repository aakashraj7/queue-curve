const { Server } = require('socket.io');
const Patient = require('../models/Patient');
const QueueSettings = require('../models/QueueSettings');

let io = null;

const getQueueData = async (sessionId) => {
  if (!sessionId) {
    return {
      activeQueue: [],
      skippedQueue: [],
      settings: { averageConsultationTime: 15, isInitialized: false, doctors: [] },
      analytics: {
        patientsServed: 0,
        averageWaitTime: 0,
        averageConsultationTime: 0,
        skippedPatientsCount: 0,
        activeQueueCount: 0
      }
    };
  }

  // Fetch settings for this session
  let settings = await QueueSettings.findOne({ sessionId });
  if (!settings) {
    settings = { sessionId, averageConsultationTime: 15, isInitialized: false, doctors: [] };
  }

  // Fetch active queue: calling patients, serving patients, then waiting patients
  const calling = await Patient.find({ sessionId, status: 'calling' }).sort({ calledAt: 1 });
  const serving = await Patient.find({ sessionId, status: 'serving' }).sort({ calledAt: 1 });
  const waiting = await Patient.find({ sessionId, status: 'waiting' }).sort({ createdAt: 1 });
  const activeQueue = [...calling, ...serving, ...waiting];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch skipped queue for today
  const skippedQueue = await Patient.find({
    sessionId,
    status: 'skipped',
    createdAt: { $gte: startOfToday }
  }).sort({ createdAt: 1 });

  // Compute analytics dynamically
  const completedToday = await Patient.find({
    sessionId,
    status: 'completed',
    completedAt: { $gte: startOfToday }
  });

  const patientsServed = completedToday.length;

  // Wait time calculations (only for patients who were actually called today)
  const activeOrCompletedToday = await Patient.find({
    sessionId,
    status: { $in: ['calling', 'serving', 'completed'] },
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

  // Consultation time calculations (from arrived/serving to completed)
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
    sessionId,
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

const recalculateWaitTimes = async (sessionId) => {
  if (!sessionId) return;
  let settings = await QueueSettings.findOne({ sessionId });
  if (!settings) return;
  const avgTime = settings.averageConsultationTime;
  const doctorsList = settings.doctors || [];

  if (!settings.isInitialized || doctorsList.length === 0) {
    // Session not initialized: wait times are all 0
    await Patient.updateMany({ sessionId, status: 'waiting' }, { estimatedWaitTime: 0 });
    return;
  }

  // Multi-doctor greedy wait time simulation
  const doctorQueueTime = {};
  for (const doc of doctorsList) {
    const isBusy = await Patient.exists({
      sessionId,
      calledBy: doc.code,
      status: { $in: ['calling', 'serving'] }
    });
    doctorQueueTime[doc.code] = isBusy ? avgTime : 0;
  }

  const waiting = await Patient.find({ sessionId, status: 'waiting' }).sort({ createdAt: 1 });
  for (const p of waiting) {
    let eligibleDocs = p.assignedDoctors || ['all'];
    if (eligibleDocs.includes('all')) {
      eligibleDocs = doctorsList.map((d) => d.code);
    }

    if (eligibleDocs.length === 0) {
      p.estimatedWaitTime = 0;
      await p.save();
      continue;
    }

    // Find min queue time among eligible doctors
    let minTime = Infinity;
    let chosenDocCode = eligibleDocs[0];

    for (const code of eligibleDocs) {
      const time = doctorQueueTime[code] || 0;
      if (time < minTime) {
        minTime = time;
        chosenDocCode = code;
      }
    }

    p.estimatedWaitTime = minTime;
    await p.save();

    // Allocate the doctor's time for this patient
    doctorQueueTime[chosenDocCode] = (doctorQueueTime[chosenDocCode] || 0) + avgTime;
  }
};

const broadcastQueueUpdate = async (sessionId, eventType = null, eventData = null) => {
  if (!io || !sessionId) return;
  try {
    const data = await getQueueData(sessionId);
    io.to(sessionId).emit('queue-updated', data);

    if (eventType && eventData) {
      io.to(sessionId).emit(eventType, eventData);
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

    // Join room for specific session
    socket.on('join-session', async ({ sessionId }) => {
      if (sessionId) {
        // Leave any previous rooms first
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session room: ${sessionId}`);
        
        try {
          const data = await getQueueData(sessionId);
          socket.emit('queue-updated', data);
        } catch (error) {
          console.error('Error sending initial queue state:', error);
        }
      }
    });

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
