# Cabinet: Intelligent Transcript Processing System
## Implementation Plan for cabinet.raysourcelabs.com

---

## Overview

**Cabinet** is a FastAPI-based intelligent transcript processing platform that will:
- Share JWT authentication with py.raysourcelabs.com (same secret, same user database)
- Process audio/video files using OpenAI Whisper for transcription
- Leverage GPT-4/Claude for AI classification, sentiment analysis, action item extraction
- Implement semantic search using vector embeddings with pgvector
- Deploy as systemd service with Uvicorn on port 5002

---

## Technology Stack

- **Backend**: Python 3.11+ with FastAPI
- **Database**: PostgreSQL with pgvector extension (separate `cabinet_db`)
- **Authentication**: Shared JWT with py.raysourcelabs.com via `andora_db.users`
- **AI Services**: OpenAI (Whisper, GPT-4, text-embedding-ada-002), Anthropic (Claude)
- **Deployment**: Systemd + Uvicorn, Nginx reverse proxy
- **File Storage**: Local filesystem at `/var/www/cabinet/backend/uploads/`

---

## Key Architectural Decisions

### 1. Shared Authentication Strategy
- **Use same JWT secret** from `/var/www/ceo/backend/.env`: `lLM33oO5g6u9t8MIMsQgpIvVooO3iRpXZxbjRZp+gY4=`
- Validate tokens by querying `andora_db.users` table directly
- No user duplication - single source of truth in andora_db
- Cabinet maintains separate business data in `cabinet_db`

### 2. Database Architecture
- **cabinet_db**: New PostgreSQL database for transcript data
- **Cross-database references**: `user_id UUID` fields reference `andora_db.users(id)`
- **Extensions**: uuid-ossp, pgvector (for embeddings), pg_trgm (text search)

### 3. Background Processing
- Use FastAPI's built-in `BackgroundTasks` (not Celery)
- Async pipeline: Upload → Transcribe → Analyze → Embed
- Job tracking via `processing_jobs` table

### 4. Vector Search
- pgvector extension in PostgreSQL (no separate vector DB)
- OpenAI text-embedding-ada-002 (1536 dimensions)
- Cosine similarity search on chunked transcripts

---

## Project Structure

```
/var/www/cabinet/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application
│   │   ├── config.py                  # Configuration (JWT secret, API keys)
│   │   ├── database.py                # SQLAlchemy connections (cabinet_db + andora_db)
│   │   ├── api/v1/endpoints/          # REST API endpoints
│   │   │   ├── auth.py                # GET /auth/me (validate JWT)
│   │   │   ├── transcripts.py         # Transcript CRUD
│   │   │   ├── upload.py              # File upload & processing
│   │   │   ├── search.py              # Semantic + keyword search
│   │   │   ├── meetings.py            # Meeting management
│   │   │   └── analytics.py           # Usage analytics
│   │   ├── core/
│   │   │   ├── auth.py                # JWT validation (shared secret)
│   │   │   └── security.py            # Password hashing, token utils
│   │   ├── models/                    # SQLAlchemy models
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   └── services/
│   │       ├── transcription.py       # Whisper API integration
│   │       ├── ai_analysis.py         # GPT-4/Claude analysis
│   │       ├── embeddings.py          # Vector generation + pgvector
│   │       ├── background_tasks.py    # Async processing pipeline
│   │       └── vector_search.py       # Semantic search
│   ├── migrations/
│   │   └── init_cabinet_db.sql        # Database schema
│   ├── uploads/                       # Local file storage
│   ├── requirements.txt
│   └── .env
└── frontend/                          # (Future React app)
```

---

## Critical Files to Create

### 1. Database Schema: `/var/www/cabinet/backend/migrations/init_cabinet_db.sql`

Tables:
- **meetings**: Group related transcripts (title, type, date, attendees)
- **transcripts**: Core table (full_text, categories, sentiment, ai_summary, status)
- **transcript_chunks**: For embeddings (chunk_text, embedding vector(1536))
- **action_items**: Extracted tasks (description, assigned_to, due_date, priority)
- **categories**: System + user categories
- **processing_jobs**: Background task tracking
- **search_history**: Analytics

Key features:
- Cross-database user_id references to `andora_db.users(id)`
- pgvector indexes for semantic search
- Full-text search indexes
- Auto-updated timestamps via triggers

### 2. Auth Module: `/var/www/cabinet/backend/app/core/auth.py`

```python
# Key function: get_current_user()
# - Decode JWT using SAME secret as py.raysourcelabs.com
# - Query andora_db.users to validate user exists
# - Return user dict for request context
```

### 3. Background Pipeline: `/var/www/cabinet/backend/app/services/background_tasks.py`

Processing steps:
1. Transcribe audio/video (Whisper API)
2. AI analysis (categorization, sentiment, action items, summary)
3. Text chunking (1000 chars, 200 overlap)
4. Generate embeddings (OpenAI ada-002)
5. Store vectors in pgvector
6. Update job status

### 4. Config: `/var/www/cabinet/backend/app/config.py`

Critical settings:
- `JWT_SECRET`: Same as py backend
- `AUTH_DATABASE_NAME`: "andora_db"
- `DATABASE_NAME`: "cabinet_db"
- AI API keys from py backend's .env

### 5. Nginx Config: `/etc/nginx/sites-available/cabinet.raysourcelabs.com`

Key features:
- Extended timeouts (600s for transcription)
- Large file uploads (500MB)
- WebSocket support for real-time progress
- Proxy to localhost:5002

### 6. Systemd Service: `/etc/systemd/system/cabinet.service`

```ini
[Service]
ExecStart=/usr/local/bin/uvicorn app.main:app \
    --host 0.0.0.0 --port 5002 --workers 4
```

---

## API Endpoints

### Authentication
- `GET /api/v1/auth/me` - Validate JWT, get user profile

### Transcripts
- `GET /api/v1/transcripts` - List user's transcripts (paginated, filterable)
- `POST /api/v1/transcripts` - Create from text paste
- `GET /api/v1/transcripts/{id}` - Get details
- `PUT /api/v1/transcripts/{id}` - Update
- `DELETE /api/v1/transcripts/{id}` - Delete

### Upload & Processing
- `POST /api/v1/upload/audio` - Upload MP3/WAV/M4A for transcription
- `POST /api/v1/upload/video` - Upload MP4/MOV for transcription
- `GET /api/v1/jobs/{id}` - Get processing job status

### Search
- `POST /api/v1/search/semantic` - Vector similarity search
- `POST /api/v1/search/keyword` - Full-text search
- `POST /api/v1/search/combined` - Hybrid search

### Meetings
- `GET /api/v1/meetings` - List meetings
- `POST /api/v1/meetings` - Create meeting
- `GET /api/v1/meetings/{id}/transcripts` - Get all transcripts in meeting

### Action Items
- `GET /api/v1/action-items` - List all action items
- `PATCH /api/v1/action-items/{id}/complete` - Mark complete

### Analytics
- `GET /api/v1/analytics/overview` - Dashboard stats
- `GET /api/v1/analytics/trends` - Usage trends

---

## AI Processing Pipeline

### Step 1: Transcription
- **Audio**: OpenAI Whisper API (`whisper-1` model)
- **Video**: Extract audio via ffmpeg → Whisper
- **Output**: Full text, language, confidence, duration

### Step 2: AI Analysis
Use GPT-4o or Claude (based on user preference from andora_db.users):

Extracts:
- **Summary**: 2-3 sentence overview
- **Key Insights**: Bullet points of important topics
- **Sentiment**: positive/neutral/negative/mixed + score (-1.0 to 1.0)
- **Categories**: Auto-assign from system categories
- **Tags**: Specific topics discussed
- **Action Items**: Tasks with assigned_to, due_date, priority, confidence

### Step 3: Embedding Generation
- Chunk text (1000 chars, 200 overlap)
- Generate embeddings via OpenAI `text-embedding-ada-002`
- Store in `transcript_chunks` table with vector(1536) column

### Step 4: Semantic Search
Query: User search text → embedding
Search: Cosine similarity via pgvector `<=>` operator
Results: Top 10 most similar transcript chunks

---

## Deployment Steps

### Phase 1: Database Setup
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE cabinet_db;"

# Run schema
sudo -u postgres psql -d cabinet_db -f /var/www/cabinet/backend/migrations/init_cabinet_db.sql

# Verify
sudo -u postgres psql -d cabinet_db -c "\dt"
```

### Phase 2: Backend Setup
```bash
# Create directories
mkdir -p /var/www/cabinet/backend/uploads/{audio,video}
mkdir -p /var/www/cabinet/logs

# Install dependencies
cd /var/www/cabinet/backend
pip3 install -r requirements.txt

# Install ffmpeg (for video processing)
yum install -y ffmpeg

# Create .env file
cp .env.example .env
nano .env  # Add JWT_SECRET, DB passwords, API keys
```

### Phase 3: Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/cabinet.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable cabinet.service
sudo systemctl start cabinet.service

# Verify
sudo systemctl status cabinet.service
```

### Phase 4: Nginx Configuration
```bash
# Create config
sudo nano /etc/nginx/sites-available/cabinet.raysourcelabs.com

# Enable site
sudo ln -s /etc/nginx/sites-available/cabinet.raysourcelabs.com /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Phase 5: SSL Certificate
```bash
sudo certbot --nginx -d cabinet.raysourcelabs.com
```

### Phase 6: Verify
```bash
# Health check
curl https://cabinet.raysourcelabs.com/api/v1/health

# Test auth (with token from py.raysourcelabs.com)
curl -H "Authorization: Bearer <token>" https://cabinet.raysourcelabs.com/api/v1/auth/me
```

---

## Environment Variables (.env)

```bash
# App
APP_NAME=Cabinet
ENVIRONMENT=production
PORT=5002

# CRITICAL: Same JWT secret as py.raysourcelabs.com
JWT_SECRET=lLM33oO5g6u9t8MIMsQgpIvVooO3iRpXZxbjRZp+gY4=

# Database
DATABASE_NAME=cabinet_db
AUTH_DATABASE_NAME=andora_db
DATABASE_USER=andora_user
DATABASE_PASSWORD=898post.0000///////

# AI API Keys (from /var/www/ceo/backend/.env)
OPENAI_API_KEY=<copy from py backend>
ANTHROPIC_API_KEY=<copy from py backend>

# File Upload
UPLOAD_DIR=/var/www/cabinet/backend/uploads
MAX_UPLOAD_SIZE_MB=500

# AI Models
WHISPER_MODEL=whisper-1
EMBEDDING_MODEL=text-embedding-ada-002
ANALYSIS_MODEL=gpt-4o

# CORS
CORS_ORIGINS=https://cabinet.raysourcelabs.com,https://py.raysourcelabs.com
```

---

## Frontend Integration

### Authentication Flow
1. User logs into py.raysourcelabs.com → gets JWT token
2. User visits cabinet.raysourcelabs.com
3. Cabinet frontend checks localStorage for `auth_token`
4. If found, validates via `GET /api/v1/auth/me`
5. All API requests include `Authorization: Bearer <token>`

### Cross-Domain Token Sharing
Since py and cabinet are different subdomains, localStorage is NOT shared.

**Solution**: User logs in separately on cabinet using same credentials:
- Cabinet login calls py's auth endpoint (or has its own that validates against andora_db)
- Token stored in cabinet's localStorage
- Shared authentication via same JWT secret + user database

---

## Python Dependencies (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
pgvector==0.3.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
openai==1.59.5
anthropic==0.41.1
python-multipart==0.0.20
pydantic-settings==2.7.0
python-dotenv==1.0.1
aiofiles==24.1.0
python-ffmpeg==2.0.12
```

---

## Monitoring & Maintenance

### Logs
- Application: `/var/www/cabinet/logs/cabinet.log`
- Systemd: `journalctl -u cabinet.service -f`
- Nginx: `/var/log/nginx/cabinet.raysourcelabs.com.access.log`

### Health Checks
```bash
# Service status
sudo systemctl status cabinet.service

# Database connections
sudo -u postgres psql -d cabinet_db -c "SELECT count(*) FROM transcripts;"

# API health
curl https://cabinet.raysourcelabs.com/api/v1/health
```

### Backups
```bash
# Database
pg_dump -U andora_user cabinet_db > /backups/cabinet_$(date +%Y%m%d).sql

# Uploads
tar -czf /backups/cabinet_uploads_$(date +%Y%m%d).tar.gz /var/www/cabinet/backend/uploads/
```

---

## Implementation Order

1. **Database**: Create cabinet_db and run schema migration
2. **Backend Core**: config.py, database.py, auth.py
3. **Models & Schemas**: Define SQLAlchemy models and Pydantic schemas
4. **Services**: transcription.py, ai_analysis.py, embeddings.py
5. **API Endpoints**: Implement REST endpoints
6. **Background Tasks**: Async processing pipeline
7. **Deployment**: Systemd service, Nginx config, SSL
8. **Testing**: Verify auth, upload, search
9. **Frontend**: React app (future phase)

---

## Success Criteria

- ✅ JWT tokens from py.raysourcelabs.com work on cabinet.raysourcelabs.com
- ✅ Audio/video files transcribed successfully via Whisper
- ✅ AI analysis extracts categories, sentiment, action items, summary
- ✅ Semantic search returns relevant transcript chunks
- ✅ Background processing completes without blocking API
- ✅ Systemd service auto-restarts on failure
- ✅ HTTPS enabled with Let's Encrypt certificate
- ✅ Large files (500MB) upload successfully

---

## Files to Reference During Implementation

### Auth Pattern
- `/var/www/ceo/backend/src/middleware/auth.ts` - JWT validation example
- `/var/www/ceo/backend/src/controllers/authController.ts` - Login/register flow

### Database Pattern
- `/var/www/ceo/backend/src/database/schema.sql` - PostgreSQL schema structure

### Deployment Pattern
- `/etc/nginx/sites-available/py.raysourcelabs.com` - Nginx config example
- `/etc/systemd/system/pm2-root.service` - Systemd service example

### Environment Variables
- `/var/www/ceo/backend/.env` - Copy JWT_SECRET and API keys from here

---

## Git Repository Setup

### GitHub Repository Creation

```bash
# 1. Initialize git in project directory
cd /var/www/cabinet
git init

# 2. Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.venv

# Environment variables
.env
.env.local

# Uploads (large files)
backend/uploads/
*.mp3
*.mp4
*.wav
*.m4a
*.mov

# Logs
logs/
*.log

# Database
*.db
*.sql.backup

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Distribution
dist/
build/
*.egg-info/
EOF

# 3. Create initial commit
git add .
git commit -m "Initial commit: Cabinet intelligent transcript processing system

- FastAPI backend with shared JWT auth from py.raysourcelabs.com
- PostgreSQL database (cabinet_db) with pgvector for semantic search
- OpenAI Whisper integration for audio/video transcription
- GPT-4/Claude for AI analysis (categorization, sentiment, action items)
- Systemd service configuration
- Nginx reverse proxy config
- Complete database schema with migrations"

# 4. Create GitHub repository (using gh CLI or web)
# Option A: Using GitHub CLI (if installed)
gh repo create cabinet --public --source=. --remote=origin --push

# Option B: Manual (if gh CLI not available)
# - Go to github.com and create new repository named "cabinet"
# - Then run:
git remote add origin https://github.com/<your-username>/cabinet.git
git branch -M main
git push -u origin main
```

### Repository Structure

The repository will contain:
```
cabinet/
├── backend/                    # FastAPI application
│   ├── app/
│   ├── migrations/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/                   # (Future React app)
├── docs/
│   └── API.md                  # API documentation
├── deployment/
│   ├── nginx/                  # Nginx config templates
│   ├── systemd/                # Systemd service files
│   └── scripts/                # Deployment scripts
├── .gitignore
├── README.md                   # Project overview
└── LICENSE
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Active development
- `feature/*` - Feature branches
- `hotfix/*` - Urgent fixes

### Commit After Implementation

After completing all implementation steps:
```bash
cd /var/www/cabinet
git add .
git commit -m "feat: Complete Cabinet v1.0 implementation

- Implemented all API endpoints
- Integrated Whisper transcription
- Added AI analysis pipeline
- Configured semantic search with pgvector
- Deployed systemd service
- Configured Nginx reverse proxy
- Obtained SSL certificate"

git push origin main
```

---

This plan provides a complete, production-ready architecture for Cabinet that integrates seamlessly with your existing infrastructure while maintaining clean separation of concerns.
