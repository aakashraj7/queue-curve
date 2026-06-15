const express = require('express');
const router = express.Router();
const {
  getQueueData,
  addPatient,
  callNextPatient,
  completePatient,
  skipPatient,
  restorePatient,
  updateSettings
} = require('../controllers/queueController');

// Queue data routes
router.get('/', getQueueData);
router.post('/patient', addPatient);
router.post('/call-next', callNextPatient);
router.put('/patient/:id/complete', completePatient);
router.put('/patient/:id/skip', skipPatient);
router.put('/patient/:id/restore', restorePatient);
router.put('/settings', updateSettings);

module.exports = router;
