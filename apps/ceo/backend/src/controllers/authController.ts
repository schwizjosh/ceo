import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { body, validationResult } from 'express-validator';
import { emailService } from '../services/emailService';
import pool from '../database/db';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  // Register new user
  register: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { email, password, full_name, terms } = request.body as any;

      // Basic validation
      if (!email || !password || !full_name || terms !== 'true') {
        reply.status(400).send({ error: 'Missing required fields or terms not accepted' });
        return;
      }

      if (password.length < 8) {
        reply.status(400).send({ error: 'Password must be at least 8 characters' });
        return;
      }

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        reply.status(400).send({ error: 'User already exists' });
        return;
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create user
      const user = await UserModel.create({
        email,
        password_hash,
        full_name,
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '7d' }
      );

      reply.status(201).send({
        message: 'User created successfully',
        token,
        user: {
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan || 'free',
          tokens: user.tokens || 10000,
          plan_expiry: user.plan_expiry,
          preferred_ai_provider: user.preferred_ai_provider || 'openai',
          preferred_ai_model: user.preferred_ai_model || 'gpt-4',
          timezone: user.timezone || 'Africa/Lagos',
          is_admin: user.is_admin || false,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Login user
  login: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { email, password } = request.body as any;

      // Basic validation
      if (!email || !password) {
        reply.status(400).send({ error: 'Email and password are required' });
        return;
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        reply.status(401).send({ error: 'Invalid credentials' });
        return;
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        reply.status(401).send({ error: 'Invalid credentials' });
        return;
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '7d' }
      );

      reply.send({
        message: 'Login successful',
        token,
        user: {
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan || 'free',
          tokens: user.tokens || 10000,
          plan_expiry: user.plan_expiry,
          preferred_ai_provider: user.preferred_ai_provider || 'openai',
          preferred_ai_model: user.preferred_ai_model || 'gpt-4',
          timezone: user.timezone || 'Africa/Lagos',
          is_admin: user.is_admin || false,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Get current user
  me: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      // User is already attached by the authenticate middleware
      const userId = (request as any).user?.id;

      if (!userId) {
        reply.status(401).send({ error: 'Not authenticated' });
        return;
      }

      const user = await UserModel.findById(userId);

      if (!user) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      reply.send({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan: user.plan || 'free',
        tokens: user.tokens || 10000,
        plan_expiry: user.plan_expiry,
        preferred_ai_provider: user.preferred_ai_provider || 'openai',
        preferred_ai_model: user.preferred_ai_model || 'gpt-4',
        timezone: user.timezone || 'Africa/Lagos',
        is_admin: user.is_admin || false,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Forgot password - send reset email
  forgotPassword: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { email } = request.body as any;

      // Basic validation
      if (!email) {
        reply.status(400).send({ error: 'Email is required' });
        return;
      }

      // Find user
      const user = await UserModel.findByEmail(email);

      // For security, always return success even if user doesn't exist
      if (!user) {
        reply.send({
          message: 'If an account exists with that email, a password reset link has been sent.'
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET token_hash = $2, expires_at = $3, created_at = NOW()`,
        [user.id, resetTokenHash, resetTokenExpiry]
      );

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken, user.full_name);

      reply.send({
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Reset password with token
  resetPassword: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { token, password } = request.body as any;

      // Basic validation
      if (!token || !password) {
        reply.status(400).send({ error: 'Token and password are required' });
        return;
      }

      if (password.length < 8) {
        reply.status(400).send({ error: 'Password must be at least 8 characters' });
        return;
      }

      // Hash the token to compare with stored hash
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid token
      const tokenResult = await pool.query(
        `SELECT user_id, expires_at
         FROM password_reset_tokens
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [resetTokenHash]
      );

      if (tokenResult.rows.length === 0) {
        reply.status(400).send({ error: 'Invalid or expired reset token' });
        return;
      }

      const userId = tokenResult.rows[0].user_id;

      // Hash new password
      const password_hash = await bcrypt.hash(password, 12);

      // Update user password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [password_hash, userId]
      );

      // Delete used token
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

      reply.send({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Update user preferences (AI provider/model, timezone)
  updatePreferences: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const userId = (request as AuthRequest).user?.id;
      if (!userId) {
        reply.status(401).send({ error: 'Not authenticated' });
        return;
      }

      const { preferred_ai_provider, preferred_ai_model, timezone } = request.body as any;
      const updates: string[] = [];
      const values: any[] = [userId];
      let idx = 2;

      if (preferred_ai_provider) {
        updates.push(`preferred_ai_provider = $${idx++}`);
        values.push(preferred_ai_provider);
      }
      if (preferred_ai_model) {
        updates.push(`preferred_ai_model = $${idx++}`);
        values.push(preferred_ai_model);
      }
      if (timezone) {
        updates.push(`timezone = $${idx++}`);
        values.push(timezone);
      }

      if (updates.length === 0) {
        reply.status(400).send({ error: 'No preferences provided' });
        return;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING id, email, full_name, plan, tokens, plan_expiry, preferred_ai_provider, preferred_ai_model, timezone, is_admin
      `;

      const result = await pool.query(query, values);
      const user = result.rows[0];

      reply.send({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        plan: user.plan || 'free',
        tokens: user.tokens || 10000,
        plan_expiry: user.plan_expiry,
        preferred_ai_provider: user.preferred_ai_provider || 'openai',
        preferred_ai_model: user.preferred_ai_model || 'gpt-4o',
        timezone: user.timezone || 'Africa/Lagos',
        is_admin: user.is_admin || false,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      reply.status(500).send({ error: 'Failed to update preferences' });
    }
  },
};
