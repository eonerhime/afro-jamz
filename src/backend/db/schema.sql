-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('producer','buyer')) NOT NULL,
    wallet_balance REAL DEFAULT 0 CHECK(wallet_balance >= 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Beats table
CREATE TABLE IF NOT EXISTS beats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    tempo INTEGER NOT NULL,
    key TEXT,
    description TEXT,
    audio_file_path TEXT NOT NULL,
    producer_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producer_id) REFERENCES users(id)
);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    usage_rights TEXT,
    default_price REAL NOT NULL DEFAULT 0 CHECK(default_price >= 0),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beat_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    license_id INTEGER NOT NULL,
    price REAL NOT NULL,
    commission REAL NOT NULL,
    seller_earnings REAL NOT NULL,
    payment_method_id INTEGER,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    hold_until_date DATETIME NOT NULL,
    refund_status TEXT DEFAULT NULL CHECK(refund_status IN (NULL, 'requested', 'approved', 'denied')),
    FOREIGN KEY (beat_id) REFERENCES beats(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (license_id) REFERENCES licenses(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('stripe', 'paystack', 'card')),
    last_four TEXT NOT NULL,
    is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producer_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'completed', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (producer_id) REFERENCES users(id)
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    raised_by INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'under_review', 'resolved', 'rejected')),
    admin_response TEXT,
    producer_response TEXT,
    resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (raised_by) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id INTEGER,
    reference_type TEXT,
    is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
    amount REAL NOT NULL CHECK(amount > 0),
    balance_after REAL NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
