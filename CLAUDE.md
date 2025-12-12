# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Andora is an AI-powered brand storytelling platform that helps businesses create consistent, narrative-driven content across multiple channels. The platform uses a multi-agent AI system to generate brand content based on character-driven storytelling, monthly themes, and weekly subplots.

## Architecture

### Monorepo Structure

This is a full-stack application with two main parts:

1. **Frontend** (`/src`, root level) - React + TypeScript + Vite SPA
2. **Backend** (`/backend`) - Node.js + Fastify + TypeScript API with multi-agent AI system

**IMPORTANT**: The backend has been migrated from Express to Fastify for better performance and type safety. The legacy server at `/server.deprecated` has been permanently deprecated and removed from PM2. Always use `/backend` (PM2 process: `andora-backend`) for the API server.

### Frontend Architecture

- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: React Router v6 with protected routes
- **State Management**: React hooks (useAuth, custom hooks in `/src/hooks`)
- **Styling**: Tailwind CSS with custom theme configuration
- **API Client**: Centralized in `/src/lib/api.ts` (uses apiClient)
- **Component Structure**:
  - `/src/components/auth` - Authentication forms
  - `/src/components/dashboard` - Main user dashboard
  - `/src/components/admin` - Admin dashboard
  - `/src/components/onboarding` - User onboarding flows
  - `/src/components/events` - Event management
  - `/src/components/monthly` - Monthly theme planning
  - `/src/components/plot` - Content plotting/planning
  - `/src/components/layout` - Layout components
  - `/src/components/common` - Shared components

**Key Frontend Patterns**:
- Authentication is handled via `useAuth` hook with demo accounts support
- Protected routes redirect to `/login` if not authenticated
- Admin users get routed to `AdminDashboard`, regular users to `Dashboard`

### Backend Architecture (Multi-Agent AI System)

**Framework**: The backend uses **Fastify** (v5) for high-performance, low-overhead HTTP handling with built-in TypeScript support.

The backend implements a sophisticated multi-agent orchestration system for AI content generation:

**Core Architecture Components**:

1. **Agent System** (`/backend/src/agents/`)
   - `base.ts` - BaseAgent abstract class that all agents extend
   - `orchestrator.agent.ts` - Master agent that coordinates all other agents
   - `sceneWriter.agent.ts` - Specialized agent for content writing
   - Each agent has model selection, token budgets, and performance tracking

2. **Brand Context Engine** (`/backend/src/services/brandContext.ts`)
   - RAG (Retrieval-Augmented Generation) system
   - Provides agents with focused, relevant context instead of full brand data
   - Implements caching with TTL to reduce database queries
   - Query methods: `getBrandIdentity()`, `getSceneContext()`, `getCharactersForDate()`, etc.

3. **Model Router** (`/backend/src/services/modelRouter.ts`)
   - Defaults to Gemini 2.5 Flash (FREE) for all tasks
   - Can route to premium models: GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku (for paid users)
   - Analyzes task complexity and selects optimal model for cost/quality balance
   - Tracks performance metrics for continuous optimization

4. **Controllers** (`/backend/src/controllers/`)
   - Thin controllers that delegate to services/agents
   - Handle request validation and error responses

5. **Routes** (`/backend/src/routes/`)
   - `authRoutes.ts` - User authentication (register, login)
   - `brandRoutes.ts` - Brand CRUD operations
   - `characterRoutes.ts` - Character management and AI generation
   - `events.ts` - Event management
   - `seasons.ts` - Seasonal content planning
   - `content.ts` - Content generation and refinement

**Key Backend Patterns**:
- All agents extend `BaseAgent` and implement `execute(input: AgentInput): Promise<AgentOutput>`
- Orchestrator queries Brand Context Engine for minimal required context
- Model Router selects appropriate AI model based on task complexity
- JWT authentication using `@fastify/jwt` plugin with hooks at `/backend/src/middleware/auth.ts`
- Routes are registered as Fastify plugins (async functions) for encapsulation
- Request/Reply objects use Fastify's API (`.send()` instead of `.json()`)
- Database queries use connection pooling from `/backend/src/database/db.ts`

### Database Schema

PostgreSQL database with the following main tables:

- `users` - User accounts (email, password_hash, full_name)
- `brands` - Brand profiles (name, tagline, industry, personality, channels as JSONB)
- `brand_characters` - AI-generated brand personas/characters (name, description, personality_tags as JSONB, is_perfect flag)
- `content_calendar` - Scheduled content (title, content_type, platform)
- Additional tables for events, seasons, themes, subplots

**Important**: Database uses UUIDs for primary keys via `uuid-ossp` extension.

## Development Commands

### Frontend (Root Directory)

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Backend

```bash
cd backend

# Install dependencies
npm install

# Start dev server with auto-reload (http://localhost:5000)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run database migrations
npm run db:migrate
```

### Database Setup

```bash
# Create database
createdb andora_db

# Run schema
psql -U postgres -d andora_db -f backend/src/database/schema.sql

# Or from psql
\i backend/src/database/schema.sql
```

## Environment Variables

### Frontend (`.env` in root)

```
VITE_API_URL=http://localhost:5000
VITE_OPENAI_API_KEY=your_key
VITE_ANTHROPIC_API_KEY=your_key
VITE_ADMIN_EMAIL=admin@andorabrand.me
VITE_ADMIN_PASSWORD=898and.8888
VITE_DEMO_EMAIL=demo@andorabrand.me
VITE_DEMO_PASSWORD=898dora.8888
```

### Backend (`/backend/.env`)

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=andora_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
# Gemini API Keys (9 keys for rotation to handle free tier rate limits)
GEMINI_API_KEY_1=your_key
GEMINI_API_KEY_2=your_key
GEMINI_API_KEY_3=your_key
GEMINI_API_KEY_4=your_key
GEMINI_API_KEY_5=your_key
GEMINI_API_KEY_6=your_key
GEMINI_API_KEY_7=your_key
GEMINI_API_KEY_8=your_key
GEMINI_API_KEY_9=your_key
```

## Key Concepts

### Multi-Agent System Workflow

1. User requests content generation through frontend
2. Request hits backend API endpoint (e.g., `/api/content`)
3. Controller creates `OrchestrationRequest` and passes to Orchestrator Agent
4. Orchestrator queries Brand Context Engine for focused context (not full brand data)
5. Model Router analyzes task and selects optimal AI model
6. Orchestrator routes to specialist agent (e.g., SceneWriterAgent)
7. Specialist agent generates content using selected model
8. Performance metrics recorded back to Model Router
9. Result returned to user

**Why this architecture?**
- Reduces token usage by sending only relevant context to AI models
- Optimizes costs by routing simple tasks to cheaper models
- Improves performance through context caching
- Enables swarm intelligence through specialized agents

### Character-Driven Content

Content is generated from the perspective of brand "characters" (Cast):
- Each brand has multiple characters representing different voices/perspectives
- Characters have personality tags, location, voice, and role
- Users can mark characters as "perfect" to lock them from regeneration
- Content generation selects appropriate character based on date/channel/format

### Narrative Structure

Content follows a TV series-like structure:
- **Seasons** - Long-term brand arcs
- **Monthly Themes** - Key message/narrative for the month
- **Weekly Subplots** - Specific storylines that advance the theme
- **Daily Scenes** - Individual content pieces tied to events and subplots

### Demo Accounts

The app has built-in demo accounts (see `/src/hooks/useAuth.ts`):
- Admin: `admin@andorabrand.me` / `898and.8888`
- Demo User: `demo@andorabrand.me` / `898dora.8888`

## Important Files to Know

- `/backend/src/agents/base.ts` - Agent system foundation, read this first to understand agents
- `/backend/src/agents/orchestrator.agent.ts` - Master orchestration logic
- `/backend/src/services/brandContext.ts` - Context retrieval and caching
- `/backend/src/services/modelRouter.ts` - AI model selection logic
- `/src/hooks/useAuth.ts` - Frontend authentication logic
- `/src/lib/api.ts` - API client wrapper
- `/backend/src/database/schema.sql` - Complete database schema

## Adding New AI Agents

1. Create new agent file in `/backend/src/agents/[name].agent.ts`
2. Extend `BaseAgent` from `./base.ts`
3. Implement `execute(input: AgentInput): Promise<AgentOutput>` method
4. Define agent config (name, model, capabilities, token budget)
5. Register agent in `OrchestratorAgent.registerAgents()` method
6. Add prompts to `/backend/src/utils/prompts/[name].prompts.ts`

## AI Model Selection Strategy

**DEFAULT MODEL: Gemini 2.5 Flash (FREE)**

Andora now uses Google's **Gemini 2.5 Flash** as the default AI model for all users:
- **FREE tier**: 15 requests/minute, 1,000 requests/day per API key
- **Key Rotation**: System automatically rotates between 9 API keys for 135 RPM effective capacity
- **Performance**: 1M token context window, fast generation, commercial usage allowed
- **Cost**: $0 (completely free!)

### User Tier Model Access:

**FREE Users:**
- Limited to Gemini 2.5 Flash only
- No model switcher shown in UI
- All content generated via Gemini

**PAID Users (Starter, Pro, Premium, etc.):**
- Default: Gemini 2.5 Flash (cost-free)
- Can override in Account Settings or Admin Agent Config
- Access to premium models:
  - **GPT-5**: Most advanced reasoning, superior creativity
  - **GPT-4o**: Complex content writing, high creativity
  - **GPT-4o-mini**: Simple tasks, quick generations
  - **Claude Sonnet 4.5**: Long-form content, deep analysis
  - **Claude Haiku 4.5**: Fast tasks, data extraction

Model Router defaults to Gemini for all tasks. Paid users can configure preferred models per agent in Admin Dashboard.

## Authentication Flow

1. Frontend submits credentials to `/api/auth/login` or `/api/auth/register`
2. Backend validates and returns JWT token
3. Frontend stores token in apiClient
4. All protected API requests include `Authorization: Bearer <token>` header
5. Backend middleware (`/backend/src/middleware/auth.ts`) validates JWT
6. User data attached to `req.user` for use in controllers
