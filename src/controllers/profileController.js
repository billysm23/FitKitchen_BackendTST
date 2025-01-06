const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;

        const { data: healthAssessment, error: healthError } = await supabase
            .from('health_assessments')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (healthError && healthError.code !== 'PGRST116') {
            throw new AppError(
                'Error fetching health assessment data',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        res.status(200).json({
            success: true,
            data: {
                user: req.user,
                healthAssessment: healthAssessment || null
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        next(error);
    }
});

module.exports = {
    getProfile
};