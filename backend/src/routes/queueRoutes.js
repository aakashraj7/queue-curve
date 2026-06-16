const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/queueController');

// Queue routes
router.get('/validate/:sessionId', validateSession);
router.get('/', getQueueData);
router.post('/initialize', initializeSession);
router.post('/reset', resetSession);
router.post('/patient', addPatient);
router.post('/doctor/:code/call-next', callNextPatientDoctor);
router.put('/patient/:id/arrived', arrivedPatient);
router.put('/patient/:id/complete', completePatient);
router.put('/patient/:id/skip', skipPatient);
router.put('/patient/:id/restore', restorePatient);
router.put('/settings', updateSettings);

module.exports = router;
