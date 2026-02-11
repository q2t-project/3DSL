// viewer/ssot/premium/premiumDummyAddon.js
// Dummy premium addon (P4 DoD): logs and shows a small PREMIUM badge.

export function createPremiumDummyAddon() {
  return {
    id: "premium.dummy",
    mount(ctx) {
      try {
        console.log("[premium] dummy addon mounted");
      } catch {}
      // Optional UI badge: no external dependencies.
      const canvas = (typeof document !== "undefined")
        ? (document.querySelector('[data-role="viewer-canvas"]') || document.getElementById("viewer-canvas"))
        : null;
      const root = canvas ? (canvas.parentElement || document.body) : (document.body || null);
      if (!root) return;

      const badge = document.createElement("div");
      badge.textContent = "PREMIUM";
      badge.setAttribute("data-addon", "premium.dummy");
      badge.style.position = "fixed";
      badge.style.top = "10px";
      badge.style.right = "10px";
      badge.style.zIndex = "9999";
      badge.style.padding = "4px 8px";
      badge.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "600";
      badge.style.borderRadius = "8px";
      badge.style.border = "1px solid rgba(0,0,0,0.25)";
      badge.style.background = "rgba(255,255,255,0.9)";
      badge.style.color = "#111";
      badge.style.pointerEvents = "none";

      root.appendChild(badge);

      return () => {
        try { badge.remove(); } catch {}
      };
    },
  };
}
