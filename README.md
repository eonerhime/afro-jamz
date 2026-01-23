# Afro-Jamz 🎵

A web platform for African music producers to upload and sell beats with flexible licensing terms. Buyers can browse, preview, and purchase beats with secure payment processing.

## 🚀 Features

### Current (Production Ready)
- ✅ User authentication (JWT-based) with role management
- ✅ Beat upload with metadata and licensing
- ✅ Browse and search beats (guest access)
- ✅ Secure purchase flow with license selection
- ✅ Commission tracking (15% platform fee)
- ✅ Time-locked withdrawals (7-day escrow)
- ✅ Dispute resolution system
- ✅ Admin dashboard
- ✅ Automated testing suite
- ✅ API documentation (Swagger)

### Roadmap (See [docs/roadmaps/](docs/roadmaps/))
- 🔄 Payment gateway integration (Paystack, Stripe)
- 🔄 File storage migration (Cloudflare R2)
- 📋 Social sharing & beat promotion
- 📋 Referral system
- 📋 OAuth integration

## 📁 Project Structure

```
afro-jamz/
├── .specify/              # Project specifications
│   ├── constitution.md    # Non-negotiable rules
│   ├── specify.md         # Detailed specifications
│   ├── plan.md           # Development plan
│   └── features/         # Feature descriptions
├── docs/                 # Documentation
│   ├── roadmaps/         # Implementation roadmaps
│   ├── guides/           # Testing & API guides
│   └── summaries/        # Completion reports
├── src/
│   ├── backend/          # Express API server
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, rate limiting
│   │   ├── services/     # Business logic
│   │   ├── db/           # Database setup
│   │   └── __tests__/    # Automated tests
│   └── frontend/         # React + Vite app
├── db/                   # SQLite database
├── logs/                 # Application logs
├── migrations/           # Database migrations
├── tests/                # Test collections
└── package.json          # Dependencies
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (production-ready with WAL mode)
- **Auth**: JWT with bcrypt
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd afro-jamz

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Run tests
npm test

# Start development server
npm run dev
```

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start with auto-reload
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## 📚 Documentation

- **[Constitution](/.specify/constitution.md)** - Core project rules
- **[API Documentation](http://localhost:3001/api-docs)** - Swagger UI (when server running)
- **[Testing Guide](/docs/guides/testing.md)** - How to write and run tests
- **[Implementation Roadmap](/docs/roadmaps/implementation-roadmap.md)** - Detailed development plan
- **[Feature Analysis](/docs/roadmaps/feature-analysis.md)** - Feature prioritization

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing
- Rate limiting on sensitive endpoints
- Helmet security headers
- CORS protection
- Input validation
- SQL injection prevention (parameterized queries)

## 🧪 Testing

Tests are located in `src/backend/__tests__/`
- Business logic tests (pure functions)
- Integration tests (API endpoints)
- 80%+ code coverage

Run tests: `npm test`

## 🌍 Deployment

### Local Development
SQLite is sufficient for development and can handle 100k+ requests/day.

### Production (Future)
- Database: SQLite with Litestream backup OR PostgreSQL
- File Storage: Cloudflare R2 / AWS S3
- Hosting: Railway / Render / DigitalOcean
- CDN: Cloudflare

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. See contribution guidelines in `.specify/` for development standards.

