import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/index.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import topologiesRoutes from './routes/topologies.js';
import { initAuthVault, getAuthMode, isAuthVaultActive, getAuthConfig } from './lib/auth-unified.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = parseInt(process.env.API_PORT || '9101');
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || '9100');
const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
const ALLOWED_IPS = process.env.ALLOWED_IPS || '0.0.0.0';

// Parse allowed IPs into an array
const parseAllowedIPs = (ipString: string): string[] => {
  if (ipString === '0.0.0.0') return []; // Empty array means allow all
  return ipString.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
};

// Check if an IP matches a pattern (supports CIDR notation)
const ipMatches = (clientIP: string, pattern: string): boolean => {
  // Handle exact match
  if (clientIP === pattern) return true;
  
  // Handle localhost variations
  if (pattern === '127.0.0.1' && (clientIP === '::1' || clientIP === '::ffff:127.0.0.1')) return true;
  
  // Handle CIDR notation (e.g., 192.168.1.0/24)
  if (pattern.includes('/')) {
    const [network, bits] = pattern.split('/');
    const mask = parseInt(bits);
    const networkParts = network.split('.').map(Number);
    const clientParts = clientIP.replace('::ffff:', '').split('.').map(Number);
    
    if (networkParts.length !== 4 || clientParts.length !== 4) return false;
    
    const networkInt = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
    const clientInt = (clientParts[0] << 24) | (clientParts[1] << 16) | (clientParts[2] << 8) | clientParts[3];
    const maskInt = (~0 << (32 - mask)) >>> 0;
    
    return (networkInt & maskInt) === (clientInt & maskInt);
  }
  
  return false;
};

const allowedIPList = parseAllowedIPs(ALLOWED_IPS);

// IP Whitelist Middleware
const ipWhitelistMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // If no specific IPs configured (0.0.0.0), allow all
  if (allowedIPList.length === 0) {
    return next();
  }
  
  // Get client IP
  const clientIP = req.ip || req.socket.remoteAddress || '';
  const cleanIP = clientIP.replace('::ffff:', ''); // Handle IPv4-mapped IPv6
  
  // Check if client IP is allowed
  const isAllowed = allowedIPList.some(pattern => ipMatches(cleanIP, pattern));
  
  if (isAllowed) {
    return next();
  }
  
  console.log(`[BLOCKED] Connection from ${cleanIP} - not in whitelist`);
  res.status(403).json({ error: 'Access denied. Your IP is not whitelisted.' });
};

// Middleware - Allow all origins in development, configure for production
app.use(cors({
  origin: true, // Allow all origins - in production, set specific origins
  credentials: true
}));

// Apply IP whitelist before other middleware
app.use(ipWhitelistMiddleware);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    console.log(`${new Date().toISOString()} [${clientIP}] ${req.method} ${req.path}`);
    next();
  });
}

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'OSPF-TEMPO-X API',
    version: '1.0.0',
    description: 'NetViz OSPF Network Analyzer API Server',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      topologies: '/api/topologies/*'
    },
    frontend: `http://localhost:${FRONTEND_PORT}`,
    documentation: 'See /api/health for server status'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealthy = await db.testConnection();
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    authVault: isAuthVaultActive() ? 'active' : 'inactive',
    authMode: getAuthMode()
  });
});

// Auth config endpoint for frontend
app.get('/api/auth/config', (req, res) => {
  res.json(getAuthConfig());
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

    // Initialize Auth-Vault
    const authVaultActive = await initAuthVault();

    // Start listening on configured host
    app.listen(PORT, SERVER_HOST, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║          OSPF-TEMPO-X API Server                              ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`   API Server:     http://${SERVER_HOST}:${PORT}`);
      console.log(`   Frontend:       http://localhost:${FRONTEND_PORT}`);
      console.log(`   Health Check:   http://${SERVER_HOST}:${PORT}/api/health`);
      console.log('');
      console.log('   Server Binding:');
      console.log(`     Host:         ${SERVER_HOST}`);
      console.log(`     IP Whitelist: ${ALLOWED_IPS === '0.0.0.0' ? 'All IPs allowed' : ALLOWED_IPS}`);
      console.log('');
      console.log('   Auth-Vault:');
      console.log(`     Status:       ${authVaultActive ? 'Active' : 'Inactive'}`);
      console.log(`     Mode:         ${getAuthMode()}`);
      console.log('');
      console.log('   Endpoints:');
      console.log('     POST /api/auth/login     - User login');
      console.log('     GET  /api/auth/me        - Get current user');
      console.log('     GET  /api/auth/config    - Auth configuration');
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

