const AppError = require("./AppError");

class AppErrorMealPlan extends AppError {
    constructor(message, statusCode, errorCode, data) {
        super(message, statusCode, errorCode);
        this.data = data;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppErrorMealPlan;