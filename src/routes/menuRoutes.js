const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const auth = require('../middleware/auth');

// Public routes
router.get('/search', menuController.searchMenus);
router.get('/category/:category', menuController.getMenusByCategory);
// router.get('/:id', menuController.getMenuDetails);
// router.get('/:id/nutrition', menuController.getMenuNutrition);

// Protected routes
router.use(auth);
router.get('/recommended', menuController.getRecommendedMenus);
router.post('/validate-selection', menuController.validateMenuSelection);

module.exports = router;