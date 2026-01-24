import type { APIRoute } from "astro";
import { ADSENSE_PUBLISHER_ID, ADSENSE_SLOTS } from "../../lib/adsense";

// Expose AdSense IDs to non-Astro static pages (e.g. /viewer/index.html).
// This route is prerendered as a static JS file.
export const prerender = true;

export const GET: APIRoute = async () => {
  const payload = {
    publisherId: ADSENSE_PUBLISHER_ID,
    slots: {
      slot_300x250: ADSENSE_SLOTS.slot_300x250,
      slot_300x600: ADSENSE_SLOTS.slot_300x600,
    },
  };

  const body =
    `/* /_data/adsense.js (generated) */\n` +
    `window.__ADSENSE_CONFIG__ = ${JSON.stringify(payload)};\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      // Keep it reasonably cacheable, but allow rapid iteration.
      "cache-control": "public, max-age=600",
    },
  });
};
