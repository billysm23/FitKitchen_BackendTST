const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');

class MealPlan {
    static PLAN_CONFIGS = {
        single: {
            description: 'Single meal plan',
            duration: 1
        },
        half_day: {
            description: 'Half-day meal plan',
            duration: 1
        },
        full_day: {
            description: 'Full-day meal plan',
            duration: 1
        }
    };

    static async createPlan(userId, planType, menuIds, nutritionSummary) {
        try {
            if (!this.PLAN_CONFIGS[planType]) {
                throw new AppError(
                    'Invalid plan type',
                    400,
                    ErrorCodes.INVALID_INPUT
                );
            }

            const planConfig = this.PLAN_CONFIGS[planType];
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + planConfig.duration);

            // create meal plan
            const { data: newPlan, error: createError } = await supabase
                .from('meal_plans')
                .insert([{
                    user_id: userId,
                    plan_type: planType,
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active',
                    total_calories: nutritionSummary.calories,
                    total_protein: nutritionSummary.protein,
                    total_carbs: nutritionSummary.carbs,
                    total_fats: nutritionSummary.fats,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (createError) {
                throw new AppError(
                    'Failed to create meal plan',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            // Add menu to meal plan
            const planMenus = menuIds.map(menuId => ({
                meal_plan_id: newPlan.id,
                menu_id: menuId,
                created_at: new Date().toISOString()
            }));

            const { error: menuError } = await supabase
                .from('meal_plan_menus')
                .insert(planMenus);

            if (menuError) {
                throw new AppError(
                    'Failed to add menus to meal plan',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return newPlan;

        } catch (error) {
            console.error('Create meal plan error:', error);
            throw error;
        }
    }

    static async getActivePlans(userId) {
        try {
            const { data: plans, error } = await supabase
                .from('meal_plans')
                .select(`
                    *,
                    meal_plan_menus (
                        menu:menu_id (*)
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                throw new AppError(
                    'Failed to fetch meal plans',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return plans;

        } catch (error) {
            console.error('Get active plans error:', error);
            throw error;
        }
    }

    static async updatePlanStatus(planId, userId, status) {
        try {
            const validStatuses = ['active', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new AppError(
                    'Invalid status',
                    400,
                    ErrorCodes.INVALID_INPUT
                );
            }

            const { data, error } = await supabase
                .from('meal_plans')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', planId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                throw new AppError(
                    'Failed to update meal plan status',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return data;

        } catch (error) {
            console.error('Update plan status error:', error);
            throw error;
        }
    }

    static async getPlanHistory(userId, options = {}) {
        try {
            const {
                status,
                limit: rawLimit,
                offset: rawOffset
            } = options;
    
            const limit = rawLimit || 10;
            const offset = rawOffset || 0;
    
            if (limit < 1 || limit > 100) {
                throw new AppError(
                    'Limit must be between 1 and 100',
                    400,
                    ErrorCodes.INVALID_INPUT
                );
            }
    
            if (offset < 0) {
                throw new AppError(
                    'Offset cannot be negative',
                    400,
                    ErrorCodes.INVALID_INPUT
                );
            }
        
            let query = supabase
                .from('meal_plans')
                .select(`
                    *,
                    meal_plan_menus (
                        menu:menu_id (
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
                            )
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
    
            // Filter status if provided
            if (status) {
                const validStatuses = ['active', 'completed', 'cancelled'];
                if (!validStatuses.includes(status)) {
                    throw new AppError(
                        'Invalid status filter',
                        400,
                        ErrorCodes.INVALID_INPUT
                    );
                }
                query = query.eq('status', status);
            }
    
            query = query.range(offset, offset + limit - 1);
    
            const { data, error, count } = await query;
    
            if (error) {
                throw new AppError(
                    'Failed to fetch meal plan history',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }
    
            const transformedData = data.map(plan => {
                const menuNutrition = plan.meal_plan_menus.reduce((acc, item) => ({
                    calories: acc.calories + (item.menu?.calories_per_serving || 0),
                    protein: acc.protein + (item.menu?.protein_per_serving || 0),
                    carbs: acc.carbs + (item.menu?.carbs_per_serving || 0),
                    fats: acc.fats + (item.menu?.fats_per_serving || 0)
                }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
                return {
                    id: plan.id,
                    plan_type: plan.plan_type,
                    status: plan.status,
                    start_date: plan.start_date,
                    end_date: plan.end_date,
                    nutrition_summary: {
                        planned: {
                            calories: plan.total_calories,
                            protein: plan.total_protein,
                            carbs: plan.total_carbs,
                            fats: plan.total_fats
                        },
                        actual: menuNutrition
                    },
                    menus: plan.meal_plan_menus.map(item => ({
                        ...item.menu,
                        category: item.menu?.menu_categories
                    })),
                    created_at: plan.created_at,
                    updated_at: plan.updated_at
                };
            });
    
            return {
                data: transformedData
            };
    
        } catch (error) {
            console.error('Get plan history error:', error);
            throw error;
        }
    }
}

module.exports = MealPlan;