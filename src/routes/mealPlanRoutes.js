const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlanController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/initialize', mealPlanController.initializePlan);
router.post('/create', mealPlanController.createPlan);
router.get('/active', mealPlanController.getActivePlans);
router.put('/:plan_id/status', mealPlanController.updatePlanStatus);
router.get('/history', mealPlanController.getPlanHistory);

module.exports = router;