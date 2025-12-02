import { Router, Response } from 'express';
import db from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all topologies
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.name, t.description, t.created_at, t.updated_at,
              u.username as created_by_name,
              jsonb_array_length(t.data->'nodes') as node_count,
              jsonb_array_length(t.data->'links') as link_count
       FROM topologies t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.is_active = true
       ORDER BY t.updated_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get topologies error:', error);
    res.status(500).json({ error: 'Failed to get topologies' });
  }
});

// Get single topology with full data
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT t.*, u.username as created_by_name
       FROM topologies t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1 AND t.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Topology not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get topology error:', error);
    res.status(500).json({ error: 'Failed to get topology' });
  }
});

// Create topology
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, data } = req.body;

    if (!name || !data) {
      return res.status(400).json({ error: 'Name and data required' });
    }

    // Validate topology structure
    if (!data.nodes || !Array.isArray(data.nodes) || !data.links || !Array.isArray(data.links)) {
      return res.status(400).json({ error: 'Invalid topology structure' });
    }

    const result = await db.query(
      `INSERT INTO topologies (name, description, data, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_at`,
      [name, description || null, JSON.stringify(data), req.user!.id]
    );

    // Create initial snapshot
    await db.query(
      `INSERT INTO topology_snapshots (topology_id, description, data, created_by)
       VALUES ($1, $2, $3, $4)`,
      [result.rows[0].id, 'Initial topology', JSON.stringify(data), req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create topology error:', error);
    res.status(500).json({ error: 'Failed to create topology' });
  }
});

// Update topology
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, data, createSnapshot, snapshotDescription } = req.body;

    // Check ownership or admin
    const check = await db.query(
      'SELECT created_by FROM topologies WHERE id = $1 AND is_active = true',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Topology not found' });
    }

    if (check.rows[0].created_by !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to modify this topology' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (data !== undefined) {
      updates.push(`data = $${paramCount++}`);
      values.push(JSON.stringify(data));

      // Create snapshot if requested
      if (createSnapshot) {
        await db.query(
          `INSERT INTO topology_snapshots (topology_id, description, data, created_by)
           VALUES ($1, $2, $3, $4)`,
          [id, snapshotDescription || 'Manual snapshot', JSON.stringify(data), req.user!.id]
        );
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE topologies SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, description, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update topology error:', error);
    res.status(500).json({ error: 'Failed to update topology' });
  }
});

// Delete topology (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const check = await db.query(
      'SELECT created_by FROM topologies WHERE id = $1 AND is_active = true',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Topology not found' });
    }

    if (check.rows[0].created_by !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this topology' });
    }

    await db.query(
      'UPDATE topologies SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({ message: 'Topology deleted successfully' });
  } catch (error) {
    console.error('Delete topology error:', error);
    res.status(500).json({ error: 'Failed to delete topology' });
  }
});

// Get topology snapshots
router.get('/:id/snapshots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT s.id, s.description, s.created_at, u.username as created_by_name,
              jsonb_array_length(s.data->'nodes') as node_count,
              jsonb_array_length(s.data->'links') as link_count
       FROM topology_snapshots s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.topology_id = $1
       ORDER BY s.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get snapshots error:', error);
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

// Get single snapshot with full data
router.get('/:id/snapshots/:snapshotId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, snapshotId } = req.params;

    const result = await db.query(
      `SELECT * FROM topology_snapshots WHERE id = $1 AND topology_id = $2`,
      [snapshotId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get snapshot error:', error);
    res.status(500).json({ error: 'Failed to get snapshot' });
  }
});

// Create snapshot
router.post('/:id/snapshots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // Get current topology data
    const topology = await db.query(
      'SELECT data FROM topologies WHERE id = $1 AND is_active = true',
      [id]
    );

    if (topology.rows.length === 0) {
      return res.status(404).json({ error: 'Topology not found' });
    }

    const result = await db.query(
      `INSERT INTO topology_snapshots (topology_id, description, data, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, description, created_at`,
      [id, description || 'Manual snapshot', topology.rows[0].data, req.user!.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create snapshot error:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// Restore from snapshot
router.post('/:id/snapshots/:snapshotId/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, snapshotId } = req.params;

    const snapshot = await db.query(
      'SELECT data FROM topology_snapshots WHERE id = $1 AND topology_id = $2',
      [snapshotId, id]
    );

    if (snapshot.rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Update topology with snapshot data
    await db.query(
      'UPDATE topologies SET data = $1 WHERE id = $2',
      [snapshot.rows[0].data, id]
    );

    // Create a snapshot of the restoration
    await db.query(
      `INSERT INTO topology_snapshots (topology_id, description, data, created_by)
       VALUES ($1, $2, $3, $4)`,
      [id, `Restored from snapshot ${snapshotId}`, snapshot.rows[0].data, req.user!.id]
    );

    res.json({ message: 'Topology restored from snapshot' });
  } catch (error) {
    console.error('Restore snapshot error:', error);
    res.status(500).json({ error: 'Failed to restore snapshot' });
  }
});

export default router;

