const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/profileController');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;