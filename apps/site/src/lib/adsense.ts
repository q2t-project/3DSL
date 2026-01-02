// Centralized AdSense settings.
//
// Manual ads require ad unit "slot" IDs. Create ad units in AdSense, then paste
// the slot IDs here.
//
// If a slot ID is an empty string, AdSlot renders nothing in production.

export const ADSENSE_PUBLISHER_ID = 'ca-pub-3327629809463247';

export type AdSlotKey = keyof typeof ADSENSE_SLOTS;

// Put your real slot IDs here (as strings).
export const ADSENSE_SLOTS = {
  home_top: '',
  home_bottom: '',

  concept_inline: '',
  docs_inline: '',
  modeler_inline: '',

  // App viewer (/app/viewer)
  app_viewer_mobile_top: '',
  app_viewer_desktop_rail: '',
} as const;
