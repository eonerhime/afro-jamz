# Afro-Jamz Project Structure

## 📂 Directory Layout

```
afro-jamz/
├── .specify/                      # Project Specifications
│   ├── constitution.md            # Non-negotiable project rules
│   ├── specify.md                 # Feature specifications
│   ├── plan.md                    # Development plan & MVP strategy
│   ├── features/                  # Individual feature descriptions
│   ├── tasks/                     # Task breakdowns per feature
│   ├── api/                       # API specifications
│   └── schema/                    # Database schema docs
│
├── docs/                          # Documentation
│   ├── roadmaps/                  # Implementation plans
│   │   ├── feature-analysis.md    # Feature prioritization & analysis
│   │   └── implementation-roadmap.md  # 12-week implementation plan
│   ├── guides/                    # How-to guides
│   │   ├── testing.md             # Testing guide
│   │   └── api-documentation.md   # API usage examples
│   └── summaries/                 # Status reports
│       ├── backend-completion.md  # Backend completion report
│       ├── backend-updates.md     # Recent backend changes
│       └── completion-checklist.md # Project completion status
│
├── src/                           # Source Code
│   ├── backend/                   # Node.js + Express API
│   │   ├── server.js              # Main entry point
│   │   ├── app.js                 # Express app configuration
│   │   ├── routes/                # API route handlers
│   │   │   ├── auth.routes.js
│   │   │   ├── beats.routes.js
│   │   │   ├── purchases.routes.js
│   │   │   ├── licenses.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── payments.routes.js
│   │   │   └── payment-methods.routes.js
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.middleware.js # JWT verification
│   │   │   └── role.middleware.js # Role-based access control
│   │   ├── services/              # Business logic
│   │   │   └── auth.service.js
│   │   ├── db/                    # Database layer
│   │   │   ├── index.js           # DB connection
│   │   │   ├── init.js            # DB initialization
│   │   │   └── schema.sql         # Database schema
│   │   ├── config/                # Configuration
│   │   │   ├── config.js          # App configuration
│   │   │   └── swagger.js         # Swagger setup
│   │   ├── utils/                 # Utilities
│   │   │   ├── jwt.js             # JWT helpers
│   │   │   ├── monitoring.js      # Logging & monitoring
│   │   │   └── oauth.js           # OAuth utilities
│   │   ├── audio/                 # Audio file uploads (temporary)
│   │   └── __tests__/             # Automated tests
│   │       ├── setup.js
│   │       ├── business-logic.test.js
│   │       └── integration.test.js
│   │
│   └── frontend/                  # React + Vite app
│       ├── src/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   ├── api/               # API client
│       │   │   ├── client.js
│       │   │   ├── auth.js
│       │   │   ├── beats.js
│       │   │   ├── purchases.js
│       │   │   └── payments.js
│       │   └── assets/
│       ├── public/
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
│
├── db/                            # Database Files
│   └── afrojamz.db                # SQLite database (gitignored)
│
├── logs/                          # Application Logs
│   ├── combined.log               # All logs (gitignored)
│   └── error.log                  # Error logs only (gitignored)
│
├── migrations/                    # Database Migrations
│   ├── add_notifications.js
│   ├── setup_licenses.js
│   └── complete_migration.js
│
├── tests/                         # Test Files
│   └── thunder-client/            # API test collections
│       └── collections.json
│
├── .env                           # Environment variables (gitignored)
├── .gitignore                     # Git ignore rules
├── package.json                   # Node.js dependencies
├── jest.config.js                 # Jest test configuration
└── README.md                      # Main project README
```

## 🎯 Key Files

### Configuration
- **`.env`** - Environment variables (JWT secret, DB path, ports)
- **`package.json`** - Dependencies and npm scripts
- **`jest.config.js`** - Test runner configuration

### Core Backend
- **`src/backend/server.js`** - Main server entry point
- **`src/backend/db/schema.sql`** - Database schema definition
- **`src/backend/routes/*.routes.js`** - API endpoint definitions

### Documentation
- **`.specify/constitution.md`** - Project rules (MUST READ)
- **`docs/roadmaps/implementation-roadmap.md`** - Development roadmap
- **`docs/guides/testing.md`** - How to write and run tests

## 🔍 Finding Things

| What you need | Where to look |
|---------------|---------------|
| API endpoints | `src/backend/routes/` |
| Business logic | `src/backend/services/` |
| Database schema | `src/backend/db/schema.sql` |
| Authentication | `src/backend/middleware/auth.middleware.js` |
| Tests | `src/backend/__tests__/` |
| Project rules | `.specify/constitution.md` |
| Implementation plan | `docs/roadmaps/implementation-roadmap.md` |
| API documentation | `http://localhost:3001/api-docs` (when running) |

## 📝 File Naming Conventions

- Routes: `*.routes.js`
- Middleware: `*.middleware.js`
- Services: `*.service.js`
- Tests: `*.test.js`
- Configs: `*.config.js`

## 🚫 Gitignored Directories

- `node_modules/` - Dependencies
- `db/*.db` - Database files
- `logs/` - Log files
- `coverage/` - Test coverage reports
- `.env` - Environment variables
