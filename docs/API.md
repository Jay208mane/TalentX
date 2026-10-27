# TalentX — REST API Specification

**Base URL**: `http://localhost:5000/api`  
**Authentication Scheme**: Bearer Token (`Authorization: Bearer <JWT>`)

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User
- **Method & Path**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex@example.com",
    "password": "SecurePassword123!",
    "role": "client" // or "freelancer"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "Registration successful.",
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "6ac...",
      "name": "Alex Morgan",
      "email": "alex@example.com",
      "role": "client"
    }
  }
  ```

### 1.2 Login User
- **Method & Path**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "6ac...",
      "name": "Alex Morgan",
      "email": "alex@example.com",
      "role": "client"
    }
  }
  ```

### 1.3 Request a Password Reset
- **Method & Path**: `POST /api/auth/forgot-password`
- **Access**: Public (limited to 5 requests per IP in 15 minutes)
- **Request Body**:
  ```json
  {
    "email": "alex@example.com"
  }
  ```
- **Response**: `200 OK` with a generic message whether or not the account exists. A reset token is randomly generated, stored only as a SHA-256 hash, and expires after 20 minutes.
- In development, set `NODE_ENV=development`, `PASSWORD_RESET_EMAIL_MODE=mailpit`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, and `CLIENT_URL=http://localhost:5173`. The backend rejects external SMTP in development and links are available only from the local Mailpit UI at `http://localhost:8025`. Start Mailpit with local-only port bindings; see the root README.
- In production, set `NODE_ENV=production`, `PASSWORD_RESET_EMAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and an HTTPS `CLIENT_URL`. Reserved fake/test domains are not sent through production SMTP. If email configuration is missing, the endpoint returns a setup error rather than claiming delivery.

### 1.4 Reset Password
- **Method & Path**: `POST /api/auth/reset-password`
- **Access**: Public (limited to 10 requests per IP in 15 minutes)
- **Request Body**:
  ```json
  {
    "token": "token-from-the-reset-email",
    "password": "NewSecurePassword123!"
  }
  ```
- **Response**: `200 OK` when the password is changed. Invalid, expired, and previously used reset tokens are rejected. The password is bcrypt-hashed and the reset token is consumed atomically.

### 1.5 Get Current User Profile
- **Method & Path**: `GET /api/auth/me`
- **Access**: Protected (Any Authenticated Role)
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": "6ac...",
      "name": "Alex Morgan",
      "email": "alex@example.com",
      "role": "client"
    }
  }
  ```

### 1.6 Get Freelancers Directory
- **Method & Path**: `GET /api/auth/freelancers`
- **Access**: Public
- **Response**: `200 OK`
  ```json
  {
    "count": 5,
    "freelancers": [ ... ]
  }
  ```

---

## 2. Job Marketplace Endpoints (`/api/jobs`)

### 2.1 Get Open Jobs
- **Method & Path**: `GET /api/jobs`
- **Access**: Public / Optional Auth
- **Query Params**: `search`, `category`
- **Response**: `200 OK`
  ```json
  {
    "count": 10,
    "jobs": [ ... ]
  }
  ```

### 2.2 Get Job Details by ID
- **Method & Path**: `GET /api/jobs/:id`
- **Access**: Public / Optional Auth
- **Response**: `200 OK`
  ```json
  {
    "job": {
      "_id": "6ac...",
      "title": "Senior MERN Stack Engineer",
      "description": "...",
      "category": "Development",
      "skills": ["React 19", "Node.js"],
      "budget": 950,
      "budgetType": "fixed",
      "status": "open",
      "client": { "name": "Apex Global" }
    }
  }
  ```

### 2.3 Create Job Posting
- **Method & Path**: `POST /api/jobs`
- **Access**: Protected (`client` only)
- **Request Body**:
  ```json
  {
    "title": "Senior React Developer",
    "description": "Detailed project description...",
    "category": "Development",
    "skills": ["React", "JavaScript"],
    "budgetType": "fixed",
    "budget": 800,
    "deadline": "2026-12-31T00:00:00.000Z" // optional
  }
  ```
- **Response**: `201 Created`

### 2.4 Get My Client Jobs
- **Method & Path**: `GET /api/jobs/mine`
- **Access**: Protected (`client` only)
- **Response**: `200 OK`

### 2.5 Close Job Listing
- **Method & Path**: `PATCH /api/jobs/:id/close`
- **Access**: Protected (Job Owner Client)
- **Response**: `200 OK`

---

## 3. Proposal Endpoints (`/api/proposals`)

### 3.1 Submit Proposal
- **Method & Path**: `POST /api/proposals`
- **Access**: Protected (`freelancer` only)
- **Request Body**:
  ```json
  {
    "jobId": "6ac...",
    "bidAmount": 850,
    "duration": "1 to 3 months",
    "coverLetter": "Detailed explanation of qualifications and approach..."
  }
  ```
- **Response**: `201 Created`

### 3.2 Get Freelancer's Proposals
- **Method & Path**: `GET /api/proposals/mine`
- **Access**: Protected (`freelancer` only)
- **Response**: `200 OK`

### 3.3 Get Proposals for a Job
- **Method & Path**: `GET /api/proposals/job/:jobId`
- **Access**: Protected (Job Owner Client)
- **Response**: `200 OK`

### 3.4 Client Proposal Review
- **Method & Path**: `GET /api/proposals/received` and `PATCH /api/proposals/:proposalId/decision`
- **Access**: Protected (`client` only; proposals are restricted to jobs owned by the authenticated client)
- **Decision Body**: `{ "decision": "accept" }` or `{ "decision": "reject" }`
- Accepting the first proposal claims the open job, creates its project workspace, and rejects other pending proposals. A job can have only one project.

---

## 4. Generative AI Endpoints (`/api/ai`)

### 4.1 Generate Professional Job Description
- **Method & Path**: `POST /api/ai/generate-job-description`
- **Access**: Protected (`client` only)
- **Request Body**:
  ```json
  {
    "jobTitle": "Lead MERN Architect",
    "category": "Development",
    "projectIdea": "Build an Upwork-style freelance marketplace...",
    "skills": ["React 19", "Node.js", "Express", "MongoDB"],
    "experienceLevel": "expert",
    "budget": 1200,
    "budgetType": "fixed",
    "duration": "1 to 3 months",
    "additionalRequirements": "Strong portfolio in marketplace architectures."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Job description generated successfully.",
    "data": {
      "jobTitle": "Senior Full-Stack MERN Architect — Marketplace Platform",
      "projectOverview": "...",
      "projectObjectives": [ ... ],
      "responsibilities": [ ... ],
      "requiredSkills": [ ... ],
      "deliverables": [ ... ],
      "experienceRequirements": "...",
      "budget": 1200,
      "budgetType": "fixed",
      "duration": "1 to 3 months",
      "suggestedSkills": [ ... ]
    }
  }
  ```

---

## 5. Administration Endpoints (`/api/admin`)

### 5.1 Platform Statistics Overview
- **Method & Path**: `GET /api/admin/stats`
- **Access**: Protected (`admin` only)
- **Response**: `200 OK`
  ```json
  {
    "totalUsers": 8,
    "freelancers": 4,
    "clients": 3,
    "totalJobs": 0,
    "openJobs": 0,
    "closedJobs": 0,
    "totalLogins": 23
  }
  ```

### 5.2 User Account Management
- **Method & Path**: `GET /api/admin/users`
- **Access**: Protected (`admin` only)

### 5.3 Toggle User Status
- **Method & Path**: `PATCH /api/admin/users/:id/status`
- **Access**: Protected (`admin` only)
- **Request Body**: `{ "status": "suspended" }` or `{ "status": "active" }`

### 5.4 Login Activity Audit Logs
- **Method & Path**: `GET /api/admin/activity`
- **Access**: Protected (`admin` only)

### 5.5 Marketplace Reports
- **Method & Path**: `GET /api/admin/marketplace-reports`
- **Access**: Protected (`admin` only)
- **Query Params**:
  - `status`: optional job status (`open`, `in_progress`, `completed`, or `closed`); filters job records.
  - `startDate`, `endDate`: optional inclusive creation-date range in `YYYY-MM-DD` format.
  - `page`: optional positive page number; each page contains up to 50 jobs.
- **Response**: `200 OK`
  ```json
  {
    "stats": {
      "totalJobs": 12,
      "openJobs": 5,
      "closedJobs": 2,
      "totalProposals": 18
    },
    "jobs": [
      {
        "_id": "6ac...",
        "title": "Senior React Developer",
        "client": { "name": "Apex Global" },
        "budget": 800,
        "budgetType": "fixed",
        "status": "open",
        "createdAt": "2026-10-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "totalJobs": 12,
      "pages": 1
    }
  }
  ```
- Statistics use the selected creation-date range. `status` filters only the job list.

## 6. Project Workspaces, Chat, and Manual Payments

All project endpoints require a valid client or freelancer access token. Each operation checks project membership or the specific assigned role.

### 6.1 Projects and Work Progress
- `GET /api/projects/mine` — list projects for the authenticated participant.
- `GET /api/projects/:projectId` — project details, milestones, timeline, and payment status.
- `POST /api/projects/:projectId/progress` — freelancer progress reports, completion percentage, and HTTPS work-sample links.
- `POST /api/projects/:projectId/milestones` and `PATCH /api/projects/:projectId/milestones/:milestoneId` — freelancer-managed milestones.
- `POST /api/projects/:projectId/final-work` — freelancer final submission with message and HTTPS deliverable URL.
- `POST /api/projects/:projectId/review` — client `{ "action": "approve" }` or `{ "action": "revision", "comment": "..." }`.
- `POST /api/projects/:projectId/cancel` — cancel a project if its payment is not being verified or already paid.

### 6.2 Project Chat
- `GET /api/projects/:projectId/chat` — project-member chat history (most recent 200 messages in chronological order).
- Socket.IO `project:join` and `chat:send` events are authenticated with the existing JWT and check client/freelancer membership. Messages are written to MongoDB before they are broadcast.

### 6.3 Payment Settings and Manual Payment
- `GET` / `PUT /api/payment-preferences/mine` — freelancer's own UPI or NEFT/IMPS details.
- `GET /api/projects/:projectId/payment-instructions` — the owning client can access the freelancer's payment instructions only after approval while payment is due.
- `POST /api/projects/:projectId/payment/record` — client records a manual transfer; status becomes `pending_verification`.
- `POST /api/projects/:projectId/payment/verify` — assigned freelancer confirms receipt; status becomes `paid` and project status becomes `Completed`.

Payment preference fields are AES-256-GCM encrypted at rest. Configure `PAYMENT_DATA_ENCRYPTION_KEY` as a base64-encoded 32-byte key. No gateway is configured: manual transfers are not verified by TalentX, and the application never treats a client click as proof of payment. No raw card, banking password, OTP, CVV, or UPI PIN is collected.
