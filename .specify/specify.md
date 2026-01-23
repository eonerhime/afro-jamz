Build a web application called Afro-Jamz that allows music producers to upload and sell beats to buyers.

The application must be fully responsive and mobile-ready.
All core user flows must be usable on mobile devices, including:

- Browsing and searching beats
- Account creation and authentication
- Purchasing beats
- Managing payment methods
- Uploading and managing beats (for producers)
- Promoting beats

The user interface must be designed with a mobile-first mindset, ensuring:

- Touch-friendly interactions
- Readable layouts on small screens
- No dependency on hover-only interactions

The backend must expose API-driven functionality suitable for future mobile applications.
No business logic may be tightly coupled to desktop-only assumptions.

Build a web application called Afro-Jamz that allows music producers to upload and sell beats to buyers.

Producers can create free accounts and manage a public profile page that lists their uploaded beats.
Each beat includes metadata such as title, genre, tempo, duration, and preview audio.
Beats must be uploaded with one or more selectable licensing terms, where each license defines usage rights and price.

Buyers can browse and search beats without an account.
Buyers must create an account and be authenticated before purchasing any beat so that purchase history can be recorded and accessed.
When purchasing a beat, a buyer must explicitly select one licensing term before checkout.
The selected license determines the final price and usage rights of the purchased beat.

Purchased beats must not be downloadable before purchase.
After purchase, buyers can access the beat according to the selected license terms.

The platform retains a 15% commission from each sale.
Producers can view a clear breakdown of their earnings showing:

- Original sale price
- Platform commission (15%)
- Net earnings (85%)
- Escrow status (held for 7 days or released)
- Wallet balance available for withdrawal

**Wallet System:**

- Producer earnings are held in escrow for 7 days after purchase
- Funds automatically release after 7 days if no dispute is filed
- Producers can request instant withdrawal to PayPal (mock integration)
- Buyers can use wallet balance for future purchases
- All transactions tracked in wallet_transactions audit table
- Mixed payments supported (wallet + card)

**Dispute Resolution:**

- Buyers can file disputes within the 7-day escrow period
- Disputes freeze funds until admin resolution
- Admins can approve (release to producer), refund buyer, or split funds
- Both parties receive notifications on dispute status changes

**Admin Capabilities:**

- Financial dashboard with revenue analytics
- Commission tracking across all sales
- User management (view/filter producers, buyers, admins)
- Dispute resolution interface
- License management and oversight

The application must clearly distinguish producer-facing flows from buyer-facing flows.
