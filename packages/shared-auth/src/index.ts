/**
 * @raysourcelabs/shared-auth
 * Shared authentication utilities for Raysource Labs platform
 * 
 * Used by:
 * - CEO (py.raysourcelabs.com) - TypeScript/Node.js backend
 * - Cabinet (cabinet.raysourcelabs.com) - Python/FastAPI backend (via generated types)
 */

// Re-export all types
export * from './types';

// Re-export JWT utilities
export {
    initAuthConfig,
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    isTokenExpired,
    extractTokenFromHeader,
    createAuthError,
    getAuthConfig,
} from './jwt';

// Export a convenience function for middleware setup
import { verifyToken, extractTokenFromHeader, createAuthError } from './jwt';
import { JwtPayload, AuthUser, AuthError } from './types';

/**
 * Middleware-friendly authentication function
 * Can be used in Express, Fastify, or any Node.js HTTP framework
 */
export async function authenticateRequest(
    authHeader?: string
): Promise<{ user: AuthUser } | { error: AuthError }> {
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        return { error: createAuthError('UNAUTHORIZED', 'No token provided') };
    }

    try {
        const payload = verifyToken(token);

        return {
            user: {
                id: payload.id,
                email: payload.email,
                is_admin: payload.is_admin || false,
            },
        };
    } catch (error) {
        if (isAuthError(error)) {
            return { error };
        }
        return { error: createAuthError('UNAUTHORIZED', 'Authentication failed') };
    }
}

/**
 * Type guard for AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        'statusCode' in error
    );
}

/**
 * Check if result has user (type guard)
 */
export function hasUser(
    result: { user: AuthUser } | { error: AuthError }
): result is { user: AuthUser } {
    return 'user' in result;
}

/**
 * Password utilities (using bcryptjs for cross-platform compatibility)
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
