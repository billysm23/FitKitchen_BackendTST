/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         username:
 *           type: string
 *           minLength: 6
 *           maxLength: 30
 *           description: User's username (6-30 characters, alphanumeric with dots, underscores, and hyphens)
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User's password (min 6 chars, must contain uppercase, lowercase, number, special char)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the user was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the user was last updated
 *       example:
 *         username: johndoe123
 *         email: john@example.com
 *         password: Password123!
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "1005"
 *             status:
 *               type: string
 *               example: "fail"
 *             message:
 *               type: string
 *               example: "Authentication required"
 *             details:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 status:
 *                   type: string
 *                   example: "fail"
 *                 errorCode:
 *                   type: string
 *                   example: "1005"
 *                 isOperational:
 *                   type: boolean
 *                   example: true
 * 
 *     LoginCredentials:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's registered email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *       example:
 *         email: john@example.com
 *         password: Password123!
 * 
 *     PasswordUpdate:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           description: User's current password
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: New password (min 6 chars, must contain uppercase, lowercase, number, special char)
 *       example:
 *         currentPassword: OldPassword123!
 *         newPassword: NewPassword456@
 * 
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the operation was successful
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT token for authentication
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: User's unique identifier
 *                 username:
 *                   type: string
 *                   description: User's username
 *                 email:
 *                   type: string
 *                   description: User's email address
 *       example:
 *         success: true
 *         data:
 *           token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           user:
 *             id: "123e4567-e89b-12d3-a456-426614174000"
 *             username: "johndoe123"
 *             email: "john@example.com"
 * 
 *   securitySchemes:
 *     bearerToken:
 *       type: apiKey
 *       name: Authorization
 *       in: header
 *       description: Enter your authentication token
 * 
 *   parameters:
 *     authToken:
 *       in: header
 *       name: Authorization
 *       required: true
 *       schema:
 *         type: string
 *       description: Authentication token (without Bearer prefix)
 *       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Authentication token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               error:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: UNAUTHORIZED
 *                   message:
 *                     type: string
 *                     example: Authentication token is missing or invalid
 * 
 * paths:
 *   /api/auth/register:
 *     post:
 *       tags: [Authentication]
 *       summary: Register a new user
 *       description: Creates a new user account with the provided credentials
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       responses:
 *         201:
 *           description: User successfully registered
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   data:
 *                     type: object
 *                     properties:
 *                       token:
 *                         type: string
 *                         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "123e4567-e89b-12d3-a456-426614174000"
 *                           username:
 *                             type: string
 *                             example: "johndoe123"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *         400:
 *           description: Invalid input data
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: false
 *                   error:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "2001"
 *                       status:
 *                         type: string
 *                         example: "fail"
 *                       message:
 *                         type: string
 *                         example: "Validation failed. Username must be between 6 and 30 characters"
 *                       details:
 *                         type: object
 *                         properties:
 *                           statusCode:
 *                             type: integer
 *                             example: 400
 *                           status:
 *                             type: string
 *                             example: "fail"
 *                           errorCode:
 *                             type: string
 *                             example: "2001"
 *                           isOperational:
 *                             type: boolean
 *                             example: true
 *         409:
 *           description: User already exists
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: false
 *                   error:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "3002"
 *                       status:
 *                         type: string
 *                         example: "fail"
 *                       message:
 *                         type: string
 *                         example: "User already exists with this email"
 *                       details:
 *                         type: object
 *                         properties:
 *                           statusCode:
 *                             type: integer
 *                             example: 409
 *                           status:
 *                             type: string
 *                             example: "fail"
 *                           errorCode:
 *                             type: string
 *                             example: "3002"
 *                           isOperational:
 *                             type: boolean
 *                             example: true
 * 
 *   /api/auth/login:
 *     post:
 *       tags: [Authentication]
 *       summary: Login user
 *       description: Authenticates user credentials and returns a token
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginCredentials'
 *       responses:
 *         200:
 *           description: User successfully logged in
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   data:
 *                     type: object
 *                     properties:
 *                       token:
 *                         type: string
 *                         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "0e9bff0d-fae9-4c68-8994-ec7d4eff08a1"
 *                           username:
 *                             type: string
 *                             example: "johndoe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           password_changed_at:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           password_reset_token:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           password_reset_expires:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           active:
 *                             type: boolean
 *                             example: true
 *                           created_at:
 *                             type: string
 *                             example: "2024-11-24T20:42:44.105"
 *                           updated_at:
 *                             type: string
 *                             example: "2024-11-25T00:09:33.705376"
 *                           oauth_provider:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           oauth_id:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           avatar_url:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           full_name:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *         400:
 *           description: Invalid input data
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: false
 *                   error:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "2001"
 *                       status:
 *                         type: string
 *                         example: "fail"
 *                       message:
 *                         type: string
 *                         example: "Email and password are required"
 *                       details:
 *                         type: object
 *                         properties:
 *                           statusCode:
 *                             type: integer
 *                             example: 400
 *                           status:
 *                             type: string
 *                             example: "fail"
 *                           errorCode:
 *                             type: string
 *                             example: "2001"
 *                           isOperational:
 *                             type: boolean
 *                             example: true
 * 
 *   /api/auth/logout:
 *     post:
 *       tags: [Authentication]
 *       summary: Logout user
 *       security:
 *         - bearerToken: []
 *       responses:
 *         200:
 *           description: Successfully logged out
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: Successfully logged out
 *         401:
 *           description: Unauthorized - Authentication required
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 *         400:
 *           description: Invalid session
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: false
 *                   error:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "SESSION_INVALID"
 *                       status:
 *                         type: string
 *                         example: "fail"
 *                       message:
 *                         type: string
 *                         example: "Session not found or already expired"
 *                       details:
 *                         type: object
 *                         properties:
 *                           statusCode:
 *                             type: integer
 *                             example: 400
 *                           status:
 *                             type: string
 *                             example: "fail"
 *                           errorCode:
 *                             type: string
 *                             example: "SESSION_INVALID"
 *                           isOperational:
 *                             type: boolean
 *                             example: true
 * 
 *   /api/auth/update-password:
 *     put:
 *       tags: [Authentication]
 *       summary: Update user password
 *       security:
 *         - bearerToken: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - currentPassword
 *                 - newPassword
 *               properties:
 *                 currentPassword:
 *                   type: string
 *                   description: Current password
 *                 newPassword:
 *                   type: string
 *                   description: New password
 *       responses:
 *         200:
 *           description: Password successfully updated
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   message:
 *                     type: string
 *                     example: "Password updated successfully"
 *                   data:
 *                     type: object
 *                     properties:
 *                       token:
 *                         type: string
 *                         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *         401:
 *           description: Unauthorized - Authentication required
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 *         400:
 *           description: Invalid password format or validation error
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 * 
 *   /api/auth/google:
 *     get:
 *       tags: [OAuth]
 *       summary: Initiate Google OAuth login
 *       description: Redirects user to Google login page
 *       responses:
 *         200:
 *           description: Successfully generated Google OAuth URL
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   data:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         description: Google OAuth URL
 *         500:
 *           description: Failed to initialize OAuth
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 * 
 *   /api/auth/callback:
 *     get:
 *       tags: [OAuth]
 *       summary: Handle OAuth callback
 *       description: Processes the OAuth callback from Google and creates/updates user session
 *       parameters:
 *         - in: query
 *           name: code
 *           required: true
 *           schema:
 *             type: string
 *           description: Authorization code from Google
 *       responses:
 *         302:
 *           description: Redirects to frontend with auth token
 *         400:
 *           description: Invalid authorization code
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 *         500:
 *           description: OAuth processing failed
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorResponse'
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.put('/update-password', auth, authController.updatePassword);

// OAuth routes
router.get('/google', oauthController.googleSignIn);
router.get('/callback', oauthController.handleOAuthCallback);

module.exports = router;