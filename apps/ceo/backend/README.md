# Py Backend API
Backend API for Py - AI-powered company strategy platform.

**Built with 💜 for Py**

**Framework**: Built with **Fastify v5** (migrated from Express) for high-performance HTTP handling, better TypeScript support, and enhanced developer experience.

## 🚀 Features

- **Authentication**: User registration and login with JWT
- **Brand Management**: Create and manage brand profiles
- **Character System**: AI-generated brand characters (Cast)
- **PostgreSQL Database**: Robust data storage
- **RESTful API**: Clean, organized endpoints
- **Type-Safe**: Built with TypeScript

## 📦 Installation

```bash
cd backend
npm install
```

## ⚙️ Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your credentials:
```env
DB_NAME=andora_db
DB_USER=postgres
DB_PASSWORD=898post.0000
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
```

## 🗄️ Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE andora_db;
```

2. Run the schema:
```bash
psql -U postgres -d andora_db -f src/database/schema.sql
```

Or connect to PostgreSQL and run:
```sql
\i src/database/schema.sql
```

## 🏃 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Brands (Protected)
- `GET /api/brands` - Get all user brands
- `GET /api/brands/:id` - Get single brand
- `POST /api/brands` - Create new brand
- `PUT /api/brands/:id` - Update brand
- `DELETE /api/brands/:id` - Delete brand

### Characters (Protected)
- `POST /api/characters/generate` - Generate characters with AI
- `POST /api/characters/regenerate` - Regenerate non-perfect characters
- `GET /api/characters/brand/:brandId` - Get all brand characters
- `POST /api/characters` - Create single character
- `PUT /api/characters/:id` - Update character
- `PUT /api/characters/:id/perfect` - Mark as perfect
- `DELETE /api/characters/:id` - Delete character

## 🔐 Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

## 📊 Database Schema

### Users
- id (UUID)
- email (unique)
- password_hash
- full_name
- created_at
- updated_at

### Brands
- id (UUID)
- user_id (FK)
- name
- tagline
- industry
- personality
- channels (JSON)
- ... (full brand profile)

### Brand Characters
- id (UUID)
- brand_id (FK)
- name
- description
- location
- personality_tags (JSON)
- role
- is_perfect (boolean)
- order_index

## 🛠️ Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📝 Example Requests

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "full_name": "John Doe",
    "terms": "true"
  }'
```

### Generate Characters
```bash
curl -X POST http://localhost:5000/api/characters/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "brand_id": "uuid-here",
    "count": 3,
    "hints": ["friendly", "creative"]
  }'
```

## 🔄 Development Workflow

1. Make changes to code
2. `nodemon` will auto-restart
3. Test endpoints with Postman/Thunder Client
4. Check logs in terminal

## 🐛 Debugging

- Check server logs in terminal
- Verify database connection
- Ensure `.env` is configured
- Check PostgreSQL is running

## 📦 Dependencies

**Production:**
- express
- pg
- dotenv
- bcryptjs
- jsonwebtoken
- cors
- express-validator
- helmet
- morgan

**Development:**
- typescript
- nodemon
- ts-node
- @types/*

## 🚀 Deployment

1. Build TypeScript:
```bash
npm run build
```

2. Set environment variables on server

3. Run migrations:
```bash
psql -U user -d andora_db -f src/database/schema.sql
```

4. Start server:
```bash
npm start
```

## 📄 License

ISC

---

**Built with 💜 for Andora**
