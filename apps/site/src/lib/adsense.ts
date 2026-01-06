// Centralized AdSense settings.
//
// Manual ads require ad unit "slot" IDs. Create ad units in AdSense, then paste
// the slot IDs here.
//
// If a slot ID is an empty string, AdSlot renders nothing in production.

export const ADSENSE_PUBLISHER_ID = 'ca-pub-3327629809463247';

export type AdSlotKey = keyof typeof ADSENSE_SLOTS;

// --- Application-time (review) plan ---
// We keep the application-time plan intentionally simple:
// - Ads ON:  /, /concept, /docs
// - Ads OFF: /library, /viewer, /app/*, /modeler, /canonical, /policy, /contact, etc.
//
// Create TWO display units in AdSense and set their slot IDs via env:
// - 300x250 (mobile/inline)
// - 300x600 (desktop rail)
//
// Astro requires the PUBLIC_ prefix to expose env vars to browser code.
const SLOT_300x250 = (import.meta.env.PUBLIC_ADSENSE_SLOT_300x250 ?? '').trim();
const SLOT_300x600 = (import.meta.env.PUBLIC_ADSENSE_SLOT_300x600 ?? '').trim();

// These are the ONLY slots referenced in pages for the application-time plan.
export const ADSENSE_SLOTS = {
  slot_300x250: SLOT_300x250,
  slot_300x600: SLOT_300x600,
} as const;
