import fs from "node:fs";
const p = "apps/site/public/3dss/sample/marker_text_patterns.3dss.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
for (const pt of (j.points || [])) {
  const mk = pt?.appearance?.marker;
  if (!mk) continue;
  // 判定用：signification と marker.text を別内容にする
  const label = (mk.text && typeof mk.text === "object" && typeof mk.text.content === "string")
    ? mk.text.content
    : (typeof mk.text === "string" ? mk.text : "LABEL");
  pt.signification = pt.signification ?? {};
  pt.signification.name = pt.signification.name ?? {};
  pt.signification.name.ja = "SIG:" + label;
  if (mk.text && typeof mk.text === "object" && "content" in mk.text) {
    mk.text.content = "TXT:" + label;
  } else if (typeof mk.text === "string") {
    mk.text = "TXT:" + label;
  } else {
    // textが無い点が混ざってても落ちないように
    mk.text = { content: "TXT:" + label };
  }
}
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log("patched", p);
