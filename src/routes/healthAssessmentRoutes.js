const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createAssessment } = require('../controllers/healthAssessmentController');

router.post('/health-assessment', auth, createAssessment);

module.exports = router;