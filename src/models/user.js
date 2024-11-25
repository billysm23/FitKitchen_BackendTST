const supabase = require('../config/database');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');

class User {
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // User not found
                }
                throw new AppError(
                    'Database error while finding user',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return data;
        } catch (error) {
            console.error('Find by email error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // User not found
                }
                throw new AppError(
                    'Database error while finding user',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return data;
        } catch (error) {
            console.error('Find by id error:', error);
            throw error;
        }
    }

    static async findOne(query) {
        try {
            let queryBuilder = supabase
                .from('users')
                .select('*');

            if (query.email) {
                queryBuilder = queryBuilder.eq('email', query.email);
            }
            if (query.username) {
                queryBuilder = queryBuilder.eq('username', query.username);
            }

            const { data, error } = await queryBuilder.single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new AppError(
                    'Database error while finding user',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return data;
        } catch (error) {
            console.error('Find one error:', error);
            throw error;
        }
    }

    static async create(userData) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const { data: existingUser } = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new AppError(
                    'User with this email already exists',
                    409,
                    ErrorCodes.RESOURCE_EXISTS
                );
            }

            const { data, error } = await supabase
                .from('users')
                .insert([{
                    username: userData.username,
                    email: userData.email,
                    password: hashedPassword,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                throw new AppError(
                    'Failed to create user',
                    500,
                    ErrorCodes.DATABASE_ERROR
                );
            }

            return data;
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    static async comparePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;