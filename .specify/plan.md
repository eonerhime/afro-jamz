Afro-Jamz is a full-stack web application that allows music producers to upload and sell beats, and buyers to browse and purchase beats under selectable licensing terms.

Frontend:
- Built with React.js and Tailwind CSS
- Producer-facing and buyer-facing flows must be clearly separated
- Public users can browse and search beats without authentication
- Authenticated users can manage accounts, payment methods, and transactions
- UI must clearly distinguish sponsored beats from organic results
- Responsive and accessible design is required

Backend:
- Provides REST or API endpoints for authentication, beat management, purchases, promotions, and payments
- Supports buyer and producer accounts with role-based behavior
- Manages beat metadata, licensing terms, purchases, promotions, and earnings breakdowns
- Handles payment workflows for:
  - Buyer beat purchases
  - Producer beat promotions
- Integrates with third-party payment providers (e.g. Stripe, PayPal)
- Uses a payment abstraction layer to support multiple providers
- Stores only provider-generated payment method references; no raw card data is stored
- Enforces payment validation before granting access to purchased beats or activating promotions
- Records all transactions for history and auditing purposes

Payments:
- Buyers must have at least one saved payment method before purchasing beats
- Producers must have at least one saved payment method before promoting beats
- Users may store multiple payment methods and select a default
- Removing a payment method must not affect historical transactions
- Payment logic must be reusable across purchase and promotion flows

Data Storage:
- Uses a relational database (e.g. SQLite for development, scalable option for production)
- Stores users, beats, licenses, purchases, promotions, earnings, and payment method references
- Enforces ownership, licensing, and access rules at the data level

Architecture:
- Clear separation between frontend and backend concerns
- Payment provider integrations isolated from core business logic
- Feature development driven by specification and task definitions in `.specify`
- Designed for future extensibility (additional payment providers, monetization features)