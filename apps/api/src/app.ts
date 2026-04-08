import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';
import { prisma } from './config/db';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import { sanitizeBody } from './middleware/sanitize';

// ─── Express App ────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// Request ID for tracing
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ─── Socket.io Setup ────────────────────────────────────────────────────────

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  if (env.NODE_ENV === 'development') {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
  }

  socket.on('join:project', (projectId: string) => {
    if (typeof projectId === 'string' && projectId.length > 0) {
      socket.join(`project:${projectId}`);
    }
  });

  socket.on('leave:project', (projectId: string) => {
    if (typeof projectId === 'string' && projectId.length > 0) {
      socket.leave(`project:${projectId}`);
    }
  });

  socket.on('join:user', (userId: string) => {
    // Only allow joining own user room
    if (userId === socket.data.userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    if (env.NODE_ENV === 'development') {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    }
  });
});

// Make io accessible to routes via app.locals
app.locals.io = io;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", env.CLIENT_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prevent HTTP parameter pollution
app.use((req, _res, next) => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = (req.query[key] as string[])[
          (req.query[key] as string[]).length - 1
        ];
      }
    }
  }
  next();
});

app.use(globalLimiter);
app.use(sanitizeBody);

// ─── Static Files ────────────────────────────────────────────────────────────

app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api', routes);

// 404 handler for unmatched routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    statusCode: 404,
  });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Server Start ───────────────────────────────────────────────────────────

const PORT = env.PORT;

async function start(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL');

    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] SIGTERM received. Shutting down...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

start();

export { app, server, io };
