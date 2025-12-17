Backend:
- Extend producer account model to store payment method references
- Implement promotion pricing and duration rules
- Integrate payment charge flow for beat promotion
- Activate promotion only after successful payment
- Enforce ownership, duration, and expiration rules
- Flag promoted beats in landing page and search responses

Frontend:
- Build UI for adding and managing producer card details
- Build promotion purchase flow for selecting beats and promotion options
- Display promotion status and expiration to producers
- Display sponsored beats on landing page and search results

Testing:
- Verify promotion requires valid card details
- Verify payment is enforced before activation
- Verify promotion expiration and sponsored labeling