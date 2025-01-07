const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');
const healthCalculations = require('../utils/healthCalculations');

const createAssessment = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Data validation
        const requiredFields = ['height', 'weight', 'age', 'gender'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            throw new AppError(
                `Missing required fields: ${missingFields.join(', ')}`,
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        if (req.body.height <= 0) {
            throw new AppError('Invalid height value', 400, ErrorCodes.INVALID_INPUT);
        }

        if (req.body.weight <= 0) {
            throw new AppError('Invalid weight value', 400, ErrorCodes.INVALID_INPUT);
        }
        
        if (req.body.target_weight <= 0) {
            throw new AppError('Invalid weight value', 400, ErrorCodes.INVALID_INPUT);
        }

        if (req.body.age <= 0) {
            throw new AppError('Invalid age value', 400, ErrorCodes.INVALID_INPUT);
        }

        const bmi = healthCalculations.calculateBMI(req.body.weight, req.body.height);
        const bmi_category = healthCalculations.getBMICategory(bmi);
        const bmr = healthCalculations.calculateBMR(req.body.weight, req.body.height, req.body.age, req.body.gender);
        const tdee = healthCalculations.calculateTDEE(bmr, req.body.activity_level);
        const primaryGoal = ['fat_loss', 'muscle_gain', 'maintenance'].includes(req.body.health_goal)? req.body.health_goal : 'maintenance';
        const finalCal = healthCalculations.calculateFinalCalories(tdee, primaryGoal);
        const macronutrients = healthCalculations.calculateMacronutrients(req.body.weight, req.body.height, primaryGoal, bmi_category, req.body.macro_ratio, finalCal);

        const assessmentData = {
            user_id: userId,
            height: req.body.height,
            weight: req.body.weight,
            age: req.body.age,
            gender: req.body.gender,
            health_history: req.body.health_history,
            activity_level: req.body.activity_level,
            macro_ratio: req.body.macro_ratio,
            health_goal: req.body.health_goal,
            specific_goals: req.body.specific_goals,
            target_weight: req.body.target_weight,
            metrics: {
                bmi,
                bmi_category,
                bmr,
                tdee,
                final_cal: finalCal,
                macronutrients
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Check existing
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
            // Update existing
            const { data, error } = await supabase
                .from('health_assessments')
                .update(assessmentData)
                .eq('id', existingAssessment.id)
                .select()
                .single();

            if (error) {
                console.error('Update error:', error);
                throw new AppError(
                    'Failed to update assessment',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }
            result = data;
        } else {
            // Create new assessment
            const { data, error } = await supabase
                .from('health_assessments')
                .insert([assessmentData])
                .select()
                .single();

            if (error) {
                console.error('Insert error:', error);
                throw new AppError(
                    'Failed to create assessment',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }
            result = data;
        }

        res.status(201).json({
            success: true,
            message: existingAssessment ? 'Assessment updated successfully' : 'Assessment created successfully',
            data: result
        });

    } catch (error) {
        console.error('Health assessment error:', error);
        next(error);
    }
});

module.exports = {
    createAssessment
};