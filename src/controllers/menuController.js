const Menu = require('../models/menu');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const supabase = require('../config/database');

// exports.getMenuDetails = asyncHandler(async (req, res, next) => {
//     try {
//         const { id } = req.params;

//         if (!id) {
//             throw new AppError(
//                 'Menu ID is required',
//                 400,
//                 ErrorCodes.MISSING_FIELD
//             );
//         }

//         const menu = await Menu.getMenuWithIngredients(id);
        
//         if (!menu) {
//             throw new AppError(
//                 'Menu not found',
//                 404,
//                 ErrorCodes.RESOURCE_NOT_FOUND
//             );
//         }

//         const allergens = await Menu.getAllergensInMenu(id);
        
//         const nutritionInfo = await Menu.getNutritionInfo(id);

//         res.status(200).json({
//             success: true,
//             data: {
//                 ...menu,
//                 allergens,
//                 nutritionInfo
//             }
//         });
//     } catch (error) {
//         console.error('Get menu details error:', error);
//         next(error);
//     }
// });

exports.getMenusByCategory = asyncHandler(async (req, res, next) => {
    try {
        const { category } = req.params;
        const { 
            minCalories, 
            maxCalories, 
            minProtein, 
            excludeAllergens,
            page = 1,
            limit = 10
        } = req.query;

        if (!category) {
            throw new AppError(
                'Category is required',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }

        const filters = {
            minCalories: minCalories ? Number(minCalories) : undefined,
            maxCalories: maxCalories ? Number(maxCalories) : undefined,
            minProtein: minProtein ? Number(minProtein) : undefined,
            excludeAllergens: excludeAllergens ? excludeAllergens.split(',') : undefined,
            page: Number(page),
            limit: Number(limit)
        };

        // Validate numeric values
        if (filters.minCalories && filters.minCalories < 0) {
            throw new AppError(
                'Minimum calories must be positive',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        if (filters.maxCalories && filters.maxCalories < filters.minCalories) {
            throw new AppError(
                'Maximum calories must be greater than minimum calories',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        const menus = await Menu.getMenusByCategory(category, filters);

        res.status(200).json({
            success: true,
            data: menus
        });
    } catch (error) {
        console.error('Get menus by category error:', error);
        next(error);
    }
});

exports.searchMenus = asyncHandler(async (req, res, next) => {
    try {
        const searchTerm = req.query.search || req.body.search;
        const {
            categoryId,
            minCalories,
            maxCalories
        } = req.query;

        const filters = {
            categoryId,
            minCalories: minCalories ? Number(minCalories) : undefined,
            maxCalories: maxCalories ? Number(maxCalories) : undefined
        };
        const result = await Menu.searchMenus(searchTerm, filters);

        res.status(200).json({
            success: true,
            data: result.data || []
        });

    } catch (error) {
        console.error('Search menus error:', error);
        next(error);
    }
});

// exports.getMenuNutrition = asyncHandler(async (req, res, next) => {
//     try {
//         const { id } = req.params;

//         if (!id) {
//             throw new AppError(
//                 'Menu ID is required',
//                 400,
//                 ErrorCodes.MISSING_FIELD
//             );
//         }

//         const nutritionInfo = await Menu.getNutritionInfo(id);

//         if (!nutritionInfo) {
//             throw new AppError(
//                 'Menu not found',
//                 404,
//                 ErrorCodes.RESOURCE_NOT_FOUND
//             );
//         }

//         res.status(200).json({
//             success: true,
//             data: nutritionInfo
//         });
//     } catch (error) {
//         console.error('Get menu nutrition error:', error);
//         next(error);
//     }
// });

exports.getRecommendedMenus = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { plan_type = 'single' } = req.query;

        // Validate plan type
        const validPlanTypes = ['single', 'half_day', 'full_day'];
        if (!validPlanTypes.includes(plan_type)) {
            throw new AppError(
                'Invalid plan type. Must be one of: single, half_day, full_day',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        // Fetch health profile
        const { data: healthProfile, error: healthError } = await supabase
            .from('health_assessments')
            .select(`
                metrics,
                health_history,
                activity_level,
                health_goal,
                macro_ratio
            `)
            .eq('user_id', userId)
            .single();

        if (healthError || !healthProfile) {
            throw new AppError(
                'Health assessment not found. Please complete your health assessment first',
                404,
                ErrorCodes.RESOURCE_NOT_FOUND
            );
        }

        const planConfigs = {
            single: {
                minMenus: 1,
                maxMenus: 1,
                calorieRatio: 0.3,
                maxTotalCalories: 600
            },
            half_day: {
                minMenus: 1,
                maxMenus: 4,
                calorieRatio: 0.5,
                maxTotalCalories: healthProfile.metrics.final_cal * 0.5
            },
            full_day: {
                minMenus: 2,
                maxMenus: 8,
                calorieRatio: 0.9,
                maxTotalCalories: healthProfile.metrics.final_cal * 0.9
            }
        };

        const selectedPlan = planConfigs[plan_type];

        const { data: allMenus, error: menuError } = await supabase
            .from('menu')
            .select(`
                id,
                name,
                description,
                image_url,
                calories_per_serving,
                protein_per_serving,
                carbs_per_serving,
                fats_per_serving,
                serving_size,
                preparation_time,
                menu_categories (
                    id,
                    name
                ),
                menu_ingredients (
                    ingredients (
                        id,
                        name,
                        is_allergen,
                        allergen_type
                    )
                )
            `)
            .eq('is_active', true);

        if (menuError) {
            throw new AppError(
                'Failed to fetch menus',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Filter based on allergies
        const userAllergies = healthProfile.health_history?.allergies || [];
        let filteredMenus = allMenus;

        if (userAllergies.length > 0) {
            filteredMenus = allMenus.filter(menu => {
                const menuAllergens = menu.menu_ingredients
                    .filter(mi => mi.ingredients.is_allergen)
                    .map(mi => mi.ingredients.allergen_type);
                
                return !menuAllergens.some(allergen => 
                    userAllergies.includes(allergen)
                );
            });
        }

        // Calculate score
        const scoredMenus = filteredMenus.map(menu => {
            const score = calculateMenuScore(menu, healthProfile);
            return {
                ...menu,
                score
            };
        });

        scoredMenus.sort((a, b) => a.score - b.score);

        res.status(200).json({
            success: true,
            data: {
                plan_type,
                recommendations: scoredMenus,
                planDetails: {
                    minMenus: selectedPlan.minMenus,
                    maxMenus: selectedPlan.maxMenus,
                    maxTotalCalories: selectedPlan.maxTotalCalories,
                    calorieRatio: selectedPlan.calorieRatio
                },
                targetNutrition: {
                    dailyCalories: healthProfile.metrics.final_cal,
                    planCalories: selectedPlan.maxTotalCalories,
                    macros: {
                        protein: Math.round(healthProfile.metrics.macronutrients.protein * selectedPlan.calorieRatio),
                        carbs: Math.round(healthProfile.metrics.macronutrients.carbs * selectedPlan.calorieRatio),
                        fats: Math.round(healthProfile.metrics.macronutrients.fats * selectedPlan.calorieRatio)
                    }
                },
                filters: {
                    excludedAllergens: userAllergies
                }
            }
        });

    } catch (error) {
        console.error('Error in getRecommendedMenus:', error);
        next(error);
    }
});

function calculateMenuScore(menu, healthProfile) {
    const macroTargets = healthProfile.metrics.macronutrients;
    const mealRatio = 0.3;
    
    const proteinDiff = Math.abs(menu.protein_per_serving - (macroTargets.protein * mealRatio));
    const carbsDiff = Math.abs(menu.carbs_per_serving - (macroTargets.carbs * mealRatio));
    const fatsDiff = Math.abs(menu.fats_per_serving - (macroTargets.fats * mealRatio));

    // Weight factors (based on importance)
    const weights = {
        protein: 1.2,
        carbs: 0.7,
        fats: 1.0
    };

    // weighted score (lower is better)
    return (
        (proteinDiff * weights.protein) +
        (carbsDiff * weights.carbs) +
        (fatsDiff * weights.fats)
    );
}

exports.validateMenuSelection = asyncHandler(async (req, res, next) => {
    try {
        const { menuIds, plan_type } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
            throw new AppError(
                'Valid menu selection is required',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        const validPlanTypes = ['single', 'half_day', 'full_day'];
        if (!validPlanTypes.includes(plan_type)) {
            throw new AppError(
                'Invalid plan type. Must be one of: single, half_day, full_day',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        const planConfigs = {
            single: {
                minMenus: 1,
                maxMenus: 1,
                calorieRatio: 0.3
            },
            half_day: {
                minMenus: 1,
                maxMenus: 4,
                calorieRatio: 0.5
            },
            full_day: {
                minMenus: 2,
                maxMenus: 8,
                calorieRatio: 0.9
            }
        };

        const selectedPlan = planConfigs[plan_type];

        if (menuIds.length < selectedPlan.minMenus) {
            throw new AppError(
                `${plan_type} plan requires at least ${selectedPlan.minMenus} menu selection(s)`,
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        if (plan_type === 'single' && menuIds.length > selectedPlan.maxMenus) {
            throw new AppError(
                'Single meal plan can only have one menu selection',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const { data: healthProfile, error: healthError } = await supabase
            .from('health_assessments')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (healthError || !healthProfile) {
            throw new AppError(
                'Health profile not found. Please complete health assessment first',
                404,
                ErrorCodes.RESOURCE_NOT_FOUND
            );
        }

        const { data: selectedMenus, error: menuError } = await supabase
            .from('menu')
            .select(`
                id,
                name,
                calories_per_serving,
                protein_per_serving,
                carbs_per_serving,
                fats_per_serving,
                menu_ingredients (
                    ingredients (
                        is_allergen,
                        allergen_type
                    )
                )
            `)
            .in('id', menuIds);

        if (menuError || !selectedMenus) {
            throw new AppError(
                'Error fetching selected menus',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        const userAllergies = healthProfile.health_history?.allergies || [];
        const allergensCheck = selectedMenus.every(menu => {
            const menuAllergens = menu.menu_ingredients
                .filter(mi => mi.ingredients.is_allergen)
                .map(mi => mi.ingredients.allergen_type);
            
            return !menuAllergens.some(allergen => 
                userAllergies.includes(allergen)
            );
        });

        if (!allergensCheck) {
            throw new AppError(
                'Selected menu contains allergens that match your profile',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const totalNutrition = selectedMenus.reduce((acc, menu) => ({
            calories: acc.calories + menu.calories_per_serving,
            protein: acc.protein + menu.protein_per_serving,
            carbs: acc.carbs + menu.carbs_per_serving,
            fats: acc.fats + menu.fats_per_serving
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const macroTargets = healthProfile.metrics.macronutrients;
        const dailyCalories = healthProfile.metrics.final_cal;
        const targetCalories = dailyCalories * selectedPlan.calorieRatio;

        const weights = {
            protein: 1.2,
            carbs: 0.7,
            fats: 1.0
        };

        const proteinDiff = Math.abs(totalNutrition.protein - (macroTargets.protein * selectedPlan.calorieRatio));
        const carbsDiff = Math.abs(totalNutrition.carbs - (macroTargets.carbs * selectedPlan.calorieRatio));
        const fatsDiff = Math.abs(totalNutrition.fats - (macroTargets.fats * selectedPlan.calorieRatio));

        const nutritionScore = (
            (proteinDiff * weights.protein) +
            (carbsDiff * weights.carbs) +
            (fatsDiff * weights.fats)
        );

        let isValid = true;
        let validationMessage = '';

        if (plan_type !== 'single') {
            const calorieDeviation = Math.abs(totalNutrition.calories - targetCalories) / targetCalories;
            
            if (calorieDeviation > 0.2) {  // Tolerance 20%
                isValid = false;
                validationMessage = `Total calories (${totalNutrition.calories}) are too far from target (${Math.round(targetCalories)})`;
            }
        }

        // Validate score
        const SCORE_THRESHOLD = 50;
        if (nutritionScore > SCORE_THRESHOLD && plan_type !== 'single') {
            isValid = false;
            validationMessage = validationMessage || 'Nutritional balance needs improvement';
        }

        res.status(200).json({
            success: true,
            data: {
                isValid,
                validationDetails: {
                    nutritionScore,
                    scoreThreshold: SCORE_THRESHOLD,
                    message: validationMessage
                },
                totalNutrition,
                targetNutrition: {
                    calories: targetCalories,
                    protein: macroTargets.protein * selectedPlan.calorieRatio,
                    carbs: macroTargets.carbs * selectedPlan.calorieRatio,
                    fats: macroTargets.fats * selectedPlan.calorieRatio
                },
                planDetails: {
                    plan_type,
                    minMenus: selectedPlan.minMenus,
                    maxMenus: selectedPlan.maxMenus,
                    calorieRatio: selectedPlan.calorieRatio
                },
                recommendations: isValid
                    ? 'Selected meals are suitable for your nutritional needs'
                    : `Improvement needed: ${validationMessage}`
            }
        });

    } catch (error) {
        console.error('Validate menu selection error:', error);
        next(error);
    }
});