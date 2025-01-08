const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors/AppError');
const AppErrorMealPlan = require('../utils/errors/AppErrorMealPlan');
const ErrorCodes = require('../utils/errors/errorCodes');
const MealPlan = require('../models/mealPlan');
const menuController = require('./menuController');

exports.initializePlan = asyncHandler(async (req, res, next) => {
    try {
        const { plan_type } = req.body;
        const userId = req.user.id;

        if (!MealPlan.PLAN_CONFIGS[plan_type]) {
            throw new AppError(
                'Invalid plan type. Must be one of: single, half_day, full_day',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        req.query.plan_type = plan_type;
        await menuController.getRecommendedMenus(req, res, next);

    } catch (error) {
        next(error);
    }
});

exports.createPlan = asyncHandler(async (req, res, next) => {
    try {
        const { plan_type, menuIds } = req.body;
        const userId = req.user.id;

        // Menggunakan menuController untuk validasi menu
        req.body.plan_type = plan_type;
        const validationResponse = await new Promise((resolve, reject) => {
            const mockRes = {
                status: function() { return this; },
                json: resolve
            };
            menuController.validateMenuSelection(req, mockRes, (error) => {
                if (error) reject(error);
            });
        });

        if (!validationResponse.success) {
            throw new AppError(
                validationResponse.error?.message || 'Menu validation failed',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        if (!validationResponse.data.isValid) {
            throw new AppErrorMealPlan(
                'Invalid menu selection',
                400,
                ErrorCodes.INVALID_INPUT,
                validationResponse.data
            );
        }

        const plan = await MealPlan.createPlan(
            userId,
            plan_type,
            menuIds,
            validationResponse.data.totalNutrition
        );

        res.status(201).json({
            success: true,
            data: {
                plan,
                validation: validationResponse.data
            }
        });

    } catch (error) {
        next(error);
    }
});

exports.getActivePlans = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const activePlans = await MealPlan.getActivePlans(userId);

        res.status(200).json({
            success: true,
            data: activePlans
        });
    } catch (error) {
        next(error);
    }
});

exports.updatePlanStatus = asyncHandler(async (req, res, next) => {
    try {
        const { plan_id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        const updatedPlan = await MealPlan.updatePlanStatus(
            plan_id,
            userId,
            status
        );

        res.status(200).json({
            success: true,
            data: updatedPlan
        });
    } catch (error) {
        next(error);
    }
});

exports.getPlanHistory = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { status, limit, offset } = req.body;

        const history = await MealPlan.getPlanHistory(userId, {
            status,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            data: history.data,
            pagination: history.pagination
        });
    } catch (error) {
        next(error);
    }
});