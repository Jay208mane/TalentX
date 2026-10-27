# TalentX — Generative AI Setup & Architecture Guide

This guide documents the architecture, configuration, security practices, and troubleshooting for the **AI Job Description Generator** in TalentX.

---

## 1. GenAI Architecture Overview

The Generative AI subsystem in TalentX follows a secure, server-delegated architecture inspired by enterprise freelance platforms:

```text
┌─────────────────────────────────┐
│       React 19 Client           │
│  /client/ai-job-generator       │
└────────────────┬────────────────┘
                 │  JWT Bearer Token + JSON Payload
                 ▼
┌─────────────────────────────────┐
│     Express Backend Server      │
│     POST /api/ai/generate-...   │
├─────────────────────────────────┤
│  1. JWT Auth Middleware (Client)│
│  2. Input Sanitization & Bounds │
│  3. Multi-Provider AI Service   │
└────────────────┬────────────────┘
                 │  Server-side API Request (Private Key)
                 ▼
┌─────────────────────────────────┐
│     AI LLM Provider             │
│  OpenAI / Gemini / Groq         │
└─────────────────────────────────┘
```

### Key Security & Architectural Principles
- **Zero Frontend Credential Exposure**: API keys (`AI_API_KEY`) are exclusively read from `server/.env`. No client build, browser request, or frontend variable ever sees the provider key.
- **Client-Role Authorization**: Protected via `protect` and `allowRoles("client")`. Unauthenticated visitors or freelancers cannot invoke AI endpoints.
- **Prompt Injection Defense**: All user inputs are sanitized, length-capped, and demarcated within strict delimiters (`=== CLIENT INPUT START ===`). The system instructions strictly forbid user input from overriding the JSON schema or business rules.
- **Structured JSON Output**: Guarantees predictable outputs conforming to a validated 9-part schema.
- **Configurable Provider Abstraction**: Switch between OpenAI, Google Gemini, Groq, OpenRouter, or local models without modifying frontend components.

---

## 2. Environment Variables

Configure these variables inside `D:\TalentX\server\.env`:

| Variable | Required | Default | Supported Values / Description |
|----------|----------|---------|--------------------------------|
| `AI_PROVIDER` | No | `openai` | `openai`, `gemini`, `groq`, `openrouter`, `custom` |
| `AI_MODEL` | No | `gpt-4o-mini` | `gpt-4o-mini`, `gpt-4o`, `gemini-1.5-flash`, `gemini-2.0-flash`, `llama-3.1-70b-versatile` |
| `AI_API_KEY` | **Yes** (for live AI) | *None* | Your private provider API key |
| `AI_BASE_URL` | No | `https://api.openai.com/v1` | Custom gateway or local Ollama URL (e.g. `http://localhost:11434/v1`) |

> [!IMPORTANT]
> Never commit real API keys to Git. Keep `server/.env` untracked and protected by `.gitignore`.

---

## 3. Provider Configuration Guides

### 3.1 OpenAI (Default)
1. Sign up at [platform.openai.com](https://platform.openai.com/).
2. Navigate to **API Keys** and create a new secret key.
3. Configure `server/.env`:
   ```env
   AI_PROVIDER=openai
   AI_MODEL=gpt-4o-mini
   AI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
   ```

### 3.2 Google Gemini
1. Sign up at [aistudio.google.com](https://aistudio.google.com/).
2. Click **Get API key** and create a key.
3. Configure `server/.env`:
   ```env
   AI_PROVIDER=gemini
   AI_MODEL=gemini-1.5-flash
   AI_API_KEY=AIzaSy-YOUR_GEMINI_API_KEY_HERE
   ```

### 3.3 Groq (Ultra-Fast LLaMA 3.1 Inference)
1. Sign up at [console.groq.com](https://console.groq.com/).
2. Create an API key in **API Keys**.
3. Configure `server/.env`:
   ```env
   AI_PROVIDER=openai
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_MODEL=llama-3.1-70b-versatile
   AI_API_KEY=gsk_YOUR_GROQ_API_KEY_HERE
   ```

### 3.4 OpenRouter
1. Sign up at [openrouter.ai](https://openrouter.ai/).
2. Create an API key in **Keys**.
3. Configure `server/.env`:
   ```env
   AI_PROVIDER=openai
   AI_BASE_URL=https://openrouter.ai/api/v1
   AI_MODEL=openai/gpt-4o-mini
   AI_API_KEY=sk-or-v1-YOUR_OPENROUTER_KEY_HERE
   ```

---

## 4. API Specification

### Endpoint: `POST /api/ai/generate-job-description`
- **Authentication**: Required (`Authorization: Bearer <jwt_token>`)
- **Role Required**: `client`

#### Request Headers:
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

#### Request Body:
```json
{
  "jobTitle": "Senior Full-Stack MERN Developer",
  "category": "Development",
  "projectIdea": "Develop a freelance marketplace with clean component hierarchy, real-time messaging, and JWT authentication.",
  "skills": ["React 19", "Node.js", "Express", "MongoDB"],
  "experienceLevel": "expert",
  "budget": 1200,
  "budgetType": "fixed",
  "duration": "1 to 3 months",
  "additionalRequirements": "Strong portfolio in marketplace architectures."
}
```

#### Successful Response (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Job description generated successfully.",
  "data": {
    "jobTitle": "Senior Full-Stack MERN Engineer — Marketplace Platform",
    "projectOverview": "We are seeking a seasoned Full-Stack Engineer...",
    "projectObjectives": [
      "Implement responsive React 19 component layouts",
      "Connect Express 5 REST endpoints with MongoDB Atlas"
    ],
    "responsibilities": [
      "Develop modular React components following the TalentX design system",
      "Optimize MongoDB query performance and indexing"
    ],
    "requiredSkills": ["React 19", "Node.js", "Express", "MongoDB"],
    "deliverables": [
      "Production-ready frontend and backend codebases",
      "Documented API integration tests and setup instructions"
    ],
    "experienceRequirements": "Expert level (4+ years) in MERN stack architectures.",
    "budget": 1200,
    "budgetType": "fixed",
    "duration": "1 to 3 months",
    "suggestedSkills": ["TypeScript", "Docker", "Redis"]
  }
}
```

---

## 5. Error Handling & Troubleshooting

| Error Code / Status | Meaning | Solution |
|---------------------|---------|----------|
| `401 Unauthorized` | Missing or invalid user JWT | Log in to a verified client account on the frontend. |
| `403 Forbidden` | Authenticated user is not a Client | Switch to or register a `client` account. |
| `400 Validation Error` | Missing or invalid input fields | Ensure job title (>= 3 chars), description (>= 10 chars), budget (> 0), and at least 1 skill are provided. |
| `503 AI_CONFIG_REQUIRED` | `AI_API_KEY` is missing in `server/.env` | Open `server/.env`, set `AI_API_KEY=<your_key>`, and restart the backend. |
| `401 AI_PROVIDER_ERROR` | Provider API key rejected | Verify your API key has not expired and has adequate credits. |
| `429 Rate Limit Exceeded` | Provider rate limit reached | Check your provider usage limits or upgrade tier. |
| `504 Gateway Timeout` | Provider took longer than 35s | The request was automatically aborted to protect server resources. Retry with a more concise project idea. |

---

## 6. GenAI Profile Enhancer (`POST /api/ai/enhance-profile`)

The **GenAI Profile Enhancer** optimizes freelancer and client profiles to win more projects:

- **Endpoint**: `POST /api/ai/enhance-profile`
- **Protection**: Authenticated users (`protect`)
- **Inputs**: `name`, `currentTitle`, `currentBio`, `skills`, `experienceLevel`, `hourlyRate`, `targetFocus`, `tone`
- **Output Schema**:
  ```json
  {
    "success": true,
    "data": {
      "enhancedTitle": "Lead / Senior Software Engineer | React & Node.js | Scalable Cloud SaaS",
      "enhancedBio": "Comprehensive 3-paragraph executive overview with technical competencies and call to action.",
      "recommendedSkills": ["React", "Node.js", "TypeScript", "System Architecture"],
      "valuePropositions": ["End-to-end full-stack delivery", "Clean, maintainable architecture"],
      "suggestedServices": ["Custom Web Application Development", "RESTful API Engineering"],
      "profileStrengthScore": 96,
      "optimizationTips": ["Add 1-2 demo links to your portfolio"]
    }
  }
  ```
- **Model Overload & Offline Resilience**: If external LLM API rate limits (429) or model overloads (503) occur, the service automatically engages the **Smart Generation Engine** to return full, structured enhancements instantly with zero user errors.

---

## 7. Zero Pre-Money Project & Post-Completion Payment Demand Workflow

TalentX supports direct project creation without requiring traditional job bidding or advance escrow deposits:

1. **Client Posts Project**: Client describes what they want built via `POST /api/projects`. Upfront fee is `$0`.
2. **Freelancer Starts Work**: Freelancer claims the open project or is assigned directly.
3. **Real-Time Progress Tracking**: Milestones, progress updates, and chat synchronize via WebSockets.
4. **Post-Completion Payment Demand**: Upon delivering final work, the freelancer calls `POST /api/projects/:id/demand-payment` with final deliverable links and invoice amount.
5. **Client Review & Payment**: Client reviews deliverables, approves demand, and records payment via manual bank transfer or UPI with zero platform pre-charges.
