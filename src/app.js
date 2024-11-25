require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { helmetConfig, rateLimitConfig, authLimiter } = require('./middleware/security');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const ErrorCodes = require('./utils/errors/errorCodes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();

// Basic middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmetConfig);
app.use(rateLimitConfig);
app.use('/api/auth', authLimiter);
// Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Health
app.get('/health', async (req, res) => {
    try {
        // Cek koneksi database
        await supabase.from('users').select('count').limit(1);
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            environment: process.env.NODE_ENV,
            version: process.version
        };
        
        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Routes
app.use('/api/auth', authRoutes);

app.use(errorHandler);

// Testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to FitKitchen API' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});