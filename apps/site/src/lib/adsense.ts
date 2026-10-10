// Centralized AdSense settings.
//
// Manual ads require ad unit "slot" IDs. Create ad units in AdSense, then paste
// the slot IDs here.
//
// If a slot ID is an empty string, AdSlot renders nothing in production.

export const ADSENSE_PUBLISHER_ID = 'ca-pub-3327629809463247';

export type AdSlotKey = keyof typeof ADSENSE_SLOTS;

// Publication policy: explanatory content and published work detail pages only.
// Library index, Docs, applications, diagnostics and utility pages stay ad-free.
// Hidden/test detail pages additionally opt out through Layout.adsenseEligible.
export function shouldEnableAdsense(pathname: string): boolean {
  const p = (pathname || '/').split('#')[0].split('?')[0];
  return /^\/concept\/?$/.test(p) || /^\/library\/\d{6}[a-z0-9]{2}\/?$/i.test(p);
}

export function isNoAdsRequest(url?: URL | null): boolean {
  if (!url) return false;
  const sp = url.searchParams;
  const isTruthy = (k: string) => {
    const v = (sp.get(k) ?? '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  };
  // `swipe=1` is used by the behind-the-scenes preview iframe.
  return isTruthy('noads') || isTruthy('embed') || isTruthy('swipe');
}

// Static Astro frontmatter cannot see the visitor's query parameters or frame.
// Use this same gate BEFORE inserting either Google's script or live ad slots.
// The exact origin also keeps Cloudflare Preview, localhost and mirrors ad-free.
export function canRequestAdsense(url: URL, isTopLevel: boolean, pageEligible: boolean): boolean {
  return url.origin === 'https://3dsl.jp'
    && isTopLevel
    && pageEligible
    && shouldEnableAdsense(url.pathname)
    && !isNoAdsRequest(url);
}

export function initAdsense(doc: Document = document, win: Window = window): void {
  const pageEligible = doc.querySelector('meta[name="google-adsense-account"]')
    ?.getAttribute('data-3dsl-adsense-eligible') === '1';
  if (!canRequestAdsense(new URL(win.location.href), win.self === win.top, pageEligible)) return;

  const start = () => {
    // Only this initializer may turn the inert slot templates into live ads.
    if (doc.querySelector('script[data-3dsl-adsense]')) return;
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-3dsl-adsense', '1');
    doc.head.appendChild(script);

    const activateVisibleSlots = () => {
      for (const template of doc.querySelectorAll<HTMLTemplateElement>('template[data-3dsl-ad-slot]')) {
        const wrapper = template.parentElement;
        // Mobile/desktop variants can be hidden by CSS. Never request a hidden slot.
        if (!wrapper || wrapper.getBoundingClientRect().width <= 0) continue;
        template.replaceWith(template.content.cloneNode(true));
        const adWindow = win as Window & { adsbygoogle?: unknown[] };
        adWindow.adsbygoogle = adWindow.adsbygoogle || [];
        adWindow.adsbygoogle.push({});
      }
    };
    activateVisibleSlots();
    // A layout change can reveal the other existing mobile/desktop placement.
    win.addEventListener('resize', activateVisibleSlots, { passive: true });
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

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
