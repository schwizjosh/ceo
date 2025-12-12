# Token System Implementation

## Overview
Implemented a complete token-based billing system for AI operations in Andora. Users are allocated tokens based on their plan, and tokens are automatically deducted after each successful AI request.

## What Was Implemented

### 1. Database Schema
- **Users table** already had `tokens` column (default was 100)
- **Migration 006**: Updated default tokens to **10,000** for free trial users
- Updated all existing free users from 100 tokens to 10,000 tokens

### 2. Token Routes (`/backend/src/routes/tokens.ts`)
Created new API endpoints:
- `POST /api/tokens/deduct` - Manually deduct tokens from user account
- `GET /api/tokens/balance` - Get current token balance

### 3. Token Deduction Middleware (`/backend/src/middleware/tokenDeduction.ts`)
Implemented two middleware functions:

#### `checkTokenBalance`
- Runs **before** AI requests
- Verifies user has at least 100 tokens (minimum for any AI call)
- Returns 402 status if insufficient tokens
- Prevents wasting AI API calls when user can't pay

#### `deductTokensMiddleware`
- Runs **after** AI responses
- Automatically intercepts `res.json()` calls
- Deducts tokens based on `tokensUsed` field in response
- Runs asynchronously (doesn't block response)
- Logs successful deductions and warnings for insufficient balance

### 4. AI Routes Integration
Updated `/backend/src/routes/ai.ts`:
```typescript
router.use(authenticate);           // Verify user is logged in
router.use(checkTokenBalance);      // Check sufficient tokens
router.use(deductTokensMiddleware); // Auto-deduct after success
```

All AI endpoints automatically:
1. Check token balance before processing
2. Deduct tokens after successful generation
3. Log token usage and remaining balance

### 5. Default Token Updates
Updated default token values throughout the codebase:
- `authController.ts` - Returns 10,000 tokens for new users
- `admin.ts` - Free plan default changed from 2,500 to 10,000
- Database default value set to 10,000

## Token Pricing by Plan

| Plan       | Tokens   | Price (NGN) | Price (USD) |
|------------|----------|-------------|-------------|
| Free       | 10,000   | ₦0          | $0          |
| Starter    | 15,000   | ₦5,000      | ~$3         |
| Basic      | 34,000   | ₦10,000     | ~$7         |
| Pro        | 90,000   | ₦25,000     | ~$17        |
| Standard   | 200,000  | ₦50,000     | ~$33        |
| Premium    | 600,000  | ₦125,000    | ~$83        |
| Ultimate   | 1.3M     | ₦250,000    | ~$167       |
| Enterprise | 2.8M     | ₦500,000    | ~$333       |

## How Token Deduction Works

### Example Flow:
1. User requests AI-generated content via frontend
2. Request hits `/api/ai/generate-characters` endpoint
3. **Middleware checks**: User has >= 100 tokens
4. **AI Controller** processes request using orchestrator
5. AI service returns response with `tokensUsed: 1500`
6. **Response sent** to frontend with token info
7. **Middleware intercepts** `res.json()` call
8. **Database updated**: `tokens = tokens - 1500`
9. Console logs: `✅ Deducted 1500 tokens from user abc123. Remaining: 8500`

### Token Calculation
Token usage is returned by the AI service based on actual API consumption:
- GPT-4o: ~$0.0025 per 1K input tokens, $0.01 per 1K output
- GPT-4o-mini: ~$0.00015 per 1K input, $0.0006 per 1K output
- Claude Sonnet: ~$0.003 per 1K input, $0.015 per 1K output

Internal tokens are abstracted representations of AI API usage costs.

## Testing Token System

### Check Current Balance
```bash
curl -X GET https://andorabrand.me/api/tokens/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Manual Deduction (Admin Only)
```bash
curl -X POST https://andorabrand.me/api/tokens/deduct \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

### Database Query
```bash
PGPASSWORD='898post.0000/////' psql -h localhost -U postgres -d andora_db \
  -c "SELECT email, plan, tokens FROM users ORDER BY created_at DESC LIMIT 10;"
```

## Files Modified/Created

### Created:
1. `/backend/src/routes/tokens.ts` - Token API endpoints
2. `/backend/src/middleware/tokenDeduction.ts` - Automatic deduction logic
3. `/backend/src/database/migrations/006_update_default_tokens.sql` - Migration

### Modified:
1. `/backend/src/server.ts` - Registered tokens routes
2. `/backend/src/routes/ai.ts` - Added token middleware
3. `/backend/src/controllers/authController.ts` - Updated default tokens to 10,000
4. `/backend/src/routes/admin.ts` - Updated free plan tokens to 10,000

## Current Status

✅ **All users now have 10,000 trial tokens**
✅ **Token deduction is automatic** on all AI endpoints
✅ **Token balance checks** prevent usage when insufficient
✅ **Admin routes** allow token management
✅ **Database migration** completed successfully
✅ **Backend server** restarted and running

## Next Steps (Optional)

1. **Frontend Integration**: Update UI to display token balance
2. **Token History**: Create audit log for token usage
3. **Top-up System**: Implement payment gateway for token purchases
4. **Notifications**: Alert users when tokens are low (< 1000)
5. **Analytics**: Track token usage patterns per user/plan
6. **Refund System**: Return tokens if AI request fails

## Admin Management

Admins can manage tokens via `/api/admin` routes:

### Add Tokens to User
```bash
POST /api/admin/users/:userId/tokens
{ "amount": 5000 }
```

### Reset All Plan Tokens
```bash
POST /api/admin/tokens/reset
{ "plan": "free", "amount": 10000 }
```

### Update User Plan
```bash
PATCH /api/admin/users/:userId
{ "plan": "pro", "tokens": 90000 }
```

---

**Implementation Date**: November 3, 2025
**Developer**: Claude Code + Josh
**Status**: ✅ Production Ready
