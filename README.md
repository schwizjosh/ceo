# Raysource Labs Platform

A monorepo containing the Raysource Labs applications with shared authentication.

## 🏗️ Architecture

```
raysourcelabs-platform/
├── apps/
│   ├── ceo/                 # py.raysourcelabs.com - Main application
│   │   ├── frontend/        # React + Vite
│   │   └── backend/         # Node.js + Fastify
│   └── cabinet/             # cabinet.raysourcelabs.com - Transcript processing
│       └── backend/         # Python + FastAPI
├── packages/
│   ├── shared-auth/         # TypeScript auth utilities (npm package)
│   └── shared-auth-python/  # Python auth utilities (pip package)
├── nginx/                   # Shared nginx configurations
├── docker-compose.yml       # Local development orchestration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- PostgreSQL 15+
- Docker (optional, for containerized development)

### Installation

```bash
# Install all dependencies (TypeScript projects)
npm install

# Install Cabinet Python dependencies
cd apps/cabinet/backend
pip install -r requirements.txt
```

### Development

```bash
# Run all apps
npm run dev

# Run specific app
npm run dev:ceo      # CEO app on :5173 (frontend) and :3001 (backend)
npm run dev:cabinet  # Cabinet API on :5002

# Using Docker
docker-compose up -d
```

## 🔐 Shared Authentication

Both CEO and Cabinet apps share the same:
- **JWT Secret**: Tokens from one app work on the other
- **User Database**: Single `andora_db.users` table
- **Token Format**: Consistent payload structure

### Usage (TypeScript)

```typescript
import { verifyToken, initAuthConfig } from '@raysourcelabs/shared-auth';

initAuthConfig({ jwtSecret: process.env.JWT_SECRET });

const payload = verifyToken(token);
console.log(payload.id, payload.email);
```

### Usage (Python)

```python
from shared_auth import verify_token, init_auth_config

init_auth_config(jwt_secret=os.getenv("JWT_SECRET"))

payload = verify_token(token)
print(payload.id, payload.email)
```

## 📁 Apps

### CEO (py.raysourcelabs.com)

The main application for curriculum, learning, and content management.

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Fastify + PostgreSQL
- **Port**: 5173 (frontend), 3001 (backend)

### Cabinet (cabinet.raysourcelabs.com)

Intelligent transcript processing system.

- **Backend**: Python 3.11+ + FastAPI + PostgreSQL + pgvector
- **Features**: Whisper transcription, AI analysis, semantic search
- **Port**: 5002

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 🌐 URLs

| Environment | CEO | Cabinet |
|-------------|-----|---------|
| Production | py.raysourcelabs.com | cabinet.raysourcelabs.com |
| Local | localhost:5173 | localhost:5002 |

## 📦 Packages

### @raysourcelabs/shared-auth (TypeScript)

```bash
cd packages/shared-auth
npm run build
```

### raysourcelabs-shared-auth (Python)

```bash
cd packages/shared-auth-python
pip install -e .
```

## 🔧 Environment Variables

Create `.env` files in each app directory. Key shared variables:

```bash
# Required in both apps
JWT_SECRET=<your-shared-secret>
DATABASE_URL=postgresql://user:pass@localhost:5432/andora_db

# CEO specific
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>

# Cabinet specific
CABINET_DATABASE_URL=postgresql://user:pass@localhost:5432/cabinet_db
WHISPER_MODEL=whisper-1
```

## 📄 License

MIT License - Raysource Labs
