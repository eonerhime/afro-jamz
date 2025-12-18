# Afro-Jamz Development Plan

## Overview

Afro-Jamz is a full-stack web application that allows music producers to upload and sell beats, and buyers to browse, search, and purchase beats under selectable licensing terms. The platform also supports paid beat promotion, referral earnings, and multi-provider payment handling.

This plan describes how the system is built, structured, and scaled, while remaining implementation-agnostic.

---

## Frontend

- Built with React.js and Tailwind CSS
- Designed using a mobile-first, responsive approach
- All core user flows must be fully usable on mobile devices, tablets, and desktops
- Touch-friendly interactions are required across the UI
- Producer-facing and buyer-facing flows must be clearly separated
- Sponsored (promoted) beats must be visually distinguished from organic results
- Public users can browse and search beats without authentication
- Authenticated users can:
  - Manage their account details
  - Manage payment methods
  - Purchase beats (buyers)
  - Upload and manage beats (producers)
  - Promote beats (producers)

---

## Backend

- Provides API-driven functionality suitable for both web and future mobile clients
- No backend logic may depend on client screen size or platform
- Supports authentication, authorization, and role-based behavior
- Manages beats, licensing terms, purchases, promotions, earnings, and referrals
- Enforces ownership, access control, and licensing rules
- Records all financial transactions for auditability and history

---

## Payments

- Supports multiple payment providers (e.g. Stripe, PayPal)
- Uses a payment abstraction layer to avoid provider lock-in
- Users may store multiple payment methods and select a default
- Buyers must have a valid payment method to purchase beats
- Producers must have a valid payment method to promote beats
- No raw card or sensitive payment data is stored on the platform
- Only provider-generated payment method references are persisted
- Removing a payment method must not affect historical transactions

---

## Promotions

- Producers can pay to promote beats for increased visibility
- Promoted beats may appear on the landing page and be labeled as sponsored in search results
- Promotions have a defined start date and expiration
- Expired promotions must no longer appear as sponsored
- Promotions do not alter licensing, pricing, or purchase rules

---

## Data Storage

- Uses a relational database
- SQLite may be used for development
- Production deployment should support a scalable relational database
- Stores users, beats, licenses, purchases, promotions, earnings, referrals, and payme
