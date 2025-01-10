# FitKitchen - Personalized Catering System
## Billy Samuel Setiawan - 18222039

FitKitchen is a personalized catering system designed to provide healthy, customized meals based on individual health needs and preferences. It combines nutritional science with culinary excellence to deliver the perfect meal plan for each user.

## Website
https://fit-kitchen-frontend-tst.vercel.app

For testing API directly to backend: https://fitkitchen-backend.up.railway.app

## API Documentation
Main Report: https://docs.google.com/document/d/1uTAKZIA2Duj45DMhAbs9XPqd9WPt1WfE9tO6SI_jdx8/edit?usp=sharing

API documentation: https://fit-kitchen-frontend-tst.vercel.app/api-docs

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
- JWT (Bearer token) for user authentication and session management
- Docker for concatenation

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
```bash
NODE_ENV=development or production
PORT=PORT
JWT_SECRET=JWT_SECRET
JWT_EXPIRES_IN=JWT_EXPIRES_IN
SUPABASE_URL=SUPABASE_URL
SUPABASE_KEY=SUPABASE_KEY
CLIENT_URL=CLIENT_URL
SUPABASE_GOOGLE_CLIENT_ID=SUPABASE_GOOGLE_CLIENT_ID
SUPABASE_GOOGLE_CLIENT_SECRET=SUPABASE_GOOGLE_CLIENT_SECRET
```
- Create a `.env` file in the `frontend` directory and provide the required environment variables
```bash
REACT_APP_API_URL=REACT_APP_API_URL
REACT_APP_ENV=development or production
GENERATE_SOURCEMAP=false
REACT_APP_GOOGLE_CLIENT_ID=REACT_APP_GOOGLE_CLIENT_ID
REACT_APP_RECIPE_API_KEY=this_is_from_my_friend_Steven_Corne_so_you_can_ask_him
```

4. Start the development servers:
```bash
Backend:
docker compose up
Frontend:
cd fit-kitchen-frontend
npm start
```
