const ErrorCodes = {
    // Autentikasi (1xxx)
    INVALID_CREDENTIALS: '1001',
    TOKEN_EXPIRED: '1002',
    TOKEN_INVALID: '1003',
    USER_NOT_FOUND: '1004',
    UNAUTHORIZED: '1005',
    SESSION_EXISTS: '1006',
    SESSION_INVALID: '1007',

    // Validasi (2xxx)
    VALIDATION_ERROR: '2001',
    INVALID_INPUT: '2002',
    MISSING_FIELD: '2003',
    INVALID_FORMAT: '2004',

    // Resource (3xxx)
    RESOURCE_NOT_FOUND: '3001',
    RESOURCE_EXISTS: '3002',
    RESOURCE_CONFLICT: '3003',

    // Database (4xxx)
    DB_ERROR: '4001',
    CONNECTION_ERROR: '4002',
    QUERY_ERROR: '4003',

    // Business Logic (5xxx)
    QUIZ_ALREADY_SUBMITTED: '5001',
    LESSON_LOCKED: '5002',
    PREREQUISITE_NOT_MET: '5003',

    // Server (9xxx)
    INTERNAL_SERVER_ERROR: '9001',
    SERVICE_UNAVAILABLE: '9002'
};

module.exports = ErrorCodes;