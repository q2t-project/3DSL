// viewer_app_premium/premiumDummyAddon.js

export function createPremiumDummyAddon() {
  return {
    id: "premium.dummy",
    mount(_ctx) {
      try {
        console.log("[premium] dummy addon mounted");
      } catch (_e) {}

      // small badge (no external deps)
      const el = document.createElement("div");
      el.textContent = "PREMIUM";
      el.setAttribute("data-role", "premium-badge");
      el.style.cssText = [
        "position:fixed",
        "left:12px",
        "top:12px",
        "z-index:99999",
        "padding:6px 10px",
        "border-radius:999px",
        "background:rgba(0,0,0,.65)",
        "color:#fff",
        "font:12px/1 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
        "letter-spacing:.06em",
        "pointer-events:none",
      ].join(";");
      document.body.appendChild(el);

      return () => {
        try { el.remove(); } catch (_e) {}
      };
    },
  };
}
