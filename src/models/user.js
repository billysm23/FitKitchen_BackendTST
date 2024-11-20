const supabase = require('../config/database');
const bcrypt = require('bcryptjs');
const { validateEmail, validateUsername, validatePassword } = require('../utils/validator');

class User {
    static async findByEmail(email) {
        validateEmail(email);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw error;
        return data;
    }

    static async findById(id) {
        if (!id) throw new AppError('User ID is required', 400, ErrorCodes.MISSING_FIELD);
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async findOne(query) {
        if (query.email) validateEmail(query.email);
        if (query.username) validateUsername(query.username);

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${query.email},username.eq.${query.username}`)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async create(userData) {
        // Validasi input register
        validateEmail(userData.email);
        validateUsername(userData.username);
        validatePassword(userData.password);

        // Cek user sudah ada atau belum
        const existingUser = await this.findOne({
            email: userData.email,
            username: userData.username
        });

        if (existingUser) {
            let message = 'User already exists with this ';
            if (existingUser.email === userData.email && existingUser.username === userData.username) {
                message += 'email and username';
            } else if (existingUser.email === userData.email) {
                message += 'email';
            } else {
                message += 'username';
            }
            throw new AppError(message, 409, ErrorCodes.RESOURCE_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const { data, error } = await supabase
            .from('users')
            .insert([{
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                created_at: new Date(),
                updated_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updatePassword(userId, currentPassword, newPassword) {
        validatePassword(currentPassword, 'Current password');
        validatePassword(newPassword, 'New password');

        if (currentPassword === newPassword) {
            throw new AppError(
                'New password must be different from current password',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }

        const user = await this.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
        }

        // Verifikasi password lama
        const isCorrectPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isCorrectPassword) {
            throw new AppError(
                'Current password is incorrect',
                401,
                ErrorCodes.INVALID_CREDENTIALS
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const { data, error } = await supabase
            .from('users')
            .update({ 
                password: hashedPassword,
                password_changed_at: new Date(),
                updated_at: new Date()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;