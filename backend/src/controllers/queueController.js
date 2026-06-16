const Patient = require('../models/Patient');
const Session = require('../models/Session');
const {
  recalculateWaitTimes,
  broadcastQueueUpdate,
  getQueueData: fetchQueueData
} = require('../socket/socketHandler');

// Helper to generate a random 4-character uppercase alphanumeric session ID
const generateSessionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper to get unique session ID
const getUniqueSessionId = async () => {
  let attempts = 0;
  while (attempts < 100) {
    const code = generateSessionId();
    const exists = await Session.exists({ sessionId: code });
    if (!exists) return code;
    attempts++;
  }
  throw new Error('Failed to generate a unique session ID.');
};

// Validate session and retrieve doctor profiles
const validateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cleanId = sessionId.trim().toUpperCase();

    const settings = await Session.findOne({ sessionId: cleanId });
    if (!settings || !settings.isInitialized) {
      return res.status(404).json({ message: `Active session "${cleanId}" not found.` });
    }

    res.json({ isValid: true, settings });
  } catch (error) {
    res.status(500).json({ message: 'Error validating session', error: error.message });
  }
};

// Get all queue data for a session
const getQueueData = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }
    const data = await fetchQueueData(sessionId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching queue data', error: error.message });
  }
};

// Initialize a new clinic session setup
const initializeSession = async (req, res) => {
  try {
    const { averageConsultationTime, doctors } = req.body;

    const time = parseInt(averageConsultationTime, 10);
    if (isNaN(time) || time < 1) {
      return res.status(400).json({ message: 'Average consultation time must be a number greater than 0.' });
    }

    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ message: 'At least one doctor is required to initialize the session.' });
    }

    // Validate doctors list
    for (const doc of doctors) {
      if (!doc.code || !doc.code.trim() || !doc.name || !doc.name.trim()) {
        return res.status(400).json({ message: 'Each doctor must have a valid name and unique code.' });
      }
    }

    // Generate unique session ID
    const sessionId = await getUniqueSessionId();

    // Wipe any existing patient logs that might conflict with this new session ID (cleanup safety)
    await Patient.deleteMany({ sessionId });

    // Save session configurations
    const settings = new Session({
      sessionId,
      averageConsultationTime: time,
      sessionStatus: 'open',
      mostSignificantMessage: '',
      leastSignificantMessage: '',
      doctors: doctors.map(d => ({ 
        code: d.code.trim().toUpperCase(), 
        name: d.name.trim(),
        availability: 'available'
      })),
      isInitialized: true
    });
    
    await settings.save();

    res.status(201).json({ message: 'Session initialized successfully.', settings, sessionId });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing session', error: error.message });
  }
};

// Reset/Wipe session settings and clear associated active patient queues
const resetSession = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    // 1. Wipe all patient logs under this session
    await Patient.deleteMany({ sessionId });

    // 2. Delete the session settings
    await Session.deleteOne({ sessionId });

    // 3. Broadcast reset room-wide
    await broadcastQueueUpdate(sessionId, 'session-reset');

    res.status(200).json({ message: 'Session reset and wiped successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting session', error: error.message });
  }
};

// Add a new patient to the queue
const addPatient = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const { patientName, assignedDoctors, tokenNumber: manualTokenNumber } = req.body;

    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ message: 'Patient name is required.' });
    }

    // Verify session still exists
    const settings = await Session.findOne({ sessionId });
    if (!settings || !settings.isInitialized) {
      return res.status(400).json({ message: 'Clinic session is active no longer. Please reload or log in.' });
    }

    const nameClean = patientName.trim();

    // Check for duplicate patient in active states in this session
    const existingPatient = await Patient.findOne({
      sessionId,
      patientName: { $regex: new RegExp(`^${nameClean}$`, 'i') },
      status: { $in: ['waiting', 'calling', 'serving'] }
    });

    if (existingPatient) {
      return res.status(400).json({ 
        message: `Patient "${nameClean}" is already active in the queue (Token #${existingPatient.tokenNumber}).` 
      });
    }

    // Process doctor assignment lists
    let doctorsArray = ['ALL'];
    if (Array.isArray(assignedDoctors) && assignedDoctors.length > 0) {
      doctorsArray = assignedDoctors.map(d => d.trim().toUpperCase());
    }

    // Setup Token Number
    let tokenNumber;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (manualTokenNumber !== undefined && manualTokenNumber !== null && manualTokenNumber !== '') {
      const parsedToken = parseInt(manualTokenNumber, 10);
      if (isNaN(parsedToken) || parsedToken < 1) {
        return res.status(400).json({ message: 'Manual token number must be a valid positive integer.' });
      }

      // Check if token number already exists in this session today
      const existingToken = await Patient.findOne({
        sessionId,
        tokenNumber: parsedToken,
        createdAt: { $gte: startOfToday }
      });
      if (existingToken) {
        return res.status(400).json({ message: `Token number ${parsedToken} has already been assigned today in this session.` });
      }
      tokenNumber = parsedToken;
    } else {
      // Auto-generate daily token number
      const latestPatient = await Patient.findOne({
        sessionId,
        createdAt: { $gte: startOfToday }
      }).sort({ tokenNumber: -1 });

      tokenNumber = latestPatient ? latestPatient.tokenNumber + 1 : 1;
    }

    // Create patient record
    const newPatient = new Patient({
      sessionId,
      tokenNumber,
      patientName: nameClean,
      assignedDoctors: doctorsArray,
      status: 'waiting'
    });

    await newPatient.save();

    // Recalculate wait times and broadcast
    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'patient-added', {
      patientName: newPatient.patientName,
      tokenNumber: newPatient.tokenNumber
    });

    res.status(201).json(newPatient);
  } catch (error) {
    res.status(500).json({ message: 'Error adding patient', error: error.message });
  }
};

// Doctor specific call-next endpoint
const callNextPatientDoctor = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const { code } = req.params;
    const docCode = code.trim().toUpperCase();

    // Validate doctor code exists in session settings
    const settings = await Session.findOne({ sessionId });
    if (!settings || !settings.isInitialized) {
      return res.status(400).json({ message: 'Session is not initialized.' });
    }
    if (settings.sessionStatus === 'lunch-break') {
      return res.status(400).json({ message: 'All queue progressions are frozen during lunch break.' });
    }
    const docExists = settings.doctors.some(d => d.code === docCode);
    if (!docExists) {
      return res.status(400).json({ message: `Doctor code "${docCode}" is not registered in this session.` });
    }

    // 1. If this doctor has a patient currently 'calling', automatically skip them (did not show up)
    const currentCalling = await Patient.findOne({ sessionId, calledBy: docCode, status: 'calling' });
    if (currentCalling) {
      currentCalling.status = 'skipped';
      await currentCalling.save();
      await broadcastQueueUpdate(sessionId, 'patient-skipped', {
        patientName: currentCalling.patientName,
        tokenNumber: currentCalling.tokenNumber
      });
    }

    // 2. If this doctor has a patient currently 'serving', automatically mark them completed
    const currentServing = await Patient.findOne({ sessionId, calledBy: docCode, status: 'serving' });
    if (currentServing) {
      currentServing.status = 'completed';
      currentServing.completedAt = new Date();
      await currentServing.save();
      await broadcastQueueUpdate(sessionId, 'patient-completed', {
        patientName: currentServing.patientName,
        tokenNumber: currentServing.tokenNumber
      });
    }

    // 3. Find next waiting patient assigned to this doctor or assigned to 'all'
    const nextPatient = await Patient.findOne({
      sessionId,
      status: 'waiting',
      $or: [
        { assignedDoctors: docCode },
        { assignedDoctors: 'ALL' }
      ]
    }).sort({ createdAt: 1 });

    if (!nextPatient) {
      await recalculateWaitTimes(sessionId);
      await broadcastQueueUpdate(sessionId);
      return res.json({ message: 'No patient waiting in your queue.', nextPatient: null });
    }

    // 4. Mark next patient as calling (flashes on screen)
    nextPatient.status = 'calling';
    nextPatient.calledBy = docCode;
    nextPatient.calledAt = new Date();
    await nextPatient.save();

    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'next-patient-called', {
      patientName: nextPatient.patientName,
      tokenNumber: nextPatient.tokenNumber,
      doctorCode: docCode
    });

    res.json({ message: `Calling Patient: ${nextPatient.patientName}`, nextPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error calling next patient', error: error.message });
  }
};

// Confirm patient has arrived at doctor's room
const arrivedPatient = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const settings = await Session.findOne({ sessionId });
    if (settings && settings.sessionStatus === 'lunch-break') {
      return res.status(400).json({ message: 'All queue progressions are frozen during lunch break.' });
    }

    const { id } = req.params;
    const patient = await Patient.findOne({ _id: id, sessionId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found in this session.' });
    }

    if (patient.status !== 'calling') {
      return res.status(400).json({ message: 'Patient must be in calling state to confirm arrival.' });
    }

    patient.status = 'serving';
    await patient.save();

    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'patient-arrived', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber,
      doctorCode: patient.calledBy
    });

    res.json({ message: `Patient arrived: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error marking patient arrived', error: error.message });
  }
};

// Manually complete a patient
const completePatient = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const settings = await Session.findOne({ sessionId });
    if (settings && settings.sessionStatus === 'lunch-break') {
      return res.status(400).json({ message: 'All queue progressions are frozen during lunch break.' });
    }

    const { id } = req.params;
    const patient = await Patient.findOne({ _id: id, sessionId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found in this session.' });
    }

    patient.status = 'completed';
    patient.completedAt = new Date();
    if (!patient.calledAt) {
      patient.calledAt = patient.completedAt;
    }
    await patient.save();

    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'patient-completed', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient completed: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error completing patient', error: error.message });
  }
};

// Skip a patient
const skipPatient = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const settings = await Session.findOne({ sessionId });
    if (settings && settings.sessionStatus === 'lunch-break') {
      return res.status(400).json({ message: 'All queue progressions are frozen during lunch break.' });
    }

    const { id } = req.params;
    const patient = await Patient.findOne({ _id: id, sessionId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found in this session.' });
    }

    patient.status = 'skipped';
    await patient.save();

    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'patient-skipped', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient skipped: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error skipping patient', error: error.message });
  }
};

// Restore a skipped patient
const restorePatient = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const settings = await Session.findOne({ sessionId });
    if (settings && settings.sessionStatus === 'lunch-break') {
      return res.status(400).json({ message: 'All queue progressions are frozen during lunch break.' });
    }

    const { id } = req.params;
    const patient = await Patient.findOne({ _id: id, sessionId });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found in this session.' });
    }

    patient.status = 'waiting';
    patient.calledBy = undefined;
    patient.calledAt = undefined;
    patient.completedAt = undefined;
    await patient.save();

    await recalculateWaitTimes(sessionId);
    await broadcastQueueUpdate(sessionId, 'patient-restored', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient restored to queue: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring patient', error: error.message });
  }
};

// Update global session settings (consultation duration, clinic status, doctor availabilities)
const updateSettings = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID (x-session-id) is required.' });
    }

    const { averageConsultationTime, sessionStatus, doctors, mostSignificantMessage, leastSignificantMessage } = req.body;

    const time = parseInt(averageConsultationTime, 10);
    if (isNaN(time) || time < 1) {
      return res.status(400).json({ message: 'Average consultation time must be a number greater than 0.' });
    }

    let settings = await Session.findOne({ sessionId });
    if (!settings) {
      return res.status(404).json({ message: 'Session settings not found.' });
    }
    
    const timeChanged = settings.averageConsultationTime !== time;
    settings.averageConsultationTime = time;
    if (sessionStatus) {
      settings.sessionStatus = sessionStatus;
    }
    if (mostSignificantMessage !== undefined) {
      settings.mostSignificantMessage = mostSignificantMessage;
    }
    if (leastSignificantMessage !== undefined) {
      settings.leastSignificantMessage = leastSignificantMessage;
    }
    if (doctors && Array.isArray(doctors)) {
      settings.doctors = doctors.map(d => ({
        code: d.code.trim().toUpperCase(),
        name: d.name.trim(),
        availability: d.availability || 'available'
      }));
    }
    await settings.save();

    await recalculateWaitTimes(sessionId);
    
    if (timeChanged) {
      await broadcastQueueUpdate(sessionId, 'consultation-time-changed', {
        averageConsultationTime: settings.averageConsultationTime,
        sessionStatus: settings.sessionStatus,
        doctors: settings.doctors,
        mostSignificantMessage: settings.mostSignificantMessage,
        leastSignificantMessage: settings.leastSignificantMessage
      });
    } else {
      await broadcastQueueUpdate(sessionId);
    }

    res.json({ message: 'Queue settings updated successfully.', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating queue settings', error: error.message });
  }
};

module.exports = {
  validateSession,
  getQueueData,
  initializeSession,
  resetSession,
  addPatient,
  callNextPatientDoctor,
  arrivedPatient,
  completePatient,
  skipPatient,
  restorePatient,
  updateSettings
};
