const User = require('../models/user');
const Session = require('../models/session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');
const asyncHandler = require('../utils/asyncHandler');

const JWT_EXPIRES_IN = '24h';

const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

exports.register = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Cek user yang sudah ada
    const existingUser = await User.findOne({
        email,
        username
    });

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

    // Buat user baru menggunakan method create dari model User
    const user = await User.create({
        username,
        email,
        password
    });

    // Generate token
    const token = generateToken(user.id, user.username);

    res.status(201).json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        }
    });
});

const SESSION_CONFIG = {
    MAX_ACTIVE_SESSIONS: 2,
    SESSION_EXPIRY: 24 * 60 * 60 * 1000 // 24 jam
};

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    try {
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

        // Handle active sessions
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
        // Cek apakah sudah ada session aktif
        const existingSession = await Session.findOne({
            userId: req.user.id,
            token: req.token,
            isActive: true
        });
        
        if (!existingSession) {
            throw new AppError(
                'User hasn\'t logged in. Please login first',
                400,
                ErrorCodes.SESSION_INVALID
            );
        }

        // Nonaktifkan session
        await Session.findOneAndUpdate(
            {
                id: existingSession.id
            },
            {
                isActive: false,
                logoutAt: new Date()
            }
        );

        res.json({
            success: true,
            message: 'Successfully logged out'
        });
    } catch (error) {
        console.error('Logout error:', {
            userId: req.user?.id,
            token: req.token,
            error: error.message
        });
        throw error;
    }
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Cari user dan validasi
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new AppError(
            'User not found',
            404,
            ErrorCodes.USER_NOT_FOUND
        );
    }

    // Update password menggunakan method dari model User
    const updatedUser = await User.updatePassword(user.id, currentPassword, newPassword);

    // Generate token baru
    const token = generateToken(updatedUser.id, updatedUser.username);

    console.info(`Password updated successfully for user: ${updatedUser.username}`);

    res.json({
        success: true,
        message: 'Password updated successfully',
        data: {
            token,
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                lastPasswordUpdate: updatedUser.password_changed_at
            }
        }
    });
});