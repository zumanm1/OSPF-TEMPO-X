import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/index.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import topologiesRoutes from './routes/topologies.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.API_PORT || '9101');
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || '9100');

// Middleware
app.use(cors({
  origin: [
    `http://localhost:${FRONTEND_PORT}`,
    `http://127.0.0.1:${FRONTEND_PORT}`,
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealthy = await db.testConnection();
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/topologies', topologiesRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please ensure PostgreSQL is running.');
      process.exit(1);
    }

    // Initialize database schema
    await db.initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║          OSPF-TEMPO-X API Server                              ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`   API Server:     http://localhost:${PORT}`);
      console.log(`   Frontend:       http://localhost:${FRONTEND_PORT}`);
      console.log(`   Health Check:   http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('   Endpoints:');
      console.log('     POST /api/auth/login     - User login');
      console.log('     GET  /api/auth/me        - Get current user');
      console.log('     GET  /api/users          - List users (admin)');
      console.log('     GET  /api/topologies     - List topologies');
      console.log('     POST /api/topologies     - Create topology');
      console.log('');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

startServer();

export default app;

