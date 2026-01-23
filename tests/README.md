# Database Cleanup Script for Testing

## How to Clean Database Before Testing

### Option 1: Using SQLite CLI
```bash
# Open database
sqlite3 src/backend/db/sqlite.db

# Run cleanup commands
.read tests/cleanup-database.sql

# Exit
.quit
```

### Option 2: Using PowerShell
```powershell
# Navigate to project root
cd C:\Users\Emo\afro-jamz

# Run cleanup
sqlite3 src/backend/db/sqlite.db < tests/cleanup-database.sql
```

### Option 3: Using Node.js Script
```bash
node tests/cleanup-script.js
```

---

## Manual Steps After Cleanup

### 1. Create Admin User
After running Thunder Client tests to create users, manually upgrade one to admin:

```sql
-- Open database
sqlite3 src/backend/db/sqlite.db

-- Update user to admin role (after registration via API)
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Verify
SELECT id, email, role FROM users WHERE role = 'admin';

-- Exit
.quit
```

### 2. Verify Licenses Remain
```sql
SELECT COUNT(*) FROM licenses;
-- Should return 5 (default licenses)
```

---

## Test Data Created by Thunder Client

After running all tests, you should have:
- **3 users**: producer, buyer, admin
- **1-2 beats**: uploaded by producer
- **1 license**: attached to beat
- **1 purchase**: buyer purchases beat
- **1 payment method**: buyer's card
- **0-1 disputes**: if testing dispute flow

---

## Download Test (Outside Thunder Client)

Since Thunder Client requires subscription for file downloads, use PowerShell:

```powershell
# 1. Get JWT token from login response (copy from Thunder Client)
$token = "eyJhbGciOi..."  # Replace with actual token

# 2. Download beat (replace beat ID and token as needed)
$headers = @{
  Authorization = "Bearer $token"
}

Invoke-WebRequest `
  -Uri "http://localhost:3001/api/beats/1/download" `
  -Headers $headers `
  -OutFile "C:\Users\Emo\Downloads\test-beat.mp3"

# 3. Verify download
Get-Item "C:\Users\Emo\Downloads\test-beat.mp3"
```

### Alternative: Get Secure Download URL
```powershell
# Get temporary download URL
Invoke-RestMethod `
  -Uri "http://localhost:3001/api/buyer/beats/1/secure-url" `
  -Headers @{Authorization = "Bearer $token"} `
  -Method GET

# Response will include downloadUrl with token
# Use that URL in browser or Invoke-WebRequest
```
