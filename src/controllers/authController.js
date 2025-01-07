const User = require('../models/user');
const Session = require('../models/session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../utils/validator');
const supabase = require('../config/database');

const JWT_EXPIRES_IN = '24h';
const SESSION_CONFIG = {
    MAX_ACTIVE_SESSIONS: 2,
    SESSION_EXPIRY: 24 * 60 * 60 * 1000 // 24 jam
};

const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

exports.register = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        validator.validateUsername(username);
        validator.validateEmail(email);
        
        // Check existing user
        const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('email, username')
        .or(`email.eq.${email},username.eq.${username}`)
        .single();
        
        if (searchError && searchError.code !== 'PGRST116') {
            throw new AppError(
                'Error checking existing user',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }
        
        if (existingUser) {
            let message = 'User already exists with this ';
            if (existingUser.email === email && existingUser.username === username) {
                message += 'email and username';
            } else if (existingUser.email === email) {
                message += 'email';
            } else {
                message += 'username';
            }
            throw new AppError(message, 409, ErrorCodes.RESOURCE_EXISTS);
        }
        
        validator.validatePassword(password);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email,
                    password: hashedPassword,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select('id, username, email')
            .single();

        if (insertError) {
            console.error('User creation error:', insertError);
            throw new AppError(
                'Failed to create user',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Generate token
        const token = generateToken(newUser.id, newUser.username);

        // Create session
        const { error: sessionError } = await supabase
            .from('sessions')
            .insert([
                {
                    user_id: newUser.id,
                    token,
                    is_active: true,
                    expires_at: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY).toISOString() // 24 hours
                }
            ]);

        if (sessionError) {
            console.error('Session creation error:', sessionError);
        }

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    try {
        validator.validateEmail(email);
        validator.validatePassword(password);

        // Find user
        const user = await User.findByEmail(email);
        
        // Check if user exists
        if (!user) {
            throw new AppError(
                'No user found with this email',
                404,
                ErrorCodes.USER_NOT_FOUND
            );
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError(
                'Invalid password',
                401,
                ErrorCodes.INVALID_CREDENTIALS
            );
        }

        // Generate token
        const token = generateToken(user.id, user.username);

        // Check active sessions
        const { data: activeSessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true);

        // Nonactive sessions (exceed time limit)
        if (activeSessions && activeSessions.length >= SESSION_CONFIG.MAX_ACTIVE_SESSIONS) {
            await supabase
                .from('sessions')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('is_active', true);
        }

        // Create new session
        const { error: sessionError } = await supabase
            .from('sessions')
            .insert([{
                user_id: user.id,
                token,
                is_active: true,
                expires_at: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY).toISOString()
            }]);

        if (sessionError) {
            throw new AppError(
                'Failed to create session',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            data: {
                token,
                user: userWithoutPassword
            }
        });
    } catch (error) {
        next(error);
    }
});

exports.logout = asyncHandler(async (req, res, next) => {
    try {
        // Take token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new AppError(
                'Authentication token is required',
                401,
                ErrorCodes.UNAUTHORIZED
            );
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            throw new AppError(
                'Invalid token',
                401,
                ErrorCodes.TOKEN_INVALID
            );
        }

        if (!decoded.userId) {
            throw new AppError(
                'Invalid token structure',
                401,
                ErrorCodes.TOKEN_INVALID
            );
        }

        const deactivatedSession = await Session.deactivateSession(decoded.userId, token);

        if (!deactivatedSession) {
            throw new AppError(
                'No active session found',
                400,
                ErrorCodes.SESSION_INVALID
            );
        }

        res.status(200).json({
            success: true,
            message: 'Successfully logged out'
        });
    } catch (error) {
        console.error('Logout error:', {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        next(error);
    }
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            throw new AppError(
                'Current password and new password are required',
                400,
                ErrorCodes.MISSING_FIELD
            );
        }
        
        if (currentPassword === newPassword) {
            throw new AppError(
                'New password must be different from current password',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }
        
        if (confirmPassword !== newPassword) {
            throw new AppError(
                'Confirm password must be same as new password',
                400,
                ErrorCodes.INVALID_INPUT
            );
        }

        validator.validatePassword(newPassword);

        // Search user data
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (fetchError) {
            console.error('Fetch user error:', fetchError);
            throw new AppError(
                'Error fetching user data',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
        if (!isPasswordValid) {
            throw new AppError(
                'Current password is incorrect',
                401,
                ErrorCodes.INVALID_CREDENTIALS
            );
        }

        // Hash newPassword
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('id, username, email')
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            throw new AppError(
                'Failed to update password',
                500,
                ErrorCodes.DATABASE_ERROR
            );
        }

        if (!updatedUser) {
            console.error('No user was updated');
            throw new AppError(
                'User not found or update failed',
                404,
                ErrorCodes.USER_NOT_FOUND
            );
        }

        // Create new token and deactivate session
        const token = jwt.sign(
            {
                userId: updatedUser.id,
                username: updatedUser.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await supabase
            .from('sessions')
            .update({ is_active: false })
            .eq('user_id', updatedUser.id)
            .eq('is_active', true);
        
        // mungkin dibuang
        await supabase
            .from('sessions')
            .insert({
                user_id: updatedUser.id,
                token,
                is_active: true,
                expires_at: new Date(Date.now() + SESSION_CONFIG.SESSION_EXPIRY).toISOString()
            });

        res.json({
            success: true,
            message: 'Password updated successfully, please login again',
            data: {
                token,
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    email: updatedUser.email
                }
            }
        });

    } catch (error) {
        console.error('Password update error:', {
            message: error.message,
            details: error.details || 'No additional details'
        });
        next(error);
    }
});