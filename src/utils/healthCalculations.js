const healthCalculations = {
    calculateBMI: (weight, height) => {
        const heightInMeters = height / 100;
        return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
    },
    
    getBMICategory: (bmi) => {
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    },

    calculateBMR: (weight, height, age, gender) => {
        if (gender === 'male') {
            return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
        }
        return Math.round(10 * weight + 6.25 * height - 5 * age - 151);
    },
    
    calculateTDEE: (bmr, activity_level) => {
        const ACTIVITY_MULTIPLIERS = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        };
        return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
    },

    calculateFinalCalories: (tdee, goal) => {
        let finalCal;
        
        switch(goal) {
            case 'muscle_gain':
                finalCal = tdee + 500;
                break;
            case 'fat_loss':
                finalCal = Math.max(tdee - 500, 1200);
                break;
            default:
                finalCal = tdee;
        }
        
        return Math.round(finalCal);
    },
    
    calculateMacronutrients: (weight, height, goalType, bmiCategory, macroRatio, finalCal) => {
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
    }
};

module.exports = healthCalculations;