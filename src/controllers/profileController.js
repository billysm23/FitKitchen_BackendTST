const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');
const healthCalculations = require('../utils/healthCalculations');

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

const updateProfile = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            height,
            weight,
            age,
            gender,
            health_history,
            activity_level,
            macro_ratio,
            health_goal,
            specific_goals,
            target_weight
        } = req.body;

        if (!height || !weight || !age || !gender) {
            throw new AppError(
                'Missing required measurement data',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        if (height < 100 || height > 250) {
            throw new AppError(
                'Height must be between 100 and 250 cm',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        if (weight < 30 || weight > 200) {
            throw new AppError(
                'Weight must be between 30 and 200 kg',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        if (age < 15 || age > 100) {
            throw new AppError(
                'Age must be between 15 and 100 years',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        if (target_weight && (target_weight < 30 || target_weight > 200)) {
            throw new AppError(
                'Target weight must be between 30 and 200 kg',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const bmi = healthCalculations.calculateBMI(weight, height);
        const bmi_category = healthCalculations.getBMICategory(bmi);
        const bmr = healthCalculations.calculateBMR(weight, height, age, gender);
        const tdee = healthCalculations.calculateTDEE(bmr, activity_level);
        const primaryGoal = ['fat_loss', 'muscle_gain', 'maintenance'].includes(health_goal)? health_goal : 'maintenance';
        const finalCal = healthCalculations.calculateFinalCalories(tdee, primaryGoal);
        const macronutrients = healthCalculations.calculateMacronutrients(weight, height, primaryGoal, bmi_category, macro_ratio, finalCal);

        const updateData = {
            height,
            weight,
            age,
            gender,
            health_history,
            activity_level,
            macro_ratio,
            health_goal,
            target_weight,
            specific_goals,
            metrics: {
                bmi,
                bmi_category,
                bmr,
                tdee,
                final_cal: finalCal,
                macronutrients
            },
            updated_at: new Date().toISOString()
        };
        
        const { data: existingAssessment, error: checkError } = await supabase
            .from('health_assessments')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            throw new AppError(
                'Error checking existing assessment',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }
        
        let result;
        if (existingAssessment) {
            const { data, error } = await supabase
                .from('health_assessments')
                .update(updateData)
                .eq('id', existingAssessment.id)
                .select()
                .single();
        
            if (error) {
                console.error('Update error:', error);
                throw new AppError(
                    'Failed to update health assessment',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }
            result = data;
        }
        
        res.status(200).json({
            success: true,
            message: existingAssessment ? 'Profile updated successfully' : 'Profile created successfully',
            data: result
        });
        
        } catch (error) {
            console.error('Profile update error:', error);
            next(error);
        }
});

module.exports = {
    getProfile,
    updateProfile
};