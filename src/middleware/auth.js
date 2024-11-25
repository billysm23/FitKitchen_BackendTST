// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Session = require('../models/session');
const AppError = require('../utils/errors/AppError');
const ErrorCodes = require('../utils/errors/errorCodes');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
        }

        // Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Cek session aktif
        const session = await Session.findOne({ 
            userId: decoded.userId,
            token,
            isActive: true
        });
        
        if (!session) {
            throw new AppError('Session expired or invalid', 401, ErrorCodes.SESSION_INVALID);
        }

        // Cari user
        const userData = await User.findById(decoded.userId);
        
        // Bukan user terdaftar
        if (!userData) {
            throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
        }
        
        req.user = userData;
        req.token = token;
        req.session = session;
        
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = auth;