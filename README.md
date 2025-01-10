# FitKitchen - Personalized Catering System

FitKitchen is a personalized catering system designed to provide healthy, customized meals based on individual health needs and preferences. It combines nutritional science with culinary excellence to deliver the perfect meal plan for each user.

## Features

- User registration and authentication with email/password and Google OAuth
- Comprehensive health assessment to gather user's health data, allergies, and dietary preferences
- Personalized meal plan recommendations based on health assessment results
- Meal selection and customization based on nutritional targets and user preferences
- Order history and meal plan tracking
- Recipe recommendation feature for users to suggest new menu ideas
- Responsive and intuitive user interface

## Technologies Used

### Backend
- Node.js with Express.js for server-side logic
- Supabase for database and authentication
- JWT for user authentication and session management
- Swagger for API documentation

### Frontend
- React.js for building the user interface
- React Router for client-side routing
- React Context for state management
- CSS modules for styling
- Lucide React for icons
- Axios for making API requests

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine
- Supabase project set up with the required tables and schema

### Installation
1. Clone the repository:
```bash
git clone [<repository-url>](https://github.com/billysm23/FitKitchen_FrontendTST)(https://github.com/billysm23/FitKitchen_BackendTST)
```
2. Install the dependencies for both backend and frontend:
```bash
Backend:
npm install
Frontend:
cd fit-kitchen-frontend
npm install
```
3. Set up environment variables:
- Create a `.env` file in the `backend` directory and provide the required environment variables
- Create a `.env` file in the `frontend` directory and provide the required environment variables

4. Start the development servers:
```bash
Backend:
docker compose up
Frontend:
cd fit-kitchen-frontend
npm start
```

## API Documentation

The API documentation is in `https://fit-kitchen-frontend-tst.vercel.app/api-docs` .
