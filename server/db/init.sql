-- Initialize database with default admin user
-- Password: V3ry$trongAdm1n!2025 (hashed with bcrypt)
-- This hash is generated with bcrypt rounds=10
-- IMPORTANT: This is a valid bcrypt hash that MUST match the password above

INSERT INTO users (id, username, password_hash, role, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'netviz_admin',
    '$2b$10$7JJqWHaDchuWk5dQ0emgv.Gt0Mqs67mNYbG/fV8ROr79yf/y/5q8m',
    'admin',
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- Create default user preferences for admin
INSERT INTO user_preferences (user_id, dark_mode, preferences)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    false,
    '{"showWelcome": true, "autoLoadTopology": false}'
)
ON CONFLICT (user_id) DO NOTHING;

