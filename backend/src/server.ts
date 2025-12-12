import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import formbody from '@fastify/formbody';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';
import brandRoutes from './routes/brandRoutes';
import characterRoutes from './routes/characterRoutes';
import eventRoutes from './routes/events';
import embedEventsRoutes from './routes/embedEvents';
import undoEmbedEventRoutes from './routes/undoEmbedEvents';
import seasonRoutes from './routes/seasons';
import contentRoutes from './routes/content';
import aiRoutes from './routes/ai';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import emailRoutes from './routes/email';
import dashboardRoutes from './routes/dashboard';
import tokensRoutes from './routes/tokens';
import agentConfigRoutes from './routes/agentConfig';
import eventRefreshRoutes from './routes/eventRefresh';

// Import database
import pool from './database/db';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
  bodyLimit: 52428800, // 50MB in bytes
  trustProxy: true,
});

// Register plugins
const startServer = async () => {
  try {
    // Register JWT plugin
    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'default-secret-key',
    });

    // Register CORS
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    });

    // Register Helmet for security headers
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Disable CSP to avoid conflicts with frontend
    });

    // Register formbody for URL-encoded bodies
    await fastify.register(formbody);

    // Note: JWT plugin automatically decorates request with 'user' property
    // No need to manually decorate

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'OK',
        message: 'Andora API is running',
        timestamp: new Date().toISOString(),
      };
    });

    // Register API Routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(brandRoutes, { prefix: '/api/brands' });
    await fastify.register(characterRoutes, { prefix: '/api/characters' });
    await fastify.register(eventRoutes, { prefix: '/api/events' });
    await fastify.register(eventRefreshRoutes, { prefix: '/api/events' }); // Event refresh endpoints
    await fastify.register(embedEventsRoutes, { prefix: '/api/embed-events' });
    await fastify.register(undoEmbedEventRoutes, { prefix: '/api/undo-embed-events' });
    await fastify.register(seasonRoutes, { prefix: '/api/seasons' });
    await fastify.register(contentRoutes, { prefix: '/api/content' });
    await fastify.register(aiRoutes, { prefix: '/api/ai' });
    await fastify.register(publicRoutes, { prefix: '/api/public' });
    await fastify.register(adminRoutes, { prefix: '/api/admin' });
    await fastify.register(emailRoutes, { prefix: '/api/email' });
    await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
    await fastify.register(tokensRoutes, { prefix: '/api/tokens' });
    await fastify.register(agentConfigRoutes, { prefix: '/api/agent-config' });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({ error: 'Route not found' });
    });

    // Global error handler
    fastify.setErrorHandler((error: Error, request, reply) => {
      fastify.log.error(error);
      reply.status((error as any).statusCode || 500).send({
        error: error.message || 'Internal server error',
      });
    });

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Start listening
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Andora Backend running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`💜 Ready to turn brands into legends!`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default fastify;
