Both buyers and producers can add, view, update, and remove payment methods from their account.
A user may have multiple payment methods linked to their account.
Supported payment systems must include at least Stripe and PayPal, with the ability to add more providers in the future.

Payment methods must be securely handled via third-party payment providers.
The platform must not store raw card or sensitive payment details.
Only provider-generated payment method references may be stored.

Users can select a default payment method.
Buyers must use a valid saved payment method when purchasing a beat.
Producers must use a valid saved payment method when paying to promote a beat.

Removing a payment method must not affect historical transactions.
Payment method management must be clearly separated from authentication credentials.