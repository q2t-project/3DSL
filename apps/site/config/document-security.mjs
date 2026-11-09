// Shared by static Pages responses and the retired-document Function.
// Public iframe embedding remains available. Script/connect allowlists need
// their own inventory of workers, fonts, QR, forms and future ad delivery.
export const documentSecurityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; form-action 'self' https://formspree.io",
});
