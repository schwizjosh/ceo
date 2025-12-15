/**
 * JWT Utilities for Raysource Labs Platform
 * Shared JWT generation, validation, and decoding
 */

import jwt, { JwtPayload as LibJwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { JwtPayload, TokenPair, AuthConfig, AuthError } from './types';

// Default configuration - MUST be overridden with environment values
const DEFAULT_CONFIG: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: '7d',
    refreshExpiresIn: '30d',
    issuer: 'raysourcelabs.com',
    audience: ['py.raysourcelabs.com', 'cabinet.raysourcelabs.com'],
};

let config: AuthConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize auth config with environment-specific values
 */
export function initAuthConfig(overrides: Partial<AuthConfig>): void {
    config = { ...DEFAULT_CONFIG, ...overrides };

    if (!config.jwtSecret) {
        throw new Error('JWT_SECRET is required for authentication');
    }
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(payload: JwtPayload): string {
    const options: SignOptions = {
        expiresIn: config.jwtExpiresIn as string,
        issuer: config.issuer,
        audience: config.audience,
    };

    return jwt.sign(
        {
            id: payload.id,
            email: payload.email,
            is_admin: payload.is_admin || false,
        },
        config.jwtSecret,
        options
    );
}

/**
 * Generate a refresh token (longer expiry)
 */
export function generateRefreshToken(payload: Pick<JwtPayload, 'id'>): string {
    const options: SignOptions = {
        expiresIn: config.refreshExpiresIn as string,
        issuer: config.issuer,
        audience: config.audience,
    };

    return jwt.sign({ id: payload.id, type: 'refresh' }, config.jwtSecret, options);
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: payload.id });

    // Calculate expiry in seconds
    const expiresIn = typeof config.jwtExpiresIn === 'string'
        ? parseExpiry(config.jwtExpiresIn)
        : config.jwtExpiresIn;

    return {
        accessToken,
        refreshToken,
        expiresIn,
    };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
    const options: VerifyOptions = {
        issuer: config.issuer,
        audience: config.audience,
    };

    try {
        const decoded = jwt.verify(token, config.jwtSecret, options) as LibJwtPayload & JwtPayload;

        return {
            id: decoded.id,
            email: decoded.email,
            is_admin: decoded.is_admin,
            iat: decoded.iat,
            exp: decoded.exp,
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw createAuthError('EXPIRED_TOKEN', 'Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw createAuthError('INVALID_TOKEN', 'Invalid token');
        }
        throw createAuthError('UNAUTHORIZED', 'Authentication failed');
    }
}

/**
 * Decode a token without verification (use carefully!)
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.decode(token) as LibJwtPayload & JwtPayload;
        if (!decoded) return null;

        return {
            id: decoded.id,
            email: decoded.email,
            is_admin: decoded.is_admin,
            iat: decoded.iat,
            exp: decoded.exp,
        };
    } catch {
        return null;
    }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded?.exp) return true;

    return Date.now() >= decoded.exp * 1000;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Create a standardized auth error
 */
export function createAuthError(
    code: AuthError['code'],
    message: string
): AuthError {
    const statusCodes: Record<AuthError['code'], number> = {
        INVALID_TOKEN: 401,
        EXPIRED_TOKEN: 401,
        USER_NOT_FOUND: 404,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
    };

    return {
        code,
        message,
        statusCode: statusCodes[code],
    };
}

/**
 * Parse expiry string (e.g., '7d', '24h') to seconds
 */
function parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhdw])$/);
    if (!match) return 604800; // Default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800,
    };

    return value * (multipliers[unit] || 86400);
}

/**
 * Get current auth config (read-only)
 */
export function getAuthConfig(): Readonly<AuthConfig> {
    return { ...config };
}
