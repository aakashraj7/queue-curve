const Patient = require('../models/Patient');
const QueueSettings = require('../models/QueueSettings');
const {
  recalculateWaitTimes,
  broadcastQueueUpdate,
  getQueueData: fetchQueueData
} = require('../socket/socketHandler');

// Get all queue data: active queue, skipped queue, settings, and analytics
const getQueueData = async (req, res) => {
  try {
    const data = await fetchQueueData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching queue data', error: error.message });
  }
};

// Add a new patient to the queue
const addPatient = async (req, res) => {
  try {
    const { patientName } = req.body;

    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ message: 'Patient name is required.' });
    }

    // Edge Case: Check for duplicate patient in the active queue
    const nameClean = patientName.trim();
    const existingPatient = await Patient.findOne({
      patientName: { $regex: new RegExp(`^${nameClean}$`, 'i') },
      status: { $in: ['waiting', 'serving'] }
    });

    if (existingPatient) {
      return res.status(400).json({ 
        message: `Patient "${nameClean}" is already active in the queue (Token #${existingPatient.tokenNumber}).` 
      });
    }

    // Auto-generate daily token number (starts at 1 and resets every day)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const latestPatient = await Patient.findOne({
      createdAt: { $gte: startOfToday }
    }).sort({ tokenNumber: -1 });

    const tokenNumber = latestPatient ? latestPatient.tokenNumber + 1 : 1;

    // Create patient
    const newPatient = new Patient({
      tokenNumber,
      patientName: nameClean,
      status: 'waiting'
    });

    await newPatient.save();

    // Recalculate wait times and broadcast
    await recalculateWaitTimes();
    await broadcastQueueUpdate('patient-added', {
      patientName: newPatient.patientName,
      tokenNumber: newPatient.tokenNumber
    });

    res.status(201).json(newPatient);
  } catch (error) {
    res.status(500).json({ message: 'Error adding patient', error: error.message });
  }
};

// Call the next patient (makes the current serving patient completed, and moves the first waiting to serving)
const callNextPatient = async (req, res) => {
  try {
    // 1. Complete the currently serving patient if there is one
    const currentServing = await Patient.findOne({ status: 'serving' });
    if (currentServing) {
      currentServing.status = 'completed';
      currentServing.completedAt = new Date();
      await currentServing.save();
      
      // Emit completed event for toast notifications
      await broadcastQueueUpdate('patient-completed', {
        patientName: currentServing.patientName,
        tokenNumber: currentServing.tokenNumber
      });
    }

    // 2. Fetch the next waiting patient
    const nextPatient = await Patient.findOne({ status: 'waiting' }).sort({ createdAt: 1 });

    if (!nextPatient) {
      // If we finished the queue, we still recalculate & broadcast the empty state
      await recalculateWaitTimes();
      await broadcastQueueUpdate();
      return res.json({ message: 'Queue is empty. No patient waiting.', nextPatient: null });
    }

    // 3. Mark next patient as serving
    nextPatient.status = 'serving';
    nextPatient.calledAt = new Date();
    await nextPatient.save();

    // Recalculate and broadcast next patient called
    await recalculateWaitTimes();
    await broadcastQueueUpdate('next-patient-called', {
      patientName: nextPatient.patientName,
      tokenNumber: nextPatient.tokenNumber
    });

    res.json({ message: `Called Patient: ${nextPatient.patientName}`, nextPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error calling next patient', error: error.message });
  }
};

// Manually complete a specific patient
const completePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    if (patient.status === 'completed') {
      return res.status(400).json({ message: 'Patient is already completed.' });
    }

    patient.status = 'completed';
    patient.completedAt = new Date();
    // If they were never called, set calledAt to completedAt as fallback
    if (!patient.calledAt) {
      patient.calledAt = patient.completedAt;
    }
    await patient.save();

    await recalculateWaitTimes();
    await broadcastQueueUpdate('patient-completed', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient completed: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error completing patient', error: error.message });
  }
};

// Skip a patient (moves them from active waiting list to skipped state)
const skipPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    patient.status = 'skipped';
    await patient.save();

    await recalculateWaitTimes();
    await broadcastQueueUpdate('patient-skipped', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient skipped: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error skipping patient', error: error.message });
  }
};

// Restore a skipped patient back to waiting status
const restorePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    if (patient.status !== 'skipped') {
      return res.status(400).json({ message: 'Patient is not in skipped state.' });
    }

    patient.status = 'waiting';
    patient.calledAt = undefined;
    patient.completedAt = undefined;
    await patient.save();

    await recalculateWaitTimes();
    await broadcastQueueUpdate('patient-restored', {
      patientName: patient.patientName,
      tokenNumber: patient.tokenNumber
    });

    res.json({ message: `Patient restored to queue: ${patient.patientName}`, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring patient', error: error.message });
  }
};

// Update global queue settings (specifically the average consultation time)
const updateSettings = async (req, res) => {
  try {
    const { averageConsultationTime } = req.body;

    const time = parseInt(averageConsultationTime, 10);
    if (isNaN(time) || time < 1) {
      return res.status(400).json({ message: 'Average consultation time must be a number greater than 0.' });
    }

    let settings = await QueueSettings.findOne();
    if (!settings) {
      settings = new QueueSettings({ averageConsultationTime: time });
    } else {
      settings.averageConsultationTime = time;
    }
    await settings.save();

    await recalculateWaitTimes();
    await broadcastQueueUpdate('consultation-time-changed', {
      averageConsultationTime: settings.averageConsultationTime
    });

    res.json({ message: 'Queue settings updated successfully.', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating queue settings', error: error.message });
  }
};

module.exports = {
  getQueueData,
  addPatient,
  callNextPatient,
  completePatient,
  skipPatient,
  restorePatient,
  updateSettings
};
