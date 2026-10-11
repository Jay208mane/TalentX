# TalentX

TalentX is a full-stack talent marketplace application designed to connect clients, freelancers, and administrators in a role-based workflow. The platform includes secure authentication, role-aware dashboards, and a modern React frontend backed by an Express and MongoDB API.

## Features

- User registration and login
- JWT-based authentication and protected routes
- Role-based access for freelancers, clients, and admins
- Separate dashboard experiences for each user type
- React + Vite frontend for a responsive UI
- Express API with MongoDB persistence

## Tech Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JWT and bcryptjs
- API style: REST

## Project Structure

```text
TalentX/
├── client/              # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.*
├── server/              # Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── README.md
└── .gitignore
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string

## Environment Variables

Create a `.env` file inside the `server` directory and add the following values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/talentx
JWT_SECRET=your_super_secret_key
```

If you use MongoDB Atlas, replace `MONGO_URI` with your cluster connection string.

## Getting Started

1. Install frontend dependencies:

```bash
cd client
npm install
```

2. Install backend dependencies:

```bash
cd ../server
npm install
```

3. Start the backend server:

```bash
npm run dev
```

4. Start the frontend development server in a new terminal:

```bash
cd client
npm run dev
```

5. Open the app in your browser:

```text
http://localhost:5173
```

## Available Scripts

### Frontend (`client`)

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend (`server`)

```bash
npm run dev
npm run start
```

## API Overview

The backend exposes endpoints under the `/api` prefix, including:

- `POST /api/auth/register` — create a new user account
- `POST /api/auth/login` — authenticate and receive a JWT
- `GET /api/auth/me` — get the logged-in user profile
- `GET /api/jobs` and related job routes — manage job-related data

## Notes

- The frontend stores the auth token in `localStorage` under `talentx_token`.
- The backend validates JWTs using `JWT_SECRET` and checks database user records before allowing access.
- For production use, ensure you configure a strong secret, secure CORS settings, and a proper MongoDB connection.

## Contributing

If you plan to extend the project, keep the client and server concerns separated and update both sides when adding new authentication or job features.
