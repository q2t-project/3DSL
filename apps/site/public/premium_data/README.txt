premium_data (P3-1)

Place premium-protected content here so it can be fetched via Pages Functions through env.ASSETS.fetch().

Layout:
  /premium_data/<slug>/meta.json
  /premium_data/<slug>/content.md
  /premium_data/<slug>/model.3dss.json
  /premium_data/<slug>/assets/<filename>

These files are NOT directly protected when accessed as static assets.
Always fetch them through the protected API:
  /api/premium/meta/<slug>        (prod)
  /api/premium/model/<slug>       (prod)
  /api/premium/asset/<slug>/<filename>

NOTE: premium API の出力は拡張子なしのみ（.json は本番から完全排除）。

(Static direct access should be blocked later in P3/P4 by moving assets behind Functions-only path or by gating at edge.)
