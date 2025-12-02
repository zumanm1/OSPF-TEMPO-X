-- Initialize database with default admin user
-- Password: V3ry$trongAdm1n!2025 (hashed with bcrypt)
-- This hash is generated with bcrypt rounds=10

INSERT INTO users (id, username, password_hash, role, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'netviz_admin',
    '$2a$10$rQnM1vP8G5xJ2nK3bL4mC.8K9pL2nM4oQ6rS8tU0vW2xY4zA6bC8d',
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

