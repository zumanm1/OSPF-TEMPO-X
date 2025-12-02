import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ospf-tempo-x-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'user';
  };
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

// Generate JWT token
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Authentication middleware
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Verify user still exists and is active
    const result = await db.query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Admin-only middleware
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export default {
  authenticate,
  requireAdmin,
  generateToken,
  verifyToken
};

