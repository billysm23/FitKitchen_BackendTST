const AppError = require('./errors/AppError');
const ErrorCodes = require('./errors/errorCodes');

const validator = {
    validateEmail: (email) => {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email) {
            throw new AppError('Email is required', 400, ErrorCodes.MISSING_FIELD);
        }
        if (!emailRegex.test(email)) {
            throw new AppError(
                'Invalid email format. Please use a valid email address (e.g., user@domain.com)',
                400,
                ErrorCodes.INVALID_FORMAT
            );
        }
        return true;
    },

    validateUsername: (username) => {
        if (!username) {
            throw new AppError('Username is required', 400, ErrorCodes.MISSING_FIELD);
        }
        if (username.length < 6 || username.length > 30) {
            throw new AppError(
                'Username must be between 6 and 30 characters',
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }
        const usernameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!usernameRegex.test(username)) {
            throw new AppError(
                'Username can only contain letters, numbers, dots, underscores, and hyphens',
                400,
                ErrorCodes.INVALID_FORMAT
            );
        }
        return true;
    },

    validatePassword: (password, fieldName = 'Password') => {
        if (!password) {
            throw new AppError(
                `${fieldName} is required`,
                400,
                ErrorCodes.MISSING_FIELD
            );
        }
        if (password.length < 6) {
            throw new AppError(
                `${fieldName} must be at least 6 characters long`,
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            throw new AppError(
                `${fieldName} must contain at least one uppercase letter, one lowercase letter, one number and one special character`,
                400,
                ErrorCodes.VALIDATION_ERROR
            );
        }
        return true;
    }
};

module.exports = validator;