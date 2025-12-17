Frontend:
- Use React.js with Vite as the build tool.
- Use Tailwind CSS for styling and layout.
- Favor functional components with React hooks.
- Avoid heavy UI libraries; build components using Tailwind utilities.
- Use React Context for global state (authentication, user data, cart).
- Ensure clear separation of producer-facing vs buyer-facing flows.

Backend:
- Implement a lightweight backend (e.g., Node.js + Express or Fastify) to handle:
  - Authentication and authorization
  - Beat metadata storage and retrieval
  - License enforcement for purchases
  - Commission calculation and purchase tracking
- Database:
  - Use SQLite initially for local development
  - Tables for users, beats, licensing terms, purchases, and commissions
  - Ensure data integrity and enforce foreign key constraints
- API design:
  - RESTful endpoints for all producer and buyer interactions
  - Endpoints must enforce authentication where required
  - API responses must include necessary metadata for frontend rendering

Core business logic:
- Licensing, pricing, and commission calculations must reside in the backend domain layer
- Logic must be modular, testable, and independent of the frontend

Testing:
- Backend unit and integration tests for:
  - Licensing and pricing logic
  - Purchase flows
  - Commission calculations
  - Authentication and authorization
- Frontend tests for critical UI components remain as previously defined

Performance:
- Beat listings must load quickly with minimal backend overhead
- Optimize database queries and API responses
- Media previews handled via streaming or pre-signed URLs to avoid blocking frontend

Security & Constraints:
- Beat files must be securely stored and protected from unauthorized access
- All sensitive operations require authentication and authorization
- No secrets or credentials may be exposed to the client

Non-Goals:
- Payment processing is out of scope; purchases can be mocked or simulated
- Social features (likes, comments, messaging) are out of scope
- Native mobile apps are out of scope