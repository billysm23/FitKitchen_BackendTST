const swaggerJsdoc = require('swagger-jsdoc');

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
                url: 'http://localhost:5000'|| 'https://fit-kitchen-backend-tst.vercel.app/',
                description: '  ',
            },
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
module.exports = specs;