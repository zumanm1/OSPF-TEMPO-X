import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { authenticate, generateToken, AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const result = await db.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Get user preferences
    const prefsResult = await db.query(
      'SELECT dark_mode, default_topology_id, preferences FROM user_preferences WHERE user_id = $1',
      [user.id]
    );

    const preferences = prefsResult.rows[0] || { dark_mode: false, preferences: {} };

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      preferences
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      'SELECT id, username, role, created_at, last_login FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get preferences
    const prefsResult = await db.query(
      'SELECT dark_mode, default_topology_id, preferences FROM user_preferences WHERE user_id = $1',
      [req.user!.id]
    );

    res.json({
      user: result.rows[0],
      preferences: prefsResult.rows[0] || { dark_mode: false, preferences: {} }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Change password
router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id]
    );

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, req.user!.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { darkMode, defaultTopologyId, preferences } = req.body;

    await db.query(
      `INSERT INTO user_preferences (user_id, dark_mode, default_topology_id, preferences)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         dark_mode = COALESCE($2, user_preferences.dark_mode),
         default_topology_id = COALESCE($3, user_preferences.default_topology_id),
         preferences = COALESCE($4, user_preferences.preferences),
         updated_at = CURRENT_TIMESTAMP`,
      [req.user!.id, darkMode, defaultTopologyId, preferences ? JSON.stringify(preferences) : null]
    );

    res.json({ message: 'Preferences updated' });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Logout (optional - client can just discard token)
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  // In a production app, you might invalidate the token in a blacklist
  res.json({ message: 'Logged out successfully' });
});

export default router;

