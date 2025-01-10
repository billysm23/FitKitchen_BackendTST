const supabase = require('../config/database');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');

class Menu {
    static async getMenuWithIngredients(menuId) {
        try {
            const { data: menu, error } = await supabase
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
                        name,
                        description
                    ),
                    menu_ingredients (
                        amount,
                        unit,
                        ingredients (
                            id,
                            name,
                            calories_per_100g,
                            protein_per_100g,
                            carbs_per_100g,
                            fats_per_100g,
                            is_allergen,
                            allergen_type,
                            unit
                        )
                    )
                `)
                .eq('id', menuId)
                .single();

            if (error) {
                throw new AppError(
                    'Failed to fetch menu details',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return menu;
        } catch (error) {
            console.error('Get menu error:', error);
            throw error;
        }
    }

    static async getAllergensInMenu(menuId) {
        try {
            const { data: allergens, error } = await supabase
                .from('menu_ingredients')
                .select(`
                    amount,
                    unit,
                    ingredients!inner (
                        id,
                        name,
                        allergen_type
                    )
                `)
                .eq('menu_id', menuId)
                .eq('ingredients.is_allergen', true);

            if (error) {
                throw new AppError(
                    'Failed to fetch menu allergens',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return allergens.map(item => ({
                ingredientId: item.ingredients.id,
                name: item.ingredients.name,
                allergenType: item.ingredients.allergen_type,
                amount: item.amount,
                unit: item.unit
            }));
        } catch (error) {
            console.error('Get allergens error:', error);
            throw error;
        }
    }

    static async getMenusByCategory(categoryName, filters = {}) {
        try {
            let query = supabase
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
                    menu_categories!inner (
                        id,
                        name
                    ),
                    menu_ingredients (
                        amount,
                        unit,
                        ingredients (
                            id,
                            name,
                            is_allergen,
                            allergen_type
                        )
                    )
                `)
                .eq('is_active', true)
                .eq('menu_categories.name', categoryName);

            // Terapkan filter
            if (filters.minCalories) {
                query = query.gte('calories_per_serving', filters.minCalories);
            }
            if (filters.maxCalories) {
                query = query.lte('calories_per_serving', filters.maxCalories);
            }
            if (filters.minProtein) {
                query = query.gte('protein_per_serving', filters.minProtein);
            }

            if (filters.page && filters.limit) {
                const from = (filters.page - 1) * filters.limit;
                const to = from + filters.limit - 1;
                query = query.range(from, to);
            }

            const { data: menus, error } = await query;

            if (error) {
                throw new AppError(
                    'Failed to fetch menus by category',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
                return menus.filter(menu => {
                    const menuAllergens = menu.menu_ingredients
                        .filter(mi => mi.ingredients.is_allergen)
                        .map(mi => mi.ingredients.allergen_type);
                    
                    return !menuAllergens.some(allergen => 
                        filters.excludeAllergens.includes(allergen)
                    );
                });
            }

            return menus;
        } catch (error) {
            console.error('Get menus by category error:', error);
            throw error;
        }
    }

    static async searchMenus(searchTerm, filters = {}) {
        try {
            let query = supabase
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
                    created_at,
                    updated_at,
                    menu_categories:category_id (
                        id,
                        name,
                        description
                    )
                `, { count: 'exact' })
                .eq('is_active', true);
    
            if (searchTerm?.trim()) {
                const sanitizedSearch = searchTerm.trim().toLowerCase();
                query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
            }
            if (filters.categoryId) {
                query = query.eq('category_id', filters.categoryId);
            }

            if (Number.isFinite(filters.minCalories) && filters.minCalories > 0) {
                query = query.gte('calories_per_serving', filters.minCalories);
            }
            if (Number.isFinite(filters.maxCalories) && filters.maxCalories > 0) {
                query = query.lte('calories_per_serving', filters.maxCalories);
            }
    
            const { data: menus, error, count } = await query;
    
            if (error) {
                throw new AppError('Failed to search menus', 500, ErrorCodes.DATABASE_ERROR);
            }
    
            return {
                data: menus || []
            };
        } catch (error) {
            console.error('Search menus error:', error);
            throw error;
        }
    }
    
    static async getNutritionInfo(menuId) {
        try {
            const { data: menu, error } = await supabase
                .from('menu')
                .select(`
                    calories_per_serving,
                    protein_per_serving,
                    carbs_per_serving,
                    fats_per_serving,
                    serving_size,
                    menu_ingredients (
                        amount,
                        unit,
                        ingredients (
                            name,
                            calories_per_100g,
                            protein_per_100g,
                            carbs_per_100g,
                            fats_per_100g
                        )
                    )
                `)
                .eq('id', menuId)
                .single();

            if (error) {
                throw new AppError(
                    'Failed to fetch menu nutrition info',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            const ingredientsBreakdown = menu.menu_ingredients.map(mi => {
                const ingredient = mi.ingredients;
                const amount = mi.amount;
                const ratio = amount / 100; // base per 100g

                return {
                    ingredient: ingredient.name,
                    amount: amount,
                    unit: mi.unit,
                    contribution: {
                        calories: Math.round(ingredient.calories_per_100g * ratio),
                        protein: +(ingredient.protein_per_100g * ratio).toFixed(2),
                        carbs: +(ingredient.carbs_per_100g * ratio).toFixed(2),
                        fats: +(ingredient.fats_per_100g * ratio).toFixed(2)
                    }
                };
            });

            return {
                per_serving: {
                    calories: menu.calories_per_serving,
                    protein: menu.protein_per_serving,
                    carbs: menu.carbs_per_serving,
                    fats: menu.fats_per_serving,
                    serving_size: menu.serving_size
                },
                ingredients_breakdown: ingredientsBreakdown
            };
        } catch (error) {
            console.error('Get nutrition info error:', error);
            throw error;
        }
    }
}

module.exports = Menu;