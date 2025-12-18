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

The platform retains a fixed percentage commission from each sale, and producers can view a clear breakdown of their earnings.
The application must clearly distinguish producer-facing flows from buyer-facing flows.