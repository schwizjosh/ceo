import { FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';

// Using type alias instead of interface to avoid conflicts with Fastify's JWT types
export type AuthRequest = FastifyRequest & {
  user?: {
    id: string;
    email: string;
    is_admin?: boolean;
  };
};

export const authenticate = async (
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Verify JWT using Fastify's JWT plugin
    await request.jwtVerify();

    // The decoded token is available at request.user
    const decoded = request.user as {
      id: string;
      email: string;
      is_admin?: boolean;
    };

    // Attach user data to request
    request.user = {
      id: decoded.id,
      email: decoded.email,
      is_admin: decoded.is_admin,
    };
  } catch (error) {
    reply.status(401).send({ error: 'Invalid or expired token' });
    throw error; // Prevent route handler from executing
  }
};

// Alias for compatibility
export const authenticateToken = authenticate;

export const requireAdmin = async (
  request: AuthRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const user = request.user;

    if (!user?.id) {
      reply.status(401).send({ error: 'Not authenticated' });
      throw new Error('Not authenticated');
    }

    if (user.is_admin === true) {
      return;
    }

    const result = await pool.query<{ is_admin: boolean }>(
      'SELECT is_admin FROM users WHERE id = $1 LIMIT 1',
      [user.id]
    );

    if (result.rows[0]?.is_admin) {
      request.user = {
        id: user.id,
        email: user.email,
        is_admin: true
      };
      return;
    }

    reply.status(403).send({ error: 'Admin access required' });
    throw new Error('Admin access required');
  } catch (error) {
    if (!reply.sent) {
      console.error('Admin check failed:', error);
      reply.status(500).send({ error: 'Failed to verify admin access' });
    }
    throw error;
  }
};
