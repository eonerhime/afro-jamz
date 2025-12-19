# Afro-Jamz Database Schema

This document defines the authoritative relational data model for the Afro-Jamz platform.
It is implementation-agnostic and applies to SQLite (development) and scalable relational databases (production).

---

## Users

Represents both buyers and producers.

users
- id (PK)
- email (unique, immutable)
- password_hash
- role (buyer | producer)
- display_name
- created_at
- deleted_at (nullable)

Rules:
- Email cannot be updated after registration
- Users may be soft-deleted
- Role determines access and behavior

---

## Payment Methods

Stores references to external payment providers.

payment_methods
- id (PK)
- user_id (FK → users.id)
- provider (stripe | paypal | future)
- provider_reference_id
- is_default (boolean)
- created_at
- removed_at (nullable)

Rules:
- No raw card or sensitive data stored
- Removing a payment method does not affect past transactions

---

## Beats

Represents beats uploaded by producers.

beats
- id (PK)
- producer_id (FK → users.id)
- title
- genre
- tempo
- duration
- preview_audio_url
- created_at
- deleted_at (nullable)

Rules:
- Only producers can own beats
- Deleted beats remain referenced in purchases

---

## Licensing Terms

Defines selectable licenses per beat.

licenses
- id (PK)
- beat_id (FK → beats.id)
- name
- usage_rights
- price
- created_at

Rules:
- A beat must have at least one license
- Licenses cannot be modified after being purchased

---

## Purchases

Records beat purchases by buyers.

purchases
- id (PK)
- buyer_id (FK → users.id)
- beat_id (FK → beats.id)
- license_id (FK → licenses.id)
- payment_method_id (FK → payment_methods.id)
- amount_paid
- created_at

Rules:
- Buyers must be authenticated
- Access granted only after successful payment

---

## Promotions

Tracks promoted beats.

promotions
- id (PK)
- beat_id (FK → beats.id)
- producer_id (FK → users.id)
- payment_method_id (FK → payment_methods.id)
- start_date
- end_date
- created_at

Rules:
- Requires valid payment
- Expired promotions are inactive
- Promotions do not affect licensing or pricing

---

## Earnings

Tracks producer earnings per purchase.

earnings
- id (PK)
- producer_id (FK → users.id)
- purchase_id (FK → purchases.id)
- gross_amount
- commission_amount
- net_amount
- created_at

Rules:
- Earnings are immutable
- Commission rules applied at purchase time

---

## Referrals

Tracks referral-based earnings.

referrals
- id (PK)
- referrer_id (FK → users.id)
- referred_user_id (FK → users.id)
- purchase_id (FK → purchases.id)
- reward_amount
- created_at

Rules:
- No self-referrals
- Referral rewards calculated once per purchase

---

## Integrity Principles

- All financial records are append-only
- Soft deletes preserve historical integrity
- Ownership and access enforced via foreign keys
- Payment logic is externalized to providers
