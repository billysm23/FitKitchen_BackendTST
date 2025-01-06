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
                default:
                    finalCal = tdee;
            }
            
            return Math.round(finalCal);
        };
        
        const calculateMacronutrients = (weight, height, goalType, bmiCategory, macroRatio, finalCal) => {
            let proteinPerKg;
            switch(goalType) {
                case 'muscle_gain':
                    proteinPerKg = 2.0;
                    break;
                case 'weight_loss':
                    proteinPerKg = 2.2;
                    break;
                default:
                    proteinPerKg = 1.6;
            }
            
            let adjustedWeight = weight;
            if (bmiCategory === 'Overweight' || bmiCategory === 'Obese') {
                const idealWeight = 48.0 + (2.7 * (height / 2.54 - 60));
                
                adjustedWeight = ((weight - idealWeight) * 0.25) + idealWeight;
            }

            const proteinGrams = Math.round(adjustedWeight * proteinPerKg);
            const proteinCals = proteinGrams * 4;
            const remainingCals = finalCal - proteinCals;

            const ratios = {
                moderate_carb: { carbs: 0.50, fats: 0.50 },
                lower_carb: { carbs: 0.25, fats: 0.75 },
                higher_carb: { carbs: 0.70, fats: 0.30 }
            };

            const selectedRatio = ratios[macroRatio] || ratios.moderate_carb;

            const carbCals = remainingCals * selectedRatio.carbs;
            const fatCals = remainingCals * selectedRatio.fats;

            const carbGrams = Math.max(130, Math.round(carbCals / 4));
            const fatGrams = Math.max(Math.round(weight * 0.5), Math.round(fatCals / 9));
        
            return {
                protein: proteinGrams,
                fats: fatGrams,
                carbs: carbGrams
            };
        };

        const bmi = calculateBMI(req.body.weight, req.body.height);
        const bmi_category = getBMICategory(bmi);
        const bmr = calculateBMR(req.body.weight, req.body.height, req.body.age, req.body.gender);
        const tdee = calculateTDEE(bmr, req.body.activity_level);
        const primaryGoal = ['weight_loss', 'muscle_gain', 'maintenance'].includes(req.body.health_goal)? req.body.health_goal : 'maintenance';
        const finalCal = calculateFinalCalories(tdee, primaryGoal);
        const macronutrients = calculateMacronutrients(req.body.weight, req.body.height, primaryGoal, bmi_category, req.body.macro_ratio, finalCal);

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