import { FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';
import { AuthRequest } from './auth';
import { tokenMonitorService } from '../services/tokenMonitor';

/**
 * Hook to deduct tokens after successful AI response
 * Use as onSend hook in routes that consume tokens
 */
export const deductTokensHook = async (
  request: AuthRequest,
  reply: FastifyReply,
  payload: any
) => {
  // Only process successful responses
  if (reply.statusCode !== 200) {
    return payload;
  }

  let parsedPayload: any;
  try {
    parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return payload;
  }

  // Extract tokensUsed from either root level or metadata
  let tokensUsed: number | undefined;

  if (parsedPayload) {
    // Check root level first (legacy format)
    if (typeof parsedPayload.tokensUsed === 'number') {
      tokensUsed = parsedPayload.tokensUsed;
    }
    // Check metadata (new format from aiController)
    else if (parsedPayload.metadata && typeof parsedPayload.metadata.tokensUsed === 'number') {
      tokensUsed = parsedPayload.metadata.tokensUsed;
    }
  }

  // Deduct tokens if found
  if (tokensUsed && tokensUsed > 0) {
    const userId = request.user?.id;

    if (userId) {
      // Deduct tokens asynchronously (don't block response)
      const taskType = request.url || 'unknown';
      deductTokens(userId, tokensUsed)
        .then((result) => {
          console.log(`✅ Deducted ${tokensUsed} tokens from user ${userId}. Remaining: ${result.remainingTokens}`);
          // Monitor the deduction
          tokenMonitorService.monitorDeduction(userId, tokensUsed, taskType, true);
        })
        .catch((error) => {
          console.error(`❌ Failed to deduct tokens for user ${userId}:`, error);
          // Monitor the failure
          tokenMonitorService.monitorDeduction(userId, tokensUsed, taskType, false);
        });
    }
  }

  return payload;
};

/**
 * Deduct tokens from user account
 */
async function deductTokens(
  userId: string,
  amount: number
): Promise<{ success: boolean; remainingTokens: number }> {
  try {
    // Get current token balance
    const userResult = await pool.query(
      'SELECT tokens FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      throw new Error('User not found');
    }

    const currentTokens = userResult.rows[0].tokens || 0;

    // Check if user has enough tokens
    if (currentTokens < amount) {
      console.error(`❌ User ${userId} has insufficient tokens (${currentTokens} < ${amount})`);
      // CRITICAL: Block the deduction - tokens cannot go negative
      throw new Error(`Insufficient tokens: have ${currentTokens}, need ${amount}`);
    }

    // Deduct tokens
    const updateResult = await pool.query(
      `UPDATE users
       SET tokens = tokens - $1, updated_at = NOW()
       WHERE id = $2
       RETURNING tokens`,
      [amount, userId]
    );

    const newBalance = updateResult.rows[0]?.tokens || 0;

    return {
      success: true,
      remainingTokens: newBalance
    };
  } catch (error) {
    console.error('Token deduction error:', error);
    throw error;
  }
}

/**
 * Hook to check if user has sufficient tokens before making AI call
 * Use as preHandler hook in routes that consume tokens
 */
export const checkTokenBalance = async (
  request: AuthRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;

    if (!userId) {
      reply.status(401).send({ error: 'Not authenticated' });
      return;
    }

    // Get current token balance
    const userResult = await pool.query(
      'SELECT tokens, plan FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows.length) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    const currentTokens = userResult.rows[0].tokens || 0;

    // Estimate required tokens based on endpoint
    const estimatedTokens = estimateTokensForEndpoint(request.url);

    if (currentTokens < estimatedTokens) {
      console.warn(`⚠️ User ${userId} has insufficient tokens for ${request.url}: ${currentTokens} < ${estimatedTokens}`);
      reply.status(402).send({
        error: 'Insufficient tokens',
        message: `You need approximately ${estimatedTokens} tokens for this operation. Please upgrade your plan.`,
        available: currentTokens,
        estimated: estimatedTokens,
        plan: userResult.rows[0].plan
      });
      return;
    }

    // Attach token info to request for logging
    (request as any).tokenInfo = {
      available: currentTokens,
      estimated: estimatedTokens
    };
  } catch (error) {
    console.error('Token balance check error:', error);
    reply.status(500).send({ error: 'Failed to check token balance' });
  }
};

/**
 * Estimate token requirements based on endpoint
 */
function estimateTokensForEndpoint(path: string): number {
  const estimates: Record<string, number> = {
    '/generate-characters': 2500,     // Complex character generation
    '/resolve-cast': 2000,             // Character resolution
    '/generate-monthly-plot': 1500,   // Monthly plotting
    '/generate-weekly-subplot': 2000, // Weekly subplot
    '/generate-calendar': 3000,        // Full calendar
    '/expand-brief': 1500,             // Brief expansion
    '/generate-content-brief': 1200,  // Content brief
    '/generate-vision': 500,           // Simple generation
    '/generate-mission': 500,
    '/generate-persona': 600,
    '/generate-buyer-profile': 600,
    '/generate-content-strategy': 800,
    '/refine-content': 1000,
    '/chat': 500,
    '/refine-character-field': 500
  };

  // Find matching estimate
  for (const [endpoint, tokens] of Object.entries(estimates)) {
    if (path.includes(endpoint)) {
      return tokens;
    }
  }

  // Default: require minimum 300 tokens for unknown endpoints
  return 300;
}
