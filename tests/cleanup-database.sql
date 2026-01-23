-- Clean all tables except licenses for fresh testing
-- Run this before running Thunder Client tests

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Delete all data (except licenses)
DELETE FROM notifications;
DELETE FROM disputes;
DELETE FROM withdrawals;
DELETE FROM purchases;
DELETE FROM producer_indemnity;
DELETE FROM payment_methods;
DELETE FROM beat_variants;
DELETE FROM beat_licenses;
DELETE FROM beats;
DELETE FROM users;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Reset autoincrement counters
DELETE FROM sqlite_sequence WHERE name IN ('users', 'beats', 'beat_licenses', 'beat_variances', 'purchases', 'payment_methods', 'producer_indemnity', 'withdrawals', 'disputes', 'notifications');

-- Verify cleanup
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Beats: ' || COUNT(*) FROM beats;
SELECT 'Beat Licenses: ' || COUNT(*) FROM beat_licenses;
SELECT 'Beat Variants: ' || COUNT(*) FROM beat_variants;
SELECT 'Licenses: ' || COUNT(*) FROM licenses;
SELECT 'Notifications: ' || COUNT(*) FROM notifications;
SELECT 'Purchases: ' || COUNT(*) FROM purchases;
SELECT 'Producer Indemnity: ' || COUNT(*) FROM producer_indemnity;
SELECT 'Payment Methods: ' || COUNT(*) FROM payment_methods;
SELECT 'Withdrawals: ' || COUNT(*) FROM withdrawals;

-- Show remaining licenses (should be 5 default ones)
SELECT id, name, price, description FROM licenses ORDER BY id;
