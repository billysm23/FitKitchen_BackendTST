const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');

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

        // Calculate metrics
        const calculateBMI = (weight, height) => {
            const heightInMeters = height / 100;
            return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
        };
        
        const getBMICategory = (bmi) => {
            if (bmi < 18.5) return 'Underweight';
            if (bmi < 25) return 'Normal';
            if (bmi < 30) return 'Overweight';
            return 'Obese';
        };

        const calculateBMR = (weight, height, age, gender) => {
            if (gender === 'male') {
                return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
            }
            return Math.round(10 * weight + 6.25 * height - 5 * age - 151);
        };

        const ACTIVITY_MULTIPLIERS = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        };
        
        const calculateTDEE = (bmr, activity_level) => {
            return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
        };

        const calculateFinalCalories = (tdee, goal) => {
            let finalCal;
            
            switch(goal) {
                case 'muscle_gain':
                    finalCal = tdee + 500;
                    break;
                case 'weight_loss':
                    finalCal = Math.max(tdee - 500, 1200);
                    break;
                default: // maintenance
                    finalCal = tdee;
            }
            
            return Math.round(finalCal);
        };
        
        const calculateMacronutrients = (finalCal, macroRatio) => {
            const ratios = {
                moderate_carb: { protein: 0.30, fats: 0.35, carbs: 0.35 },
                lower_carb: { protein: 0.40, fats: 0.40, carbs: 0.20 },
                higher_carb: { protein: 0.30, fats: 0.20, carbs: 0.50 }
            };
        
            const selectedRatio = ratios[macroRatio] || ratios.moderate_carb;
        
            return {
                protein: Math.round((finalCal * selectedRatio.protein) / 4),
                fats: Math.round((finalCal * selectedRatio.fats) / 9),
                carbs: Math.round((finalCal * selectedRatio.carbs) / 4)
            };
        };

        const bmi = calculateBMI(req.body.weight, req.body.height);
        const bmr = calculateBMR(req.body.weight, req.body.height, req.body.age, req.body.gender);
        const tdee = calculateTDEE(bmr, req.body.activity_level);
        const primaryGoal = req.body.health_goal.find(goal =>
            ['weight_loss', 'muscle_gain', 'maintenance'].includes(goal)) || 'maintenance';
        const finalCal = calculateFinalCalories(tdee, primaryGoal);
        const macronutrients = calculateMacronutrients(finalCal, req.body.macro_ratio);

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
                bmi_category: getBMICategory(bmi),
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