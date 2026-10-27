# TalentX — Freelance Marketplace & AI Job Architect

**MCA Minor Project**  
TalentX is a full-stack freelance marketplace web application inspired by premier freelance platforms such as Upwork. Built on the modern MERN stack, TalentX connects clients with qualified independent professionals through role-tailored workspaces, proposal bidding, administrative governance, and an integrated **Generative AI Job Description Generator**.

---

## 1. Features & Capabilities

### 🔐 Authentication & Session Security
- User registration and login with bcrypt password hashing (12 rounds) and JWT session tokens.
- Role-based access control (RBAC) supporting **Freelancer**, **Client**, and **Admin** personas.
- Strict authorization middleware verifying real database status (`active` vs. `suspended`).
- Persistent login state synchronized via Axios interceptors and `localStorage`.

### 💼 Client Workspace
- Comprehensive Client Dashboard tracking active postings and proposals.
- Custom Job Posting flow with category, required skills, fixed/hourly budget, and deadlines.
- Direct ability to view and close active listings.
- **AI Job Description Generator** (`/client/ai-job-generator`): Formulate structured, professional job postings from raw project ideas with 1-click transfer to the marketplace poster.

### 🛠 Freelancer Workspace
- Modern Freelancer Dashboard tracking active bids and live opportunities.
- Marketplace job browsing with search filters (category, keyword, budget type, and sorting).
- Detailed Job Specifications page with proposal submission modal (bid amount, turnaround time, cover letter).
- **My Proposals** view (`/freelancer/proposals`) fetching live submitted bids from the MongoDB backend.

### 🛡 Administrator Workspace
- Admin Dashboard (`/admin/dashboard`) displaying high-level platform analytics.
- User management table with real-time active/suspended status toggling.
- Full login activity audit trails logging events, IP addresses, and timestamps.

### ✨ Generative AI Integration
- Powered by a configurable server-side LLM service supporting **OpenAI** (default: `gpt-4o-mini`), **Google Gemini** (`gemini-1.5-flash`), **Groq**, and OpenAI-compatible gateways.
- Generates 9-part structured descriptions: Job Title, Overview, Objectives, Responsibilities, Required Skills, Deliverables, Experience Requirements, Budget/Timeline, and Suggested Skills.
- Zero API keys exposed to the client; full prompt injection protection and strict input validation.

---

## 2. Technology Stack

### Frontend (`client/`)
- **Core**: React 19, JavaScript (ESModules)
- **Tooling**: Vite 8, React Router 7
- **HTTP Client**: Axios 1.20 with JWT Request Interceptor
- **Design System**: Vanilla CSS design system (`App.css`, `index.css`) with Upwork-inspired green theme (`#108a00`), responsive layouts, and accessible forms.

### Backend (`server/`)
- **Runtime**: Node.js v18+ (tested on Node v24)
- **Framework**: Express.js 5
- **Database**: MongoDB Atlas with Mongoose 9
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Environment**: `dotenv` v17

---

## 3. Project Structure

```text
TalentX/
├── client/                      # React 19 Frontend SPA
│   ├── public/                  # Static assets (favicons, icons)
│   ├── src/
│   │   ├── assets/              # Branding graphics
│   │   ├── components/          # Navbar, Footer, JobCard, UserCard, ProtectedRoute, FreelancerLayout
│   │   ├── context/             # AuthContext.jsx, useAuth.js
│   │   ├── pages/               # Marketplace Pages (Home, Jobs, JobDetails, Freelancers, Profile, Messages)
│   │   │   ├── admin/           # Admin Dashboard & Audit Panels
│   │   │   ├── client/          # Client Dashboard & AI Job Generator
│   │   │   └── freelancers/     # Freelancer Dashboard, FindWork, Proposals
│   │   ├── services/            # api.js (Axios instance)
│   │   ├── App.css              # TalentX Design System CSS
│   │   ├── index.css            # Base tokens and typography
│   │   ├── App.jsx              # Application router
│   │   └── main.jsx             # React entry point
│   ├── .env.example             # Client environment template
│   ├── package.json
│   └── vite.config.js
├── server/                      # Node.js + Express 5 Backend
│   ├── config/                  # db.js (MongoDB Mongoose connection)
│   ├── controllers/             # authcontrollers, jobcontroller, proposalController, aiController
│   ├── middleware/              # authmiddleware.js (protect, allowRoles, optionalAuth)
│   ├── models/                  # User.js, job.js, proposal.js, LoginActivity.js
│   ├── routes/                  # authroutes, jobroutes, proposalRoutes, aiRoutes, adminroutes
│   ├── services/
│   │   └── ai/                  # jobDescriptionService.js (Multi-provider GenAI Service)
│   ├── validators/              # aiValidator.js
│   ├── CreateAdmin.js           # Admin initialization script
│   ├── test-suite.js            # Automated integration test runner
│   ├── server.js                # Express app server entry point
│   ├── .env.example             # Server environment template
│   └── package.json
├── docs/                        # Project Documentation
│   ├── API.md                   # REST API Specification
│   └── GENAI_SETUP.md           # Generative AI Architecture & Setup
├── PROJECT_AUDIT.md             # Full architecture audit report
├── README.md                    # Main Project Documentation
└── .gitignore                   # Root Gitignore protecting secrets
```

---

## 4. Prerequisites

- **Node.js**: v18.0.0 or newer
- **npm**: v9.0.0 or newer
- **MongoDB**: A running local MongoDB instance or a MongoDB Atlas connection string.

---

## 5. Quickstart & Installation

### Step 1: Clone or Navigate to the Repository
```bash
cd D:\TalentX
```

### Step 2: Configure Server Environment
Create `server/.env` based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```
Populate `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/TalentX
JWT_SECRET=your_super_secret_jwt_key_2026
NODE_ENV=development
PASSWORD_RESET_EMAIL_MODE=mailpit
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
CLIENT_URL=http://localhost:5173

# Optional: Configure GenAI Provider (OpenAI, Gemini, Groq, etc.)
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your_actual_api_key_here
```
For local password-reset testing, start Mailpit in a separate terminal. Its ports are bound to this machine only:
```powershell
docker run --rm --name talentx-mailpit -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit
```
Open the protected local inbox preview at `http://localhost:8025`. Create or use a test account with an address such as `freelancer@talentx.test`; reset messages go to Mailpit, never to the public internet. The development server script sets `NODE_ENV=development` and rejects non-local SMTP hosts. If Mailpit is not running or its settings are missing, password-reset displays a setup error instead of claiming the email was sent.

For production only, set `NODE_ENV=production`, `PASSWORD_RESET_EMAIL_MODE=smtp`, a real provider's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`, and an HTTPS `CLIENT_URL`. Do not use production SMTP credentials in development. Reserved fake domains (`.test`, `.example`, `.invalid`, and `example.com`/`.net`/`.org`) are never sent through production SMTP. Forgot-password requests are rate-limited and return a generic message for registered and unregistered addresses.

### Step 3: Configure Client Environment
Create `client/.env`:
```bash
cp client/.env.example client/.env
```
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 4: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

## 6. Running the Application

### Start the Backend Server:
```bash
cd server
npm run dev
```
*The Express server will start on port 5000 and connect to MongoDB.*

### Start the Frontend Dev Server:
```bash
cd client
npm run dev
```
*Open your browser and navigate to `http://localhost:5173`.*

---

## 7. Available Scripts

### Frontend (`client/`)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Starts Vite local development server |
| `build` | `npm run build` | Builds production bundle into `dist/` |
| `lint` | `npm run lint` | Runs ESLint checks on all React components |
| `preview` | `npm run preview` | Previews the production build locally |

### Backend (`server/`)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `npm run dev` | Starts Express server with nodemon auto-reload |
| `start` | `npm run start` | Starts Express server with Node |
| `test` | `npm test` | Runs the automated integration test suite |
| `seed:admin` | `npm run seed:admin` | Seeds an administrator user account |

---

## 8. Verifying & Testing

Run the automated integration suite from the `server` directory:
```bash
cd server
npm test
```
The test suite validates:
- MongoDB Atlas connectivity
- Model compilation (`User`, `Job`, `Proposal`)
- JWT issuance and decoding
- AI request validation & sanitization
- Missing AI API key handling (`AI_CONFIG_REQUIRED` 503)
- Marketplace queries

To test frontend production bundling and linting:
```bash
cd client
npm run lint
npm run build
```

---

## 9. Documentation Directory

- [`docs/API.md`](docs/API.md) — Comprehensive REST API endpoint guide.
- [`docs/GENAI_SETUP.md`](docs/GENAI_SETUP.md) — Generative AI architecture, provider keys, and troubleshooting.
- [`PROJECT_AUDIT.md`](PROJECT_AUDIT.md) — Deep architectural audit and remediation log.

---

## 10. License & Academic Attribution
Developed as an MCA Minor Project by Jay Mane. Inspired by Upwork.
