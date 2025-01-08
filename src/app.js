require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { helmetConfig, rateLimitConfig, authLimiter } = require('./middleware/security');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const ErrorCodes = require('./utils/errors/errorCodes');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const healthAssessmentRoutes = require('./routes/healthAssessmentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const menuRoutes = require('./routes/menuRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');

const app = express();

// Basic middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const allowedOrigins = [
    'https://fit-kitchen-frontend-tst.vercel.app',
    'https://fit-kitchen-backend-tst.vercel.app',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmetConfig);
app.use(rateLimitConfig);
app.use('/api/auth', authLimiter);

// Documentation
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'FitKitchen API Documentation',
            version: '1.0.0',
            description: 'API documentation for FitKitchen - personalized catering system',
            contact: {
                name: 'Billy Samuel Setiawan',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local Development Server'
            },
            {
                url: 'https://fit-kitchen-backend-tst.vercel.app',
                description: 'Production Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ['./src/routes/*.js', './src/models/*.js'],
};

const specs = swaggerJsdoc(options);

// Konfigurasi Swagger UI dengan opsi tambahan
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "FitKitchen API Documentation",
    swaggerOptions: {
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
    }
}));

// Health
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', healthAssessmentRoutes);
app.use('/api', profileRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/meal-plan', mealPlanRoutes);

app.use(errorHandler);

// Testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to FitKitchen API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥');
    console.error(err.name, err.message);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥');
    console.error(err.name, err.message);
    process.exit(1);
});