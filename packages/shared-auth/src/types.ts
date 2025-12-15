/**
 * Shared User Types for Raysource Labs Platform
 * Used by: CEO (py.raysourcelabs.com), Cabinet (cabinet.raysourcelabs.com)
 */

/** Base user from database */
export interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

/** JWT payload structure */
export interface JwtPayload {
    id: string;
    email: string;
    is_admin?: boolean;
    iat?: number;
    exp?: number;
}

/** Authenticated request user (subset of User) */
export interface AuthUser {
    id: string;
    email: string;
    is_admin: boolean;
}

/** Token pair returned after login */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/** Auth config shared across apps */
export interface AuthConfig {
    jwtSecret: string;
    jwtExpiresIn: string | number;
    refreshExpiresIn: string | number;
    issuer: string;
    audience: string[];
}

/** Standard API error response */
export interface AuthError {
    code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'USER_NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN';
    message: string;
    statusCode: number;
}

/** User subscription/plan info */
export interface UserPlan {
    planId: string;
    planName: string;
    features: string[];
    limits: Record<string, number>;
    expiresAt?: Date;
}

/** Extended user with plan info */
export interface UserWithPlan extends User {
    plan?: UserPlan;
}
