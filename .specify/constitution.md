# Afro-Jamz Project Constitution

## 1. Non-Negotiable Product Rules

- A beat must not be accessible or downloadable before a successful purchase.
- Every beat must have at least one licensing term defined at upload time.
- Licensing terms must be immutable once a purchase has been completed.
- Buyers must explicitly select a licensing term before checkout.
- Platform commission must be calculated server-side and must not be configurable by clients.

## 2. Data Integrity & Ownership

- Uploaded beats are owned by the producer and must not be modified by the platform.
- Purchase records must be immutable and auditable.
- Deleted or unpublished beats must not invalidate past purchases.

## 3. Code Quality Standards

- Core business logic must be written as pure, testable functions.
- No critical business logic may exist only on the client.
- Code must favor clarity over cleverness.

## 4. Testing Requirements

- All licensing, pricing, and commission logic must be covered by automated tests.
- Tests must fail on incorrect pricing or license selection.
- No feature touching payments or downloads may be merged without tests.

## 5. User Experience Rules

- Producers must always see clear revenue breakdowns per sale.
- Buyers must see license differences and pricing before checkout.
- Errors affecting uploads, purchases, or downloads must be explicit and human-readable.

## 6. Performance & Scalability

- Beat listings must load within acceptable limits under expected traffic.
- Media delivery must not block UI interactions.
- Background processing must be used for uploads and transcoding.

## 7. Security Constraints

- Direct access to stored beat files must be protected.
- Sensitive operations must require authenticated, authorized requests.
- No secrets or credentials may be exposed to the client.
