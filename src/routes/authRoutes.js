const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.put('/update-password', auth, authController.updatePassword);

// OAuth routes
router.get('/google', oauthController.googleSignIn);
router.post('/callback', oauthController.handleOAuthCallback);

module.exports = router;