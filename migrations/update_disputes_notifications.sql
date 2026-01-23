-- Migration: Update disputes and notifications tables
-- Run with: sqlite3 src/backend/db/sqlite.db < migrations/update_disputes_notifications.sql

-- Add missing columns to disputes table if they don't exist
-- Note: SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we'll handle errors

-- Try to add admin_response column
ALTER TABLE disputes ADD COLUMN admin_response TEXT;
-- Try to add producer_response column  
ALTER TABLE disputes ADD COLUMN producer_response TEXT;

-- For notifications table, we need to check if it needs updating
-- If the table has 'read' instead of 'is_read', recreate it

-- This is handled by the schema on fresh installs
-- For existing databases, we'll update in a separate script if needed
