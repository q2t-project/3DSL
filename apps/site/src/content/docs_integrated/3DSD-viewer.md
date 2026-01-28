================================
3DSD-viewer.md・ｽE・ｽEiewer・ｽE・ｽE
================================

# 0 逶ｮ逧・・ｽ・ｽ驕ｩ逕ｨ遽・・ｽ・ｽ

## 0.1 viewer 縺ｮ蠖ｹ蜑ｲ

3DSD-viewer・ｽE・ｽ莉･荳九」iewer・ｽE・ｽ・ｽE縲・ 
3DSL 繝励Ο繧ｸ繧ｧ繧ｯ繝医↓縺翫￠繧・**讒矩繝・・ｽE繧ｿ縺ｮ髢ｲ隕ｧ繝ｻ遒ｺ隱搾ｿｽE菴馴ｨ・* 縺ｫ迚ｹ蛹悶＠縺・ 
蟆ら畑繝薙Η繝ｼ繝ｯ繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ縺ゅｋ縲・

viewer 縺ｯ modeler 縺ｫ繧医▲縺ｦ逕滂ｿｽE縺輔ｌ縺・`.3dss.json` 繧定ｪｭ縺ｿ蜿悶ｊ縲∵ｬ｡繧呈署萓帙☆繧具ｼ・

- 荳画ｬ｡蜈・・ｽ・ｽ騾縺ｮ蠢螳溘↑蜿ｯ隕門喧
- 繝輔Ξ繝ｼ繝・ｽE・ｽ譎る俣螻､・ｽE・ｽ・ｽE蛻・・ｽ・ｽ
- 繝ｬ繧､繝､・ｽE・ｽEines / points / aux・ｽE・ｽ・ｽE陦ｨ遉ｺ蛻・・ｽ・ｽ
- 讒矩蜈ｨ菴難ｿｽE菫ｯ迸ｰ繝ｻ繧ｺ繝ｼ繝繝ｻ蝗櫁ｻ｢
- name / description / appearance / meta 縺ｮ遒ｺ隱搾ｼ郁｡ｨ遉ｺ縺ｮ縺ｿ・ｽE・ｽE

### 驥崎ｦ√↑蜑肴署

- viewer 縺ｯ **讒矩繝・・ｽE繧ｿ繧堤ｵｶ蟇ｾ縺ｫ螟画峩縺励↑縺・*
- 螳鯉ｿｽE縺ｪ **read-only・ｽE・ｽ蜿ら・蟆ら畑・ｽE・ｽ繧｢繝励Μ**
- modeler 縺ｨ逡ｰ縺ｪ繧・**菫晏ｭ假ｿｽE蜃ｺ蜉帶ｩ滂ｿｽE繧呈戟縺溘↑縺・*
  ・ｽE・ｽEI 迥ｶ諷具ｿｽE豌ｸ邯壼喧繧らｦ∵ｭ｢・ｽE・ｽE

UI 迥ｶ諷具ｼ磯∈謚橸ｿｽE繧ｫ繝｡繝ｩ繝ｻ陦ｨ遉ｺ險ｭ螳夲ｼ会ｿｽE session 蜀・・ｽE縺ｿ譛牙柑縺ｧ縲・ 
讒矩繝・・ｽE繧ｿ縺ｫ譖ｸ縺肴綾縺輔ｌ繧九％縺ｨ縺ｯ縺ｪ縺・・ｽ・ｽE


## 0.2 common 莉墓ｧ倥→縺ｮ髢｢菫・

viewer 縺ｯ谺｡縺ｮ譁・・ｽ・ｽ縺ｫ蠕薙≧・ｽE・ｽE

- `/schemas/3DSS.schema.json`
- `/specs/3DSD-common.md`

common 縺ｫ繧医ｋ隕冗ｯ・・ｽ・ｽ蠢螳溘↓隗｣驥医＠縺ｦ陦ｨ遉ｺ縺吶ｋ・ｽE・ｽE

- 蠎ｧ讓咏ｳｻ・ｽE・ｽE+ up / freeXY・ｽE・ｽE
- lines / points / aux 縺ｮ諢丞袖
- frames 縺ｮ謇ｱ縺・・ｽ・ｽ陦ｨ遉ｺ繝輔ぅ繝ｫ繧ｿ・ｽE・ｽE
- 繧ｫ繝｡繝ｩ隕冗ｯ・・ｽ・ｽ謚募ｽｱ繝ｻZ+ up繝ｻ蜴溽せ・ｽE・ｽE
- 蠎ｧ讓吝､画鋤繝ｻ蜊倅ｽ咲ｳｻ

viewer 縺ｯ modeler 縺ｨ蟇ｾ遘ｰ逧・・ｽ・ｽ縺ゅｊ縲・ 
**逕滂ｿｽE・ｽE・ｽEodeler・ｽE・ｽEvs 髢ｲ隕ｧ・ｽE・ｽEiewer・ｽE・ｽE* 縺ｮ蠖ｹ蜑ｲ蛻・・ｽ・ｽ縺鯉ｿｽE遒ｺ縺ｧ縺ゅｋ縲・


## 0.3 驕ｩ逕ｨ遽・・ｽ・ｽ

譛ｬ莉墓ｧ假ｿｽE `/code/viewer/` 縺ｮ蜈ｨ繝｢繧ｸ繝･繝ｼ繝ｫ縺ｫ驕ｩ逕ｨ縺吶ｋ・ｽE・ｽE

- Core・ｽE・ｽ隱ｭ霎ｼ繝ｻ迥ｶ諷狗ｮ｡逅・・ｽ・ｽE
- Renderer・ｽE・ｽ荳画ｬ｡蜈・・ｽ・ｽ逕ｻ・ｽE・ｽE
- UI・ｽE・ｽEiewer 蟆ら畑 UI・ｽE・ｽE
- Validator・ｽE・ｽEtrict validation・ｽE・ｽE
- Utils・ｽE・ｽ蠎ｧ讓吝､画鋤繝ｻ濶ｲ蜃ｦ逅・・ｽ・ｽE
- HUD・ｽE・ｽExis / origin 縺ｪ縺ｩ隕冶ｦ夊｣懷勧・ｽE・ｽE


## 0.4 髱槫ｯｾ雎｡

viewer 縺ｯ髢ｲ隕ｧ蟆ら畑繧｢繝励Μ縺ｧ縺ゅｊ縲∽ｻ･荳具ｿｽE莉墓ｧ伜､厄ｼ・

- 讒矩繝・・ｽE繧ｿ縺ｮ邱ｨ髮・
- 讒矩繝・・ｽE繧ｿ縺ｮ菫晏ｭ・
- UI 迥ｶ諷具ｿｽE豌ｸ邯壼喧
- annotation / comment / report 縺ｪ縺ｩ縺ｮ邱ｨ髮・・ｽ・ｽ讖滂ｿｽE
- modeler 縺ｮ蜀・・ｽ・ｽ蜍穂ｽ・
- 繧ｹ繧ｭ繝ｼ繝橸ｿｽE螳夂ｾｩ繝ｻ螟画鋤

蜀・・ｽ・ｽ API 縺ｧ繧・update / remove / patch 遲会ｿｽE隱槫ｽ呻ｿｽE菴ｿ逕ｨ遖∵ｭ｢縲・


## 0.5 險ｭ險域婿驥晢ｼ磯夢隕ｧ蟆ら畑繧｢繝励Μ縺ｨ縺励※・ｽE・ｽE

1. **蜿ゑｿｽE蟆ら畑**  
   讒矩繝・・ｽE繧ｿ縺ｯ immutable縲よ嶌縺肴鋤縺育ｦ∵ｭ｢縲・

2. **蠢螳溯｡ｨ遉ｺ**  
   modeler 蜃ｺ蜉幢ｿｽE蛟､繧呈隼螟峨○縺壹∝庄閭ｽ縺ｪ遽・・ｽ・ｽ縺ｧ蠢螳溘↓陦ｨ遉ｺ縺吶ｋ縲・ 
   謠冗判荳奇ｿｽE陬懷勧縺ｯ縲∵ｧ矩繝・・ｽE繧ｿ繧剃ｸ榊､会ｿｽE縺ｾ縺ｾ謇ｱ縺・・ｽ・ｽE・ｽ・ｽ縺ｫ髯仙ｮ壹☆繧九・

3. **鬮倬溷ｿ懃ｭ・*  
   frame / camera / visibility 縺ｮ UI 謫堺ｽ懊ｒ蜊ｳ譎ょ渚譏縲・

4. **UI 迥ｶ諷九→讒矩繝・・ｽE繧ｿ縺ｮ螳鯉ｿｽE蛻・・ｽ・ｽ**  
   UI 迥ｶ諷具ｼ磯∈謚橸ｿｽE繧ｫ繝｡繝ｩ繝ｻvisibility・ｽE・ｽ・ｽE uiState 縺ｮ縺ｿ縺ｧ菫晄戟縺励・ 
   JSON 縺ｫ豺ｷ蜈･縺輔○縺ｪ縺・・ｽ・ｽE

5. **螟夜Κ騾壻ｿ｡縺ｮ謇ｱ縺・・ｽ・ｽ繧ｹ繧ｭ繝ｼ繝槫叙蠕礼ｦ∵ｭ｢・ｽE・ｽE*

- viewer runtime 縺ｯ **繧ｹ繧ｭ繝ｼ繝槫叙蠕・* 繧・・ｽ・ｽ驛ｨ繝ｪ繧ｽ繝ｼ繧ｹ縺ｮ閾ｪ蜍募叙蠕励ｒ陦後ｏ縺ｪ縺・・ｽ・ｽEthree.js` 繧・schema 縺ｯ vendor/local 繧貞盾辣ｧ・ｽE・ｽ縲・
- `.3dss.json` 縺ｮ蜿門ｾ暦ｼ医Ο繝ｼ繧ｫ繝ｫ/繝ｪ繝｢繝ｼ繝・蝓九ａ霎ｼ縺ｿ・ｽE・ｽ・ｽE **Host・ｽE・ｽEstro/HTML 蛛ｴ・ｽE・ｽ雋ｬ蜍・* 縺ｨ縺吶ｋ縲・
- runtime 縺・URL 繧貞女縺代※ `fetch` 縺吶ｋ陬懷勧 API・ｽE・ｽ萓・ `bootstrapViewerFromUrl`・ｽE・ｽ繧呈戟縺､蝣ｴ蜷医〒繧ゅ∬｡後≧縺ｮ縺ｯ **譁・・ｽ・ｽ譛ｬ菴難ｿｽE蜿門ｾ暦ｿｽE縺ｿ** 縺ｨ縺励√せ繧ｭ繝ｼ繝槫叙蠕暦ｿｽE霑ｽ霍｡騾壻ｿ｡繝ｻ霑ｽ蜉繝輔ぉ繝・・ｽ・ｽ縺ｯ遖∵ｭ｢縺吶ｋ縲・

## 0.6 繧｢繝ｼ繧ｭ繝・・ｽ・ｽ繝√Ε・ｽE・ｽ繝ｬ繧､繝､縺ｨ雋ｬ蜍呻ｼ・

viewer 縺ｯ谺｡縺ｮ繝ｬ繧､繝､縺ｫ蛻・・ｽ・ｽ縺吶ｋ・ｽE・ｽE

- **entry**: Host 縺九ｉ蜿ｩ縺九ｌ繧玖ｵｷ蜍募哨・ｽE・ｽ萓・ `bootstrapViewer`・ｽE・ｽE
- **hub**: UI 縺ｨ core/renderer 縺ｮ髮・・ｽ・ｽ・医Ο繧ｸ繝・・ｽ・ｽ遖∵ｭ｢・ｽE・ｽE
- **core**: canonical state 縺ｨ繝薙ず繝阪せ繝ｭ繧ｸ繝・・ｽ・ｽ・ｽE・ｽEDSS 縺ｯ read-only・ｽE・ｽE
- **renderer**: three.js 謠冗判蟆ら畑・ｽE・ｽ迥ｶ諷具ｿｽE謠冗判繧ｭ繝｣繝・・ｽ・ｽ繝･縺ｮ縺ｿ・ｽE・ｽE
- **ui**: DOM 蜈･蜉・竊・hub API 縺ｸ縺ｮ讖区ｸ｡縺暦ｼ・ev harness / Host 蛛ｴ・ｽE・ｽE

### 萓晏ｭ俶婿蜷托ｿｽE隕冗ｯ・・ｽ・ｽ遖∵ｭ｢繧貞性繧・ｽE・ｽE

- 險ｱ蜿ｯ・ｽE・ｽ豁｣譁ｹ蜷托ｼ・
  - ui 竊・entry / hub
  - entry 竊・hub / core / renderer
  - hub 竊・core / renderer
- 遖∵ｭ｢・ｽE・ｽ邨ｶ蟇ｾ・ｽE・ｽE
  - core 竊・hub / renderer
  - renderer 竊・core / hub
  - hub 竊・ui
  - ui 竊・renderer・ｽE・ｽEick 繧ょ性繧・**蠢・・ｽ・ｽ hub 邨檎罰**・ｽE・ｽE
  - entry 竊・ui・ｽE・ｽEI 縺ｯ Host 蛛ｴ雋ｬ蜍呻ｼ・


## 0.7 萓晏ｭ俶ｳｨ蜈･・ｽE・ｽEI・ｽE・ｽ縺ｨ composition root

- **composition root 縺ｯ entry・ｽE・ｽEootstrap・ｽE・ｽE* 縺ｨ縺吶ｋ縲・
- core 蜀・・ｽE繝｢繧ｸ繝･繝ｼ繝ｫ蜷悟｣ｫ縺ｯ **import 縺ｧ邨撰ｿｽE縺ｪ縺・*縲ょｿ・・ｽ・ｽ縺ｪ萓晏ｭ假ｿｽE `createXxx({ ...deps })` 縺ｧ **蠑墓焚豕ｨ蜈･**縺吶ｋ縲・
- hub 縺ｯ `{ core, renderer }` 繧・DI 縺ｧ蜿励￠蜿悶ｊ縲～core/*` 繧・`renderer/*` 繧・import 縺励↑縺・・ｽ・ｽE
- helper 縺ｯ **蜷御ｸ繝輔ぃ繧､繝ｫ蜀・・ｽ・ｽ髢峨§繧狗ｴ秘未謨ｰ**縺ｮ縺ｿ險ｱ蜿ｯ・ｽE・ｽ蛻･繝｢繧ｸ繝･繝ｼ繝ｫ蛹悶＠縺ｦ import 縺吶ｋ縺ｮ縺ｯ遖∵ｭ｢・ｽE・ｽ縲・


## 0.8 繝ｩ繧､繝輔し繧､繧ｯ繝ｫ隕冗ｴ・・ｽ・ｽEtart/stop/dispose・ｽE・ｽE

- `hub.start()/stop()/dispose()` 縺ｯ **idempotent**・ｽE・ｽ隍・・ｽ・ｽ蝗槫他繧薙〒繧ょｮ会ｿｽE・ｽE・ｽ縺ｨ縺吶ｋ縲・
- `stop()` 縺ｯ RAF 蛛懈ｭ｢縺ｮ縺ｿ・ｽE・ｽEebGL 雉・・ｽ・ｽ・ｽE菫晄戟・ｽE・ｽ縲・
- `dispose()` 縺ｯ stop + renderer 雉・・ｽ・ｽ隗｣謾ｾ縲ゆｻ･蠕鯉ｿｽE `start/stop/resize` 縺ｯ no-op縲・
- `dispose()` 蠕鯉ｿｽE `pickObjectAt()` 縺ｯ蟶ｸ縺ｫ `null`・ｽE・ｽ萓句､也ｦ∵ｭ｢・ｽE・ｽ縲・
- `onXChanged` 邉ｻ縺ｯ **unsubscribe 繧定ｿ斐☆**・ｽE・ｽ遨阪∩荳翫￡繝ｪ繝ｼ繧ｯ繧帝亟縺撰ｼ峨・


## 0.9 迥ｶ諷区園譛画ｨｩ・ｽE・ｽEingle-writer 繧貞性繧・ｽE・ｽE

- 3DSS document 縺ｯ **immutable**・ｽE・ｽEalidate 蠕後↓ deepFreeze 縺励∽ｻ･蠕梧嶌縺肴鋤縺育ｦ∵ｭ｢・ｽE・ｽ縲・
- canonical state 縺ｯ **core 縺梧園譛・*縺吶ｋ・ｽE・ｽ萓・ `uiState`・ｽE・ｽ縲・
- single-writer:
  - `uiState.visibleSet` 縺ｯ **core.recomputeVisibleSet() 縺ｮ縺ｿ**縺梧峩譁ｰ縺励※繧医＞縲・
  - `uiState.runtime.isFramePlaying` 縺ｯ **core.frameController 縺ｮ縺ｿ**縺梧峩譁ｰ縺励※繧医＞縲・
- renderer 縺ｯ three.js 繧ｪ繝悶ず繧ｧ繧ｯ繝医→謠冗判繧ｭ繝｣繝・・ｽ・ｽ繝･縺ｮ縺ｿ繧呈園譛峨＠縲…ore state 縺ｯ蜿励￠蜿悶▲縺ｦ蜿肴丐縺吶ｋ縺縺代・


---

# 1 繧ｷ繧ｹ繝・・ｽ・ｽ蜈ｨ菴捺ｧ具ｿｽE・ｽE・ｽ・ｽE驛ｨ繧｢繝ｼ繧ｭ繝・・ｽ・ｽ繝√Ε・ｽE・ｽE

viewer 縺ｮ蜀・・ｽ・ｽ讒矩縺ｯ縲∵ｬ｡縺ｮ **5繝ｬ繧､繝､** 縺ｨ **2遞ｮ鬘橸ｿｽE繧ｨ繝ｳ繝医Μ繝昴う繝ｳ繝・*縺九ｉ讒具ｿｽE縺輔ｌ繧九・

- **entry 螻､**
  - `bootstrapViewer` / `bootstrapViewerFromUrl`・ｽE・ｽEomposition root・ｽE・ｽE
- **hub 螻､**
  - `viewerHub`・ｽE・ｽEI 縺ｸ縺ｮ蜈ｬ髢・API 髮・・ｽ・ｽE・ｽ・ｽ繝ｭ繧ｸ繝・・ｽ・ｽ遖∵ｭ｢・ｽE・ｽE
- **core 螻､**
  - canonical state・ｽE・ｽEiState・ｽE・ｽ縺ｨ蜷・・ｽ・ｽ controller / cameraEngine
  - 3DSS document 縺ｯ immutable・ｽE・ｽEead-only・ｽE・ｽE
- **renderer 螻､**
  - three.js 謠冗判・ｽE・ｽEcene/camera/objects・ｽE・ｽ・・microFX・ｽE・ｽ謠冗判蟆ら畑繧ｭ繝｣繝・・ｽ・ｽ繝･・ｽE・ｽE
- **ui 螻､・ｽE・ｽEost / dev harness・ｽE・ｽE*
  - pointerInput / keyboardInput / gizmo / picker / timeline 遲・
  - DOM 蜈･蜉・竊・`hub.core.*` / `hub.pickObjectAt` 縺ｸ縺ｮ讖区ｸ｡縺・

陬懷勧螻､・ｽE・ｽEore 蜀・・ｽ・ｽ繝ｦ繝ｼ繝・・ｽ・ｽ繝ｪ繝・・ｽ・ｽ・ｽE・ｽ・・
- Validator・ｽE・ｽEJV strict validation・ｽE・ｽE
- structIndex / utils・ｽE・ｽEuid index / frameRange 遲会ｼ・

繧ｨ繝ｳ繝医Μ繝昴う繝ｳ繝茨ｼ・

- `bootstrapViewer(canvasOrId, document3dss, options?)`
- `bootstrapViewerFromUrl(canvasOrId, url, options?)`

縺ｩ縺｡繧峨ｂ `viewerHub` 繧定ｿ斐＠縲∝､夜Κ謫堺ｽ懶ｿｽE **`hub.core.*` 縺ｨ `hub.pickObjectAt`・ｽE・ｽ縺翫ｈ・ｽE `hub.viewerSettings.*`・ｽE・ｽ縺ｫ髯仙ｮ・*縺吶ｋ縲・


## 1.1 繝｢繧ｸ繝･繝ｼ繝ｫ讒具ｿｽE

viewer 螳溯｣・・ｽE縺翫♀繧医◎谺｡縺ｮ繝｢繧ｸ繝･繝ｼ繝ｫ鄒､縺ｫ蛻・・ｽ・ｽ繧後ｋ縲・

| 繝ｬ繧､繝､ / 繝｢繧ｸ繝･繝ｼ繝ｫ | 莉｣陦ｨ繝輔ぃ繧､繝ｫ萓・| 蠖ｹ蜑ｲ |
|--------------------|----------------|------|
| Boot               | `runtime/bootstrapViewer.js` | canvas 縺ｨ 3DSS 繧貞女縺大叙繧・runtime 繧定ｵｷ蜍輔＠縲～viewerHub` 繧定ｿ斐☆縲ゅΞ繝ｳ繝繝ｼ繝ｫ繝ｼ繝鈴幕蟋九ｄ PointerInput / KeyboardInput 縺ｮ謗･邯夲ｿｽE陦後ｏ縺壹？ost / dev harness 蛛ｴ縺ｮ雋ｬ蜍吶→縺吶ｋ |
| Hub                | `runtime/viewerHub.js` | Core / Renderer 繧偵∪縺ｨ繧√※螟夜Κ縺ｫ蜈ｬ髢九☆繧九ヵ繧｡繧ｵ繝ｼ繝峨Ａhub.core.*` API 縺ｨ `hub.start/stop` 繧呈據縺ｭ繧・|
| Core               | `runtime/core/*.js` | 3DSS 讒矩 state・ｽE・ｽEmmutable・ｽE・ｽ縺ｨ uiState・ｽE・ｽEiewer 蟆ら畑 state・ｽE・ｽ・ｽE邂｡逅・・ｽ・ｽ蜷・ｨｮ Controller / CameraEngine 繧貞性繧・ｽE・ｽEointerInput / KeyboardInput 縺ｯ UI 繝ｬ繧､繝､ `ui/*` 縺ｫ蛻・・ｽ・ｽ・ｽE・ｽE|
| Renderer           | `runtime/renderer/context.js` + `renderer/microFX/*` | three.js 縺ｫ繧医ｋ謠冗判縲［icroFX縲《election 繝上う繝ｩ繧､繝・|
| UI・ｽE・ｽEev harness・ｽE・ｽE | `viewerDevHarness.js` `ui/gizmo.js` `ui/pointerInput.js` `ui/keyboardInput.js` 縺ｪ縺ｩ | dev 逕ｨ HTML / HUD / 繝懊ち繝ｳ鬘槭１ointerInput / KeyboardInput / gizmo / 繧ｿ繧､繝繝ｩ繧､繝ｳ縺ｧ蜿励￠縺滂ｿｽE繧ｦ繧ｹ / 繧ｭ繝ｼ蜈･蜉帙ｒ **`hub.core.*` / `hub.pickObjectAt` 邨檎罰縺ｧ** runtime 縺ｫ讖区ｸ｡縺励☆繧・|
| Validator          | `runtime/core/validator.js` | `/schemas/3DSS.schema.json` 縺ｫ蟇ｾ縺吶ｋ strict full validation |
| Utils / Index      | `runtime/core/structIndex.js` 縺ｪ縺ｩ | uuid 繧､繝ｳ繝・・ｽ・ｽ繧ｯ繧ｹ讒狗ｯ峨’rame 遽・・ｽ・ｽ讀懶ｿｽE縺ｪ縺ｩ縺ｮ陬懷勧讖滂ｿｽE |
| HUD / 隕冶ｦ夊｣懷勧     | `renderer/microFX/*` | axis / marker / bounds / glow / highlight 遲峨∵ｧ矩縺ｨ縺ｯ辟｡髢｢菫ゅ↑ viewer 蟆ら畑謠冗判 |

PointerInput / KeyboardInput 縺ｯ `ui/pointerInput.js` / `ui/keyboardInput.js` 縺ｫ鄂ｮ縺阪ゞI 繝ｬ繧､繝､・ｽE・ｽEost / dev harness・ｽE・ｽ・ｽE荳驛ｨ縺ｨ縺ｿ縺ｪ縺吶・ 
雋ｬ蜍吶→縺励※縺ｯ縲鯉ｿｽE蜉帙Ξ繧､繝､縲搾ｿｽE荳驛ｨ縺ｧ縺ゅｊ縲・*Host / dev harness 縺九ｉ `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` 縺ｧ逕滂ｿｽE繝ｻ謗･邯壹☆繧・*縲・ 
`runtime/bootstrapViewer.js` 繧・`runtime/core/*` 縺九ｉ縺ｯ import / new 縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

窶ｻ 螳溘ヵ繧｡繧､繝ｫ讒具ｿｽE縺ｯ `viewer/runtime/*`繝ｻ`viewer/ui/*` 縺ｮ繧ｹ繧ｱ繝ｫ繝医Φ縺ｫ貅匁侠縺吶ｋ縲・ 
窶ｻ three.js / AJV 縺ｨ縺・・ｽ・ｽ縺溷､夜Κ繝ｩ繧､繝悶Λ繝ｪ縺ｯ runtime 縺九ｉ縺ｮ縺ｿ蛻ｩ逕ｨ縺励ゞI 縺九ｉ逶ｴ謗･隗ｦ繧峨↑縺・・ｽ・ｽE



### 1.1.3 蟄伜惠縺励↑縺・・ｽ・ｽ繧ｸ繝･繝ｼ繝ｫ・ｽE・ｽ・ｽE遒ｺ縺ｫ遖∵ｭ｢・ｽE・ｽE

viewer 縺ｫ縺ｯ谺｡縺ｮ繝｢繧ｸ繝･繝ｼ繝ｫ縺ｯ蟄伜惠縺励↑縺・・ｽ・ｽ霑ｽ蜉繧らｦ∵ｭ｢・ｽE・ｽ・・

- Exporter・ｽE・ｽ讒矩繝・・ｽE繧ｿ縺ｮ菫晏ｭ假ｿｽE譖ｸ縺搾ｿｽE縺暦ｼ・
- Editor・ｽE・ｽ讒矩邱ｨ髮・・ｽ・ｽE
- Annotation / Report・ｽE・ｽ豕ｨ驥茨ｿｽE繝ｬ繝晢ｿｽE繝茨ｼ・
- Snapshot / Export・ｽE・ｽ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ逕滂ｿｽE遲峨」iewer 迢ｬ閾ｪ蜃ｺ蜉幢ｼ・


## 1.2 Core・ｽE・ｽEead-only state・ｽE・ｽE

Core 縺ｯ縲梧ｧ矩 state縲阪→縲袈I state (uiState)縲搾ｿｽE 2 邉ｻ蛻励□縺代ｒ謇ｱ縺・・ｽ・ｽE

- **讒矩 state・ｽE・ｽEtruct・ｽE・ｽE*

  - strict validation 貂医∩ .3dss.json 繧偵◎縺ｮ縺ｾ縺ｾ菫晄戟縺吶ｋ縲・
  - 繝医ャ繝励Ξ繝吶Ν讒矩・ｽE・ｽE
    - `lines[]`
    - `points[]`
    - `aux[]`
    - `document_meta`
  - deep-freeze 縺輔ｌ縺・read-only 繧ｪ繝悶ず繧ｧ繧ｯ繝医→縺励※謇ｱ縺・・ｽ・ｽE 
    隕∫ｴ縺ｮ add / update / remove / 蠎ｧ讓呵｣懈ｭ｣縺ｪ縺ｩ縺ｯ荳蛻・・ｽ・ｽ繧上↑縺・・ｽ・ｽE

- **UI state・ｽE・ｽEiState・ｽE・ｽE*

  - viewer 縺後後←縺・・ｽ・ｽ縺帙※縺・・ｽ・ｽ縺九搾ｿｽE迥ｶ諷九□縺代ｒ謖√▽縲・
  - 萓具ｼ・
    - `selection`・ｽE・ｽ驕ｸ謚樔ｸｭ uuid 縺ｨ kind・ｽE・ｽE
    - `frame.current` / `frame.range`
    - `cameraState`・ｽE・ｽ菴咲ｽｮ繝ｻ蜷代″繝ｻFOV 遲会ｼ・
    - `filters`・ｽE・ｽEines/points/aux 縺ｮ ON/OFF・ｽE・ｽE
    - `runtime`・ｽE・ｽErame 蜀咲函荳ｭ縺九・ｿｽE蜍輔き繝｡繝ｩ荳ｭ縺・遲会ｼ・
    - `mode`・ｽE・ｽEacro / micro・ｽE・ｽE
     窶ｻ meso 縺ｯ蟆・・ｽ・ｽ諡｡蠑ｵ縺ｮ莠育ｴ・・ｽ・ｽ縺ｨ縺励∵悽莉墓ｧ假ｼ育樟陦悟ｮ溯｣・・ｽ・ｽE・ｽ・ｽ・ｽE・ｽ縺ｧ縺ｯ謇ｱ繧上↑縺・・ｽ・ｽE
    - `microState`・ｽE・ｽEicroFX 縺ｮ蜈･蜉幢ｼ・
    - `viewerSettings`・ｽE・ｽEineWidth 繧・microFX 險ｭ螳壹↑縺ｩ・ｽE・ｽE
    - `visibleSet`・ｽE・ｽ迴ｾ蝨ｨ謠冗判蟇ｾ雎｡縺ｨ縺ｪ縺｣縺ｦ縺・・ｽ・ｽ uuid 髮・・ｽ・ｽ・ｽE・ｽE

讒矩 state 縺ｨ uiState 縺ｮ隧ｳ邏ｰ縺ｯ隨ｬ 2 遶繝ｻ隨ｬ 5 遶縺ｫ縺ｦ螳夂ｾｩ縺吶ｋ縲・ 
譛ｬ遶縺ｧ縺ｯ縲・*struct 縺ｯ荳榊､会ｼ瞬iState 縺縺代′螟牙喧縺吶ｋ**縲阪→縺・・ｽ・ｽ髢｢菫ゅ□縺代ｒ蝗ｺ螳壹☆繧九・


## 1.3 蜀・・ｽ・ｽ萓晏ｭ倬未菫・

萓晏ｭ俶婿蜷托ｿｽE蟶ｸ縺ｫ縲御ｸ贋ｽ阪Ξ繧､繝､ 竊・荳倶ｽ阪Ξ繧､繝､縲搾ｿｽE荳譁ｹ蜷代→縺吶ｋ縲・

- UI / dev harness 繝ｬ繧､繝､・ｽE・ｽEviewer_dev.html` / `viewerDevHarness.js` / gizmo / timeline / HUD DOM・ｽE・ｽE
  - 竊・`viewerHub`・ｽE・ｽEhub.core.*` / `hub.pickObjectAt`・ｽE・ｽE
- runtime Boot / Core・ｽE・ｽEiState / 蜷・・ｽ・ｽ Controller / CameraEngine / Visibility / Selection / Mode / Micro ・ｽE・ｽE
  - 竊・struct・ｽE・ｽEmmutable 3DSS・ｽE・ｽE
  - 竊・Renderer・ｽE・ｽEendererContext + microFX・ｽE・ｽE
- three.js / WebGL

PointerInput / KeyboardInput 縺ｯ縲鯉ｿｽE蜉帙う繝吶Φ繝磯寔邏・・ｽ・ｽ繧､繝､縲阪→縺励※縲・ 
window / canvas 縺ｮ DOM 繧､繝吶Φ繝医ｒ 1 邂・・ｽ・ｽ縺ｧ蜿励￠蜿悶ｊ縲・ 
蠢・・ｽ・ｽ `hub.core.*` 縺縺代ｒ蜿ｩ縺擾ｼ・ameraEngine 繧・three.js 繧堤峩謗･隗ｦ繧峨↑縺・・ｽ・ｽ縲・

Validator 縺ｯ縲罫untime 襍ｷ蜍募燕縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繝輔ぉ繝ｼ繧ｺ縲阪↓縺縺第諺蜈･縺輔ｌ繧具ｼ・

- JSON 繝ｭ繝ｼ繝・竊・Validator・ｽE・ｽEtrict full validation・ｽE・ｽ・ｽE OK 縺ｮ縺ｨ縺搾ｿｽE縺ｿ Core 縺ｫ貂｡縺・

HUD / microFX 縺ｯ Renderer 縺ｮ荳驛ｨ縺ｨ縺励※謇ｱ縺・・ｽ・ｽE 
讒矩 state 縺ｫ縺ｯ荳蛻・・ｽ・ｽ蟄倥＆縺帙↑縺・・ｽ・ｽ蠎ｧ讓吝盾辣ｧ縺ｯ縺励※繧ゅ∵ｧ矩縺ｮ螟画峩縺ｯ縺励↑縺・・ｽ・ｽ縲・


## 1.4 蜷・・ｽ・ｽ繧ｸ繝･繝ｼ繝ｫ縺ｮ雋ｬ蜍・

### 1.4.1 Boot・ｽE・ｽEootstrapViewer.js・ｽE・ｽE

- `bootstrapViewer(canvasOrId, document3dss, options?)`

  - 蠖ｹ蜑ｲ・ｽE・ｽE
    - canvas 隗｣豎ｺ・ｽE・ｽEOM 隕∫ｴ or id 譁・・ｽ・ｽ・ｽE・ｽE・ｽE
    - **validate3DSS 繧貞ｸｸ縺ｫ螳溯｡・*・ｽE・ｽEG縺ｪ繧・throw縲Ｉub 縺ｯ逕滂ｿｽE縺励↑縺・・ｽ・ｽE
    - `options.strictValidate === true` 縺ｾ縺滂ｿｽE `options.validateRefIntegrity === true` 縺ｮ蝣ｴ蜷茨ｿｽE縺ｿ **validateRefIntegrity** 繧貞ｮ溯｡鯉ｼ・G縺ｪ繧・throw・ｽE・ｽE
    - validate 蠕後↓ **deep-freeze・ｽE・ｽEmmutable蛹厄ｼ・* 縺吶ｋ
    - structIndex・ｽE・ｽEuid 繧､繝ｳ繝・・ｽ・ｽ繧ｯ繧ｹ / frame 遽・・ｽ・ｽ・ｽE・ｽ・ｽE讒狗ｯ・
    - uiState 縺ｮ蛻晄悄蛹・
    - controller 鄒､ / cameraEngine / cameraController / viewerSettingsController 縺ｮ蛻晄悄蛹厄ｼ・ore 蜀・・ｽ・ｽ莠剃ｾ晏ｭ假ｿｽE import 縺ｧ邨撰ｿｽE縺・DI 縺ｧ貂｡縺呻ｼ・
    - rendererContext 蛻晄悄蛹・竊・`syncDocument(document, indices)` 竊・`getSceneMetrics()`
    - `metrics` 縺九ｉ蛻晄悄繧ｫ繝｡繝ｩ state 繧呈ｱｺ螳壹＠縲・*`cameraEngine.setState(initialState)`** 縺ｧ遒ｺ螳壹☆繧具ｼ・etrics 縺・null 縺ｮ蝣ｴ蜷茨ｿｽE fallback 隕冗ｯ・・ｽ・ｽE
    - `core.recomputeVisibleSet()` 繧・1 蝗槫他繧薙〒蛻晄悄 visibleSet 繧堤｢ｺ螳壹☆繧・
    - `createViewerHub({ core, renderer })` 繧貞他縺ｳ縲”ub 繧堤函謌舌＠縺ｦ霑斐☆
    - **繝ｬ繝ｳ繝繝ｼ繝ｫ繝ｼ繝鈴幕蟋具ｿｽE陦後ｏ縺ｪ縺・*・ｽE・ｽEhub.start()` 縺ｯ Host / dev harness 縺ｮ雋ｬ蜍呻ｼ・
    - `options.devBootLog === true` 縺ｮ蝣ｴ蜷医∬ｵｷ蜍輔Ο繧ｰ・ｽE・ｽEOOT / MODEL / CAMERA / LAYERS / FRAME・ｽE・ｽ繧・1 蝗槭★縺､蜃ｺ蜉帙☆繧・

  - options・ｽE・ｽE
    - `devBootLog?: boolean`
    - `logger?: (line: string) => void`
    - `strictValidate?: boolean`
    - `validateRefIntegrity?: boolean`

- `bootstrapViewerFromUrl(canvasOrId, url, options?)`

  - 蠖ｹ蜑ｲ・ｽE・ｽE
    - `fetch(url)` 竊・`res.ok===false` 縺ｯ throw・ｽE・ｽETTP status 繧貞性繧√ｋ・ｽE・ｽE
    - `res.json()` 縺励◆ document 繧・`bootstrapViewer(canvasOrId, document, options2)` 縺ｫ貂｡縺・
    - `options2.strictValidate` 縺ｮ default 縺ｯ **true**・ｽE・ｽ譛ｪ謖・・ｽ・ｽ譎ゅ・蜿ゑｿｽE謨ｴ蜷域ｧ縺ｾ縺ｧ蜷ｫ繧√◆ strict 繧貞━蜈茨ｼ・

  - 豕ｨ諢擾ｼ・
    - schema 蜿門ｾ励↑縺ｩ縺ｮ霑ｽ蜉騾壻ｿ｡縺ｯ遖∵ｭ｢・ｽE・ｽEalidator 縺ｯ繝ｭ繝ｼ繧ｫ繝ｫ蜷梧｢ｱ schema 繧貞盾辣ｧ縺励※蛻晄悄蛹悶☆繧具ｼ・



### 1.4.2 viewerHub・ｽE・ｽEuntime/viewerHub.js・ｽE・ｽE

- runtime 蜀・・ｽ・ｽ縺ｫ縺ゅｋ Core / Renderer / CameraEngine 遲峨ｒ縺ｾ縺ｨ繧√※邂｡逅・・ｽ・ｽ縲・ 
  螟夜Κ縺ｫ縺ｯ **hub 1 繧ｪ繝悶ず繧ｧ繧ｯ繝医□縺・* 繧定ｦ九○繧九・

- 莉｣陦ｨ逧・・ｽ・ｽ蜈ｬ髢九う繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ・ｽE・ｽE

  - `hub.start()` / `hub.stop()` 窶ｦ 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ繝ｫ繝ｼ繝鈴幕蟋具ｿｽE蛛懈ｭ｢
  - `hub.pickObjectAt(ndcX, ndcY)` 窶ｦ NDC 蠎ｧ讓吶°繧画ｧ矩隕∫ｴ縺ｮ uuid 繧貞叙蠕・
  - `hub.core.frame.*`
  - `hub.core.camera.*`
  - `hub.core.selection.*`
  - `hub.core.mode.*`
  - `hub.core.micro.*`
  - `hub.core.filters.*`
  - `hub.core.runtime.*`

- UI / dev harness / host 繧｢繝励Μ縺ｯ **hub 邨檎罰縺ｧ縺励° runtime 繧呈桃菴懊＠縺ｦ縺ｯ縺ｪ繧峨↑縺・*縲・

- `hub.pickObjectAt` 縺ｯ renderer 縺ｮ繝偵ャ繝育ｵ先棡縺ｧ縺ゅ▲縺ｦ繧ゅ・
  `visibilityController.isVisible(uuid) === false` 縺ｮ蝣ｴ蜷茨ｿｽE **蠢・・ｽ・ｽ null** 繧定ｿ斐☆・ｽE・ｽ荳榊庄隕冶ｦ∫ｴ縺ｯ驕ｸ謚樔ｸ榊庄繧剃ｿ晁ｨｼ・ｽE・ｽ縲・


### 1.4.3 Core

- strict validation 貂医∩ 3DSS 繧・struct 縺ｨ縺励※菫晄戟・ｽE・ｽEeep-freeze・ｽE・ｽE
- uiState 縺ｮ逕滂ｿｽE繝ｻ譖ｴ譁ｰ
- 蜷・・ｽ・ｽ Controller 縺ｫ繧医ｋ迥ｶ諷具ｿｽE遘ｻ・ｽE・ｽE
  - frameController 窶ｦ frame 縺ｮ蛻・・ｽ・ｽ譖ｿ縺茨ｿｽE蜀咲函
  - selectionController 窶ｦ selection 縺ｮ蜚ｯ荳縺ｮ豁｣隕上Ν繝ｼ繝・
  - visibilityController 窶ｦ frame / filter 縺九ｉ visibleSet 繧抵ｿｽE險育ｮ・
  - modeController 窶ｦ macro / meso / micro 繝｢繝ｼ繝臥ｮ｡逅・
  - microController 窶ｦ microFX 逕ｨ縺ｮ microState 繧定ｨ育ｮ・
  - CameraEngine 窶ｦ cameraState 縺ｮ蜚ｯ荳縺ｮ繧ｽ繝ｼ繧ｹ繧ｪ繝悶ヨ繧･繝ｫ繝ｼ繧ｹ

Core 縺ｯ three.js 繧堤峩謗･縺ｯ遏･繧峨★縲ヽenderer 縺ｫ蟇ｾ縺励※縲檎憾諷九阪ｒ貂｡縺吶□縺代→縺吶ｋ縲・


### 1.4.4 Renderer

- three.js / WebGL 縺ｫ繧医ｋ謠冗判蜃ｦ逅・・ｽ・ｽ諡・・ｽ・ｽE
- 荳ｻ縺ｪ雋ｬ蜍呻ｼ・
  - struct + structIndex 繧偵ｂ縺ｨ縺ｫ Object3D 鄒､繧呈ｧ狗ｯ・
  - `applyFrame(visibleSet)` 縺ｫ繧医ｋ陦ｨ遉ｺ繝ｻ髱櫁｡ｨ遉ｺ縺ｮ蛻・・ｽ・ｽ譖ｿ縺・
  - `updateCamera(cameraState)` 縺ｫ繧医ｋ繧ｫ繝｡繝ｩ蜿肴丐
  - `applyMicroFX(microState)` 縺ｫ繧医ｋ microFX 驕ｩ逕ｨ / 隗｣髯､
  - `applySelection(selectionState)` 縺ｫ繧医ｋ macro 繝｢繝ｼ繝臥畑繝上う繝ｩ繧､繝・
  - `pickObjectAt(ndcX, ndcY)` 縺ｫ繧医ｋ繧ｪ繝悶ず繧ｧ繧ｯ繝磯∈謚橸ｼ・aycasting・ｽE・ｽE

Renderer 縺ｯ讒矩 state 繧貞､画峩縺帙★縲∵緒逕ｻ螻樊ｧ・ｽE・ｽ・ｽE繝・・ｽ・ｽ繧｢繝ｫ繝ｻvisible繝ｻrenderOrder 遲会ｼ会ｿｽE縺ｿ繧呈桃菴懊☆繧九・


### 1.4.5 UI / dev harness

- 髢狗匱逕ｨ viewer・ｽE・ｽEiewer_dev.html・ｽE・ｽ繧・ｰ・・ｽ・ｽ縺ｮ Astro 繝夲ｿｽE繧ｸ縺ｪ縺ｩ縲・ 
  HTML / DOM 繧ｵ繧､繝会ｿｽE螳溯｣・・ｽ・ｽ諡・・ｽ・ｽ縲・

- 莉｣陦ｨ繝｢繧ｸ繝･繝ｼ繝ｫ・ｽE・ｽE
  - `pointerInput` 窶ｦ canvas 荳奇ｿｽE繝槭え繧ｹ謫堺ｽ・竊・hub.core.camera / hub.pickObjectAt
  - `keyboardInput` 窶ｦ keydown 竊・hub.core.frame / hub.core.mode / hub.core.camera
  - `gizmo` 窶ｦ 逕ｻ髱｢蜿ｳ荳具ｿｽE繧ｫ繝｡繝ｩ繧ｮ繧ｺ繝｢ 竊・hub.core.camera.*
  - `picker` 窶ｦ click 竊・hub.pickObjectAt 竊・hub.core.selection.*
  - `timeline` 窶ｦ frame 蜀咲函 UI 竊・hub.core.frame.*

UI 縺ｯ viewerHub 縺ｮ蜈ｬ髢・API 縺ｮ縺ｿ繧貞茜逕ｨ縺励，ore / Renderer 縺ｫ逶ｴ謗･隗ｦ繧後※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE


### 1.4.6 Validator

- `/schemas/3DSS.schema.json` 縺ｯ **繝ｭ繝ｼ繧ｫ繝ｫ蜷梧｢ｱ**繧貞盾辣ｧ縺励√ロ繝・・ｽ・ｽ繝ｯ繝ｼ繧ｯ蜿門ｾ暦ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽE
- `bootstrapViewer` 縺ｯ validate3DSS 繧貞ｸｸ縺ｫ螳溯｡後☆繧九・
- 蜿ゑｿｽE謨ｴ蜷域ｧ・ｽE・ｽEuid ref 遲会ｼ会ｿｽE `strictValidate` 縺ｾ縺滂ｿｽE `validateRefIntegrity` 謖・・ｽ・ｽ譎ゅ・縺ｿ螳溯｡後☆繧九・



### 1.4.7 Utils / Index / HUD

- Utils / Index
  - `structIndex` 縺ｫ繧医ｋ uuid 竊・kind / element 蜿ゑｿｽE
  - frame 遽・・ｽ・ｽ讀懶ｿｽE・ｽE・ｽEin / max・ｽE・ｽ縲∝ｺｧ讓咏ｳｻ繝ｦ繝ｼ繝・・ｽ・ｽ繝ｪ繝・・ｽ・ｽ

- HUD / microFX
  - axis / origin / bounds / glow / highlight 縺ｪ縺ｩ縺ｮ隕冶ｦ夊｣懷勧
  - 縺吶∋縺ｦ Renderer 蜀・・ｽ・ｽ縺ｮ three.js 繧ｪ繝悶ず繧ｧ繧ｯ繝医→縺励※螳溯｣・
  - 3DSS 讒矩縺ｫ縺ｯ荳蛻・・ｽ・ｽ縺肴綾縺輔↑縺・・ｽ・ｽ縲瑚ｦ九∴譁ｹ縲榊ｰら畑・ｽE・ｽE


## 1.5 I/O・ｽE・ｽEiewer・ｽE・ｽ讎りｦ・・ｽ・ｽE

- 蜈･蜉幢ｼ・`.3dss.json`・ｽE・ｽEtrict full validation 貂医∩ 3DSS 讒矩繝・・ｽE繧ｿ・ｽE・ｽE
- 蜃ｺ蜉幢ｼ夂┌縺・

UI 迥ｶ諷具ｿｽE繧ｫ繝｡繝ｩ繝ｻvisibility 縺ｪ縺ｩ縺ｯ **繧ｻ繝・・ｽ・ｽ繝ｧ繝ｳ蜀・・ｽE uiState 縺ｫ縺縺台ｿ晄戟** 縺励・ 
繝輔ぃ繧､繝ｫ菫晏ｭ倥ｄ螟夜Κ蜃ｺ蜉幢ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽE

隧ｳ邏ｰ縺ｪ I/O 繝昴Μ繧ｷ繝ｼ縺ｯ隨ｬ 6 遶縺ｫ縺ｦ螳夂ｾｩ縺吶ｋ縲・


## 1.6 遖∵ｭ｢莠矩・・ｽ・ｽEiewer 蜈ｨ菴難ｼ・

viewer 縺ｯ谺｡縺ｮ陦檎ぜ繧剃ｸ蛻・・ｽ・ｽ縺｣縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

1. 讒矩繝・・ｽE繧ｿ縺ｮ螟画峩・ｽE・ｽEdd / update / remove・ｽE・ｽE
2. 讒矩繝・・ｽE繧ｿ縺ｮ菫晏ｭ假ｼ・xporter・ｽE・ｽE
3. 邱ｨ髮・・ｽ・ｽ繝吶Φ繝茨ｼ・ndo / redo / duplicate 遲会ｼ会ｿｽE螳溯｣・
4. UI 迥ｶ諷具ｿｽE JSON 蜃ｺ蜉幢ｿｽE豌ｸ邯壼喧
5. annotation / comment / report 遲会ｿｽE逕滂ｿｽE
6. viewerSettings 繧・JSON 蛹悶＠縺ｦ菫晏ｭ假ｼ域ｰｸ邯壼喧・ｽE・ｽ縺吶ｋ縺薙→
7. extension 縺ｮ諢丞袖隗｣驥茨ｿｽE逕滂ｿｽE繝ｻ陬懷ｮ鯉ｼ域ｧ矩螟画峩縺ｫ逶ｸ蠖難ｼ・
8. normalize / 謗ｨ貂ｬ / 陬懷ｮ・/ prune / reorder 遲会ｿｽE逕滂ｿｽE蜃ｦ逅・
9. 譛ｪ譚･繧ｹ繧ｭ繝ｼ繝樣・・ｽ・ｽ縺ｮ謗ｨ貂ｬ繝ｻ隗｣驥茨ｼ・emantic inference・ｽE・ｽE

viewer 縺ｯ **螳鯉ｿｽE read-only 縺ｮ陦ｨ遉ｺ陬・・ｽ・ｽ** 縺ｧ縺ゅｊ縲・ 
viewer 迢ｬ閾ｪ諠・・ｽ・ｽ縺ｯ uiState 蜀・・ｽ・ｽ縺ｫ縺ｮ縺ｿ菫晄戟縺励※繧医＞・ｽE・ｽ讒矩繝・・ｽE繧ｿ縺ｸ縺ｮ豺ｷ蜈･遖∵ｭ｢・ｽE・ｽ縲・

## 1.7 襍ｷ蜍輔ヵ繝ｭ繝ｼ・ｽE・ｽEiewer_dev.html 竊・viewerDevHarness.js 竊・bootstrapViewer 竊・viewerHub・ｽE・ｽE

### 1.7.1 繧ｨ繝ｳ繝医Μ邨瑚ｷｯ縺ｮ蝗ｺ螳・

`viewerDevHarness.js` 縺・`bootstrapViewerFromUrl` 繧貞他縺ｳ縲∝ｾ励ｉ繧後◆ `viewerHub` 縺ｫ蟇ｾ縺励※  
`hub.start()` 繧貞他縺ｳ蜃ｺ縺励√＆繧峨↓ `PointerInput` / `KeyboardInput` 繧呈ｧ狗ｯ峨＠縺ｦ canvas / window 縺ｫ繧､繝吶Φ繝医ｒ謗･邯壹☆繧九・

1. `viewer_dev.html`  
   - dev 逕ｨ DOM 鬪ｨ譬ｼ・ｽE・ｽED canvas繝ｻ繝ｭ繧ｰ鬆伜沺繝ｻ繝懊ち繝ｳ遲会ｼ峨ｒ螳夂ｾｩ縺吶ｋ縲・

2. `viewerDevHarness.js`  
   - `window.load`・ｽE・ｽ縺ｾ縺滂ｿｽE `DOMContentLoaded`・ｽE・ｽ蠕後↓ UI 隕∫ｴ繧抵ｿｽE縺ｨ縺ｨ縺翫ｊ蜿門ｾ励＠縲・ 
     `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` 繧・1 蠎ｦ縺縺大他縺ｳ蜃ｺ縺吶・
   - 蠕励ｉ繧後◆ `viewerHub` 繧偵Ο繝ｼ繧ｫ繝ｫ螟画焚縺翫ｈ縺ｳ繧ｰ繝ｭ繝ｼ繝舌Ν・ｽE・ｽEwindow.hub` 遲会ｼ峨↓ expose 縺励※縲・ 
     dev 逕ｨ UI / 繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺九ｉ險ｺ譁ｭ縺ｧ縺阪ｋ繧医≧縺ｫ縺吶ｋ縲・
   - `hub.start()` 繧貞他縺ｳ蜃ｺ縺励※ render loop・ｽE・ｽErequestAnimationFrame`・ｽE・ｽ繧帝幕蟋九☆繧九・
   - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` 繧堤函謌舌＠縲・ 
     `attach()`・ｽE・ｽ縺ゅｌ・ｽE・ｽE・ｽ繧貞他繧薙〒 canvas / window 縺ｫ pointer / key 繧､繝吶Φ繝医ｒ謗･邯壹☆繧九・
   - PointerInput / KeyboardInput / gizmo / 繧ｿ繧､繝繝ｩ繧､繝ｳ縺ｪ縺ｩ縺ｧ蜿励￠縺滂ｿｽE蜉帙ｒ  
     `hub.core.*` / `hub.pickObjectAt` 縺ｫ繝槭ャ繝斐Φ繧ｰ縺吶ｋ縲・

3. `runtime/bootstrapViewer.js`  
   - 3DSS 縺ｮ strict validation・ｽE・ｽEbootstrapViewerFromUrl` 邨檎罰縺ｮ蝣ｴ蜷茨ｼ峨・
   - struct 縺ｮ deep-freeze / `structIndex` 讒狗ｯ峨・
   - `rendererContext` / `uiState` / `CameraEngine` / 蜷・・ｽ・ｽ Controller 縺ｮ蛻晄悄蛹悶・
   - `createViewerHub({ core, renderer })` 繧貞他縺ｳ蜃ｺ縺励～hub` 繧定ｿ斐☆縲・ 
     ・ｽE・ｽ縺薙％縺ｧ縺ｯ `hub.start()` 繧貞他縺ｰ縺壹√Ξ繝ｳ繝繝ｼ繝ｫ繝ｼ繝怜宛蠕｡縺ｯ Host / dev harness 蛛ｴ縺ｮ雋ｬ蜍吶→縺吶ｋ・ｽE・ｽE

4. `viewerHub`  
   - `hub.core.*` 縺ｨ `hub.pickObjectAt` 繧帝壹§縺ｦ縲・ 
     frame / camera / selection / mode / micro / filters / runtime API 繧抵ｿｽE髢九☆繧九・
   - `hub.start()` / `hub.stop()` 縺ｧ render loop・ｽE・ｽErequestAnimationFrame`・ｽE・ｽ繧帝幕蟋具ｿｽE蛛懈ｭ｢縺吶ｋ縲・

縺難ｿｽE邨瑚ｷｯ莉･螟悶°繧・Core / Renderer / CameraEngine 繧・`new` / 逶ｴ謗･蜻ｼ縺ｳ蜃ｺ縺励☆繧九％縺ｨ縺ｯ遖∵ｭ｢縺ｨ縺吶ｋ縲・ 
PointerInput / KeyboardInput 縺ｯ **UI 繝ｬ繧､繝､・ｽE・ｽEiewerDevHarness / 譛ｬ逡ｪ Host・ｽE・ｽ縺九ｉ・ｽE縺ｿ** `new` 縺励※繧医￥縲・ 
runtime 螻､・ｽE・ｽEruntime/*`・ｽE・ｽ縺九ａEimport / `new` 縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

蠢・・ｽ・ｽ `bootstrapViewer` / `bootstrapViewerFromUrl` 繧・runtime 縺ｮ蜚ｯ荳縺ｮ蜈･蜿｣縺ｨ縺励・ 
霑斐▲縺ｦ縺阪◆ `hub` 縺ｫ蟇ｾ縺励※ Host 蛛ｴ縺・`hub.start()` 繧貞他縺ｳ蜃ｺ縺吶％縺ｨ縺ｧ繝ｬ繝ｳ繝繝ｼ繝ｫ繝ｼ繝励ｒ髢句ｧ九☆繧九・

---

### 1.7.2 viewerDevHarness.js 縺ｮ雋ｬ蜍・

`viewerDevHarness.js` 縺ｯ縲慧ev 逕ｨ繝帙せ繝医阪〒縺ゅｊ縲〉untime 縺ｨ縺ｯ譏守｢ｺ縺ｫ蛻・・ｽ・ｽ縺吶ｋ縲・

- 蠖ｹ蜑ｲ・ｽE・ｽE
  - dev 逕ｨ HTML・ｽE・ｽEviewer_dev.html`・ｽE・ｽ縺ｫ驟咲ｽｮ縺輔ｌ縺溷推遞ｮ DOM・ｽE・ｽErame 繧ｹ繝ｩ繧､繝繝ｻfilter 繝懊ち繝ｳ繝ｻHUD繝ｻgizmo 遲会ｼ峨ｒ蜿門ｾ励☆繧九・
  - `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` 繧・1 蝗槭□縺大他縺ｳ蜃ｺ縺励・ 
    蠕励ｉ繧後◆ `viewerHub` 繧偵Ο繝ｼ繧ｫ繝ｫ螟画焚縺翫ｈ縺ｳ `window.hub` 縺ｫ菫晄戟縺吶ｋ縲・
  - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` 繧堤函謌舌＠縲・ 
    canvas / window 縺ｫ pointer / key 繧､繝吶Φ繝医ｒ謗･邯壹☆繧九・
  - `hub.core.frame.*` / `hub.core.filters.*` / `hub.core.mode.*` / `hub.core.selection.*` /  
    `hub.core.camera.*` 縺ｪ縺ｩ繧・UI 繧､繝吶Φ繝茨ｼ茨ｿｽE繧ｿ繝ｳ / 繧ｹ繝ｩ繧､繝 / gizmo 遲会ｼ峨↓謗･邯壹☆繧九・
  - dev 逕ｨ HUD / 繝｡繧ｿ繝代ロ繝ｫ / 繝ｭ繧ｰ陦ｨ遉ｺ・ｽE・ｽEOOT / MODEL / CAMERA / LAYERS / FRAME・ｽE・ｽ繧貞ｮ溯｣・・ｽ・ｽ繧九・
  - `hub.start()` / `hub.stop()` 繧貞他縺ｳ蜃ｺ縺励‥ev viewer 縺ｮ繝ｩ繧､繝輔し繧､繧ｯ繝ｫ・ｽE・ｽ襍ｷ蜍・/ 蜀崎ｵｷ蜍・/ 蛛懈ｭ｢・ｽE・ｽ繧堤ｮ｡逅・・ｽ・ｽ繧九・
  - dev viewer・ｽE・ｽEiewer_dev.html・ｽE・ｽ・ｽE縲・
  fetch 螟ｱ謨暦ｿｽEJSON 繝托ｿｽE繧ｹ繧ｨ繝ｩ繝ｼ繝ｻstrict validation NG 縺ｮ
  縺・・ｽ・ｽ繧鯉ｿｽE蝣ｴ蜷医ｂ struct 繧剃ｸ蛻・・ｽ・ｽ謖√○縺・hub 繧堤函謌舌＠縺ｪ縺・・ｽ・ｽE
  蜿ｳ繝壹う繝ｳ縺ｫ縺ｯ繧ｨ繝ｩ繝ｼ遞ｮ蛻･・ｽE・ｽEETWORK_ERROR / JSON_ERROR / VALIDATION_ERROR・ｽE・ｽE
  縺ｨ繝｡繝・・ｽ・ｽ繝ｼ繧ｸ繧定｡ｨ遉ｺ縺励～(no struct loaded)` 縺ｨ譏守､ｺ縺吶ｋ縲・


- 蛻ｶ邏・・ｽ・ｽE
  - `runtime/core/*` / `runtime/renderer/*` 繧堤峩謗･ import 縺励↑縺・ 
    ・ｽE・ｽEuntime 縺ｸ縺ｮ蜈･蜿｣縺ｯ `runtime/bootstrapViewer.js` 縺ｮ `bootstrapViewer*` 縺ｮ縺ｿ縺ｨ縺吶ｋ・ｽE・ｽ縲・
  - three.js / AJV / CameraEngine 繧堤峩謗･隗ｦ繧峨↑縺・・ｽ・ｽE
  - 3DSS 讒矩・ｽE・ｽEcore.data` / `structIndex`・ｽE・ｽ繧貞､画峩縺励↑縺・・ｽ・ｽEiState 縺ｮ蜿ゑｿｽE縺ｨ陦ｨ遉ｺ縺縺題｡後≧・ｽE・ｽ縲・
  - PointerInput / KeyboardInput 縺ｮ繝ｭ繧ｸ繝・・ｽ・ｽ繧剃ｸ頑嶌縺阪○縺壹・ｿｽE蜉・竊・`hub.core.*` / `hub.pickObjectAt` 縺ｮ豬√ｌ繧剃ｿ昴▽縲・

讎ら払繝輔Ο繝ｼ縺ｯ谺｡縺ｮ騾壹ｊ・ｽE・ｽE

```
viewer_dev.html      ・ｽE・ｽ髢狗匱逕ｨ DOM 鬪ｨ譬ｼ・ｽE・ｽE
  竊・
viewerDevHarness.js  ・ｽE・ｽEev 逕ｨ繝擾ｿｽE繝阪せ・ｽE・ｽbootstrapViewerFromUrl / hub.start / PointerInput / KeyboardInput・ｽE・ｽE
  竊・
bootstrapViewerFromUrl(canvas, modelPath, options)
  竊・
viewerHub・ｽE・ｽEub・ｽE・ｽE
  竊・
hub.start()          ・ｽE・ｽ繝ｬ繝ｳ繝繝ｼ繝ｫ繝ｼ繝鈴幕蟋具ｼ・
```


## 1.8 dev viewer 縺ｨ譛ｬ逡ｪ viewer 縺ｮ髢｢菫・

viewer runtime 閾ｪ菴難ｿｽE繝帙せ繝磯撼萓晏ｭ假ｿｽE蜈ｱ騾壹さ繝ｳ繝晢ｿｽE繝阪Φ繝医〒縺ゅｊ縲・
dev viewer 縺ｯ縺晢ｿｽE荳螳溯｣・・ｽ・ｽ縺ｫ驕弱℃縺ｪ縺・・ｽ・ｽ縺ｨ繧剃ｻ墓ｧ倥→縺励※譏守､ｺ縺吶ｋ縲・

- 蜈ｱ譛峨☆繧九ｂ縺ｮ・ｽE・ｽE
 - runtime/bootstrapViewer.js
 - runtime/viewerHub.js
 - runtime/core/*
 - runtime/renderer/*
- dev viewer 蝗ｺ譛会ｿｽE繧ゑｿｽE・ｽE・ｽE
 - viewer_dev.html・ｽE・ｽE 繧ｫ繝ｩ繝繝ｬ繧､繧｢繧ｦ繝医√Γ繧ｿ繝代ロ繝ｫ縲？UD 遲会ｼ・
 - viewerDevHarness.js
 - dev 逕ｨ HUD / gizmo / 蜷・・ｽ・ｽ繝懊ち繝ｳ鬘橸ｼ・i/gizmo.js 縺ｪ縺ｩ・ｽE・ｽE

### 1.8.1 蜈ｱ騾壹お繝ｳ繝医Μ繝昴う繝ｳ繝・
縺吶∋縺ｦ縺ｮ繝帙せ繝茨ｿｽE縲∵ｬ｡縺ｮ 蜈ｱ騾壹お繝ｳ繝医Μ API 縺九ｉ viewer runtime 繧定ｵｷ蜍輔☆繧九・
- bootstrapViewer(canvasOrId, threeDSS, options?) 竊・hub
 - strict validation 貂医∩縺ｮ 3DSS 繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ蜿励￠蜿悶ｊ縲」iewerHub 繧呈ｧ狗ｯ峨＠縺ｦ霑斐☆縲・
- bootstrapViewerFromUrl(canvasOrId, url, options?) 竊・Promise<hub>
 - url 縺九ｉ .3dss.json 繧・fetch 縺励《trict validation 繧貞ｮ溯｡後＠縺溘≧縺医〒
bootstrapViewer 繧貞他縺ｳ蜃ｺ縺吶Λ繝・・ｽ・ｽ繝ｼ縲・

dev viewer 繧よ悽逡ｪ viewer 繧ゅ√％繧御ｻ･螟厄ｿｽE邨瑚ｷｯ縺ｧ runtime 繧定ｵｷ蜍輔＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

### 1.8.2 dev viewer・ｽE・ｽ髢狗匱逕ｨ繝擾ｿｽE繝阪せ・ｽE・ｽ・ｽE襍ｷ蜍輔ヵ繝ｭ繝ｼ
dev viewer 縺ｮ襍ｷ蜍墓凾縲」iewerDevHarness.js 縺ｯ讎ゑｿｽE谺｡縺ｮ繧医≧縺ｫ蜍輔￥・ｽE・ｽE
1. window.addEventListener('load', boot) 縺ｧ 1 蝗槭□縺・boot() 繧定ｵｷ蜍輔☆繧九・
2. boot() 蜀・・ｽ・ｽ
 - 繝｡繧ｿ繝代ロ繝ｫ / HUD / frame 繧ｹ繝ｩ繧､繝 / filter 繝懊ち繝ｳ遲会ｿｽE DOM 繧貞叙蠕励☆繧九・
 - const canvasId = "viewer-canvas";
 - const jsonUrl = "../3dss/scenes/default/default.3dss.json";・ｽE・ｽEaseline 遒ｺ隱肴凾・ｽE・ｽE
 - bootstrapViewerFromUrl(canvasId, jsonUrl, { devBootLog:true, devLabel:"viewer_dev", modelUrl:jsonUrl, logger:devLogger }) 繧貞他縺ｶ縲・
3. devLogger(line) 縺ｯ
 - console.log(line) + 繝｡繧ｿ繝代ロ繝ｫ縺ｸ縺ｮ霑ｽ險假ｼ・ppendModelLog(line)・ｽE・ｽ繧定｡後≧縲・

縺難ｿｽE繧医≧縺ｫ縲‥ev viewer 縺ｯ縲後Ο繧ｰ繝ｻHUD繝ｻ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ鬘槭′霑ｽ蜉縺輔ｌ縺滂ｿｽE繧ｹ繝医阪〒縺ゅｊ縲・
runtime 閾ｪ菴薙↓縺ｯ荳蛻・・ｽ・ｽ繧抵ｿｽE繧後↑縺・・ｽ・ｽE

### 1.8.3 譛ｬ逡ｪ viewer・ｽE・ｽEstro / 蝓九ａ霎ｼ縺ｿ・ｽE・ｽ・ｽE襍ｷ蜍輔ヵ繝ｭ繝ｼ

譛ｬ逡ｪ viewer・ｽE・ｽEstro 繧ｵ繧､繝医ｄ莉厄ｿｽE繧ｹ繝医い繝励Μ・ｽE・ｽ繧ゅ・
蝓ｺ譛ｬ逧・・ｽ・ｽ縺ｯ dev viewer 縺ｨ蜷後§繧ｨ繝ｳ繝医Μ API 繧堤畑縺・・ｽ・ｽ縲・

Host・ｽE・ｽEstro / React / plain HTML 遲会ｼ・
  竊・
bootstrapViewerFromUrl(canvasRef, modelUrl, options)
  竊・
viewerHub・ｽE・ｽEub・ｽE・ｽE
  竊・
host 蛛ｴ縺九ｉ hub.core.* 繧貞茜逕ｨ縺励※ UI 縺ｨ騾｣謳ｺ
  竊・
hub.start()          ・ｽE・ｽ繝ｬ繝ｳ繝繝ｼ繝ｫ繝ｼ繝鈴幕蟋具ｼ・


- Host・ｽE・ｽEstro / React / plain HTML 遲会ｼ・
 - 閾ｪ霄ｫ縺ｮ繝ｬ繧､繧｢繧ｦ繝茨ｿｽE荳ｭ縺ｫ <canvas> 繧ゅ＠縺擾ｿｽE canvas 繧貞性繧繧ｳ繝ｳ繝・・ｽ・ｽ繧抵ｿｽE鄂ｮ縺吶ｋ縲・
 - 繝槭え繝ｳ繝亥ｮ御ｺ・・ｽ・ｽ縺ｫ bootstrapViewerFromUrl 縺ｾ縺滂ｿｽE
莠句燕縺ｫ fetch + validation 貂医∩縺ｮ 3DSS 繧堤畑縺・・ｽ・ｽ bootstrapViewer 繧貞他縺ｶ縲・
 - 蠕励ｉ繧後◆ hub 縺ｮ core.* API 繧偵・ｿｽE蜑搾ｿｽE UI 繧ｳ繝ｳ繝晢ｿｽE繝阪Φ繝茨ｼ医ち繧､繝繝ｩ繧､繝ｳ繝ｻ繝ｬ繧､繝､繝医げ繝ｫ縺ｪ縺ｩ・ｽE・ｽ縺ｫ謗･邯壹☆繧九・
 - fetch 螟ｱ謨・/ JSON 繝托ｿｽE繧ｹ繧ｨ繝ｩ繝ｼ / strict validation NG 縺ｮ
 縺・・ｽ・ｽ繧後〒繧ゅ”ub 繧堤函謌舌○縺・canvas 繧呈緒逕ｻ縺励↑縺・
 ・ｽE・ｽ驛ｨ蛻・・ｽ・ｽ逕ｻ縺励↑縺・・ｽ・ｽ縲ょ承繝壹う繝ｳ File 縺ｫ `ERROR: <遞ｮ蛻･>` 繧定｡ｨ遉ｺ縺励・
 HUD 縺ｫ `ERROR` 繝舌ャ繧ｸ繧抵ｿｽE縺吶□縺代→縺励・
 struct・ｽE・ｽEDSS document・ｽE・ｽ・ｽE core 縺ｫ菫晄戟縺励↑縺・・ｽ・ｽE


- 蛻ｶ邏・・ｽ・ｽE
 - dev harness 縺ｨ蜷梧ｧ倥〉untime 縺ｫ縺ｯ bootstrapViewer* / hub.core.* 縺ｧ縺ｮ縺ｿ繧｢繧ｯ繧ｻ繧ｹ縺吶ｋ縲・
 - 讒矩繝・・ｽE繧ｿ・ｽE・ｽEDSS・ｽE・ｽ・ｽE strict read-only 縺ｨ縺励」iewer 縺九ｉ譖ｸ縺肴鋤縺医↑縺・・ｽ・ｽE

## 1.9 baseline 襍ｷ蜍墓凾縺ｮ蝗ｺ螳壽擅莉ｶ

譛ｬ遽縺ｧ縺ｯ縲‥ev viewer・ｽE・ｽEiewer_dev.html・ｽE・ｽ縺ｫ縺翫＞縺ｦ
default.3dss.json 繧定ｪｭ縺ｿ霎ｼ繧薙□縺ｨ縺阪↓
縲梧ｯ主屓蜷後§蛻晄悄逕ｻ髱｢縲阪′蜀咲樟縺輔ｌ繧九ｈ縺・・ｽ・ｽ縺吶ｋ縺溘ａ縺ｮ譚｡莉ｶ繧貞ｮ夂ｾｩ縺吶ｋ縲・

### 1.9.1 蜈･蜉帙ヵ繧｡繧､繝ｫ縺ｮ蝗ｺ螳・

1. dev 襍ｷ蜍墓凾縺ｮ baseline 蜈･蜉幢ｿｽE縲∝ｸｸ縺ｫ
../3dss/scenes/default/default.3dss.json 縺ｨ縺吶ｋ・ｽE・ｽ螳溘ヱ繧ｹ縺ｯ繝ｪ繝昴ず繝医Μ讒具ｿｽE縺ｫ霑ｽ蠕難ｼ峨・

2. 莉厄ｿｽE繧ｵ繝ｳ繝励Ν繧偵Ο繝ｼ繝峨☆繧・UI 縺後≠縺｣縺ｦ繧ゅ・
縲瑚ｵｷ蜍慕峩蠕後↓閾ｪ蜍輔〒繝ｭ繝ｼ繝峨＆繧後ｋ繝輔ぃ繧､繝ｫ縲搾ｿｽE荳願ｨ・1 譛ｬ縺ｫ髯仙ｮ壹☆繧九・

3. 隱ｭ縺ｿ霎ｼ繧薙□繝輔ぃ繧､繝ｫ繝代せ縺ｯ襍ｷ蜍輔Ο繧ｰ縺ｫ蠢・・ｽ・ｽ 1 陦鯉ｿｽE蜉帙☆繧九・

### 1.9.2 繧ｫ繝｡繝ｩ蛻晄悄迥ｶ諷具ｿｽE蝗ｺ螳・

default.3dss.json 隱ｭ縺ｿ霎ｼ縺ｿ逶ｴ蠕鯉ｿｽE繧ｫ繝｡繝ｩ迥ｶ諷具ｿｽE縲・
繧ｷ繝ｼ繝ｳ蠅・・ｽ・ｽ・ｽE・ｽEounding sphere・ｽE・ｽ縺九ｉ邂暦ｿｽE縺輔ｌ繧・豎ｺ螳夂噪縺ｪ蛻晄悄蛟､ 縺ｨ縺励※蝗ｺ螳壹☆繧九・

- 謚募ｽｱ譁ｹ蠑・ PerspectiveCamera
- up 繝吶け繝医Ν: (0, 0, 1) // Z+ 繧堤ｵｶ蟇ｾ荳翫→縺ｿ縺ｪ縺・
- target: 繧ｷ繝ｼ繝ｳ荳ｭ蠢・metrics.center・ｽE・ｽ蜿門ｾ励〒縺阪↑縺・・ｽ・ｽ蜷茨ｿｽE (0, 0, 0)・ｽE・ｽE
- 霍晞屬: 繧ｷ繝ｼ繝ｳ蜊雁ｾ・metrics.radius 縺ｮ邏・2.4 蛟搾ｼ・istance = radius * 2.4縲Ｓadius 荳搾ｿｽE譎ゑｿｽE 4・ｽE・ｽE
- 隕夜㍽隗・ fov = 50・ｽE・ｽEeg・ｽE・ｽE

蛻晄悄繧ｫ繝｡繝ｩ state 縺ｯ renderer 縺ｮ `getSceneMetrics()` 縺九ｉ邂暦ｿｽE縺励・
`cameraEngine.setState(initialState)` 縺ｫ繧医ｊ遒ｺ螳壹＆繧後ｋ縲・

縺難ｿｽE蛻晄悄蛟､縺ｯ 3DSS 讒矩縺ｸ譖ｸ縺肴綾縺輔★縲・
縺ゅ￥縺ｾ縺ｧ縲計iewer runtime 蜀・・ｽE uiState・ｽE・ｽEameraState・ｽE・ｽ縲阪→縺励※縺ｮ縺ｿ菫晄戟縺輔ｌ繧九・


#### 1.9.3 frame / layer 蛻晄悄迥ｶ諷・
baseline 襍ｷ蜍慕峩蠕鯉ｿｽE frame / layer 迥ｶ諷具ｿｽE谺｡縺ｮ縺ｨ縺翫ｊ蝗ｺ螳壹☆繧九・
- frame
 - detectFrameRange(struct) 縺ｫ繧医ｊ {min,max} 繧呈ｱゅａ繧九・
 - uiState.frame.current = frameRange.min・ｽE・ｽ譛蟆上ヵ繝ｬ繝ｼ繝縺九ｉ髢句ｧ具ｼ峨・
 - uiState.runtime.isFramePlaying = false・ｽE・ｽ・ｽE逕・OFF・ｽE・ｽ縲・
- layer / filters
 - filters.types.points = true
 - filters.types.lines = true
 - filters.types.aux = true
 - 縺､縺ｾ繧翫・ｿｽE逕溘ｄ繝輔ぅ繝ｫ繧ｿ謫堺ｽ懊ｒ陦後≧蜑搾ｿｽE縲鯉ｿｽE繝ｬ繧､繝､ ON縲搾ｿｽE迥ｶ諷九°繧牙ｧ九∪繧九・

### 1.9.4 襍ｷ蜍輔Ο繧ｰ・ｽE・ｽEOOT / MODEL / CAMERA / LAYERS / FRAME・ｽE・ｽE

viewer runtime 縺ｯ縲・ｿｽE譛溷喧螳御ｺ・・ｽ・ｽ縺ｫ options.devBootLog === true 縺ｮ蝣ｴ蜷医・
谺｡縺ｮ 5 繝ｬ繧ｳ繝ｼ繝峨ｒ 蠢・・ｽ・ｽ縺難ｿｽE鬆・・ｽ・ｽ縺ｧ 1 蝗槭□縺・蜃ｺ蜉帙☆繧九・
1. BOOT <label>
 - <label> 縺ｯ options.devLabel 縺後≠繧鯉ｿｽE縺昴ｌ繧堤畑縺・・ｽ・ｽ縺ｪ縺代ｌ縺ｰ "viewer_dev" 遲会ｿｽE譌｢螳壼､縲・
2. MODEL <modelUrl>
 - <modelUrl> 縺ｯ options.modelUrl 縺後≠繧鯉ｿｽE縺昴ｌ繧堤畑縺・・ｽ・ｽ縺ｪ縺代ｌ縺ｰ url・ｽE・ｽEromUrl 縺ｮ蠑墓焚・ｽE・ｽ縲・
3. CAMERA {...}
 - cameraEngine.getState() 逶ｸ蠖難ｿｽE payload 繧・JSON 譁・・ｽ・ｽ・ｽE縺ｨ縺励※蜃ｺ蜉帙☆繧九・
  - {"position":[x,y,z],"target":[tx,ty,tz],"fov":50} 縺ｮ繧医≧縺ｪ蠖｢縲・
4. LAYERS points=on/off lines=on/off aux=on/off
5. FRAME frame_id=<number>

縺薙ｌ繧会ｿｽE縲梧ｧ矩蛹悶Ο繧ｰ繧､繝吶Φ繝医阪→縺励※ runtime 蜀・・ｽ・ｽ縺九ｉ logger 縺ｫ貂｡縺輔ｌ繧九・
- options.logger 縺碁未謨ｰ縺ｮ蝣ｴ蜷・
 竊・蜷・・ｽ・ｽ繧・logger(line) 縺ｨ縺励※蜻ｼ縺ｳ蜃ｺ縺吶・

- options.logger 縺梧悴謖・・ｽ・ｽ・ｽE蝣ｴ蜷・
 竊・譌｢螳壹〒 console.log(line) 繧堤畑縺・・ｽ・ｽ縲・
dev viewer・ｽE・ｽEiewer_dev.html・ｽE・ｽ縺ｧ縺ｯ騾壼ｸｸ縲・

- logger = devLogger
・ｽE・ｽEonsole.log + 繝｡繧ｿ繝代ロ繝ｫ縺ｸ縺ｮ append・ｽE・ｽE
繧呈欠螳壹＠縲｀odel 繝代ロ繝ｫ縺ｫ

```text
BOOT  viewer_dev
MODEL ../s3dss/scenes/default.3dss.json
CAMERA {...}
LAYERS points=on lines=on aux=on
FRAME  frame_id=0
```

縺ｮ繧医≧縺ｪ陦後′荳ｦ縺ｶ縺薙→繧堤｢ｺ隱阪〒縺阪ｋ縲・

蜷後§繝薙Ν繝・+ 蜷後§ baseline 繝輔ぃ繧､繝ｫ縺ｫ蟇ｾ縺励※
縺薙ｌ繧会ｿｽE繝ｭ繧ｰ蜀・・ｽ・ｽ縺梧ｯ主屓荳閾ｴ縺吶ｋ縺薙→繧偵ｂ縺｣縺ｦ縲瑚ｵｷ蜍墓擅莉ｶ縺悟崋螳壹＆繧後※縺・・ｽ・ｽ縲阪→縺ｿ縺ｪ縺吶・


---

# 2 繝・・ｽE繧ｿ讒矩縺ｨ繧ｹ繧ｭ繝ｼ繝樊ｺ匁侠・ｽE・ｽ髢ｲ隕ｧ蛛ｴ隕也せ・ｽE・ｽE

viewer 縺ｯ逕滂ｿｽE繧｢繝励Μ縺ｧ縺ゅｋ modeler 縺ｨ逡ｰ縺ｪ繧翫・ 
蜈･蜉帙＆繧後◆ 3DSS 繝・・ｽE繧ｿ繧偵◎縺ｮ縺ｾ縺ｾ隱ｭ縺ｿ蜿悶ｊ縲∝庄隕門喧縺吶ｋ縺縺托ｿｽE繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ縺ゅｋ縲・

譛ｬ遶縺ｧ縺ｯ viewer 蛛ｴ縺九ｉ隕九◆ 3DSS 繝・・ｽE繧ｿ縺ｮ謇ｱ縺・・ｽ・ｽ繝ｻ貅匁侠遽・・ｽ・ｽ繝ｻ蜀・・ｽ・ｽ菫晄戟譁ｹ蠑上ｒ螳夂ｾｩ縺吶ｋ縲・ 
viewer 縺ｯ讒矩邱ｨ髮・・ｽE陬懷ｮ鯉ｿｽE菫ｮ蠕ｩ繧剃ｸ蛻・・ｽ・ｽ繧上↑縺・・ｽ・ｽE


## 2.1 髢ｲ隕ｧ蟇ｾ雎｡縺ｨ縺ｪ繧・3DSS 繝・・ｽE繧ｿ讒矩

viewer 縺梧桶縺・・ｽ・ｽ騾繝・・ｽE繧ｿ縺ｯ縲・ 
**modeler 縺檎函謌舌＠縺・`.3dss.json` 縺ｫ螳鯉ｿｽE萓晏ｭ・* 縺吶ｋ縲・

譛荳贋ｽ肴ｧ矩・ｽE・ｽE

1. `lines`・ｽE・ｽ髢｢菫りｦ∫ｴ  
2. `points`・ｽE・ｽ蟄伜惠隕∫ｴ  
3. `aux`・ｽE・ｽ陬懷勧隕∫ｴ  
4. `document_meta`・ｽE・ｽ邂｡逅・・ｽ・ｽ蝣ｱ

viewer 縺ｯ縺薙ｌ繧峨ｒ

- 隱ｭ縺ｿ蜿悶ｊ・ｽE・ｽEtrict validation・ｽE・ｽE
- 蜿ｯ隕門喧

縺ｮ 2 谿ｵ髫弱□縺代ｒ諡・・ｽ・ｽ縺励∫ｷｨ髮・・ｽE陦後ｏ縺ｪ縺・・ｽ・ｽE

3DSS 閾ｪ菴難ｿｽE莉墓ｧ假ｿｽE蛻･邏吶・DSS 莉墓ｧ俶嶌・ｽE・ｽE3DSS.schema.json`・ｽE・ｽ縲阪↓蟋費ｿｽE縲・ 
viewer 縺ｯ縺晢ｿｽE **髢ｲ隕ｧ蟆ら畑繧ｯ繝ｩ繧､繧｢繝ｳ繝・* 縺ｨ縺励※謖ｯ繧具ｿｽE縺・・ｽ・ｽE


## 2.2 繝・・ｽE繧ｿ隱ｭ霎ｼ譎ゑｿｽE蜃ｦ逅・・ｽ・ｽ繝ｭ繝ｼ

viewer 縺ｯ讒矩繝・・ｽE繧ｿ縺ｮ隱ｭ霎ｼ譎ゅ↓谺｡縺ｮ蜃ｦ逅・・ｽ・ｽ陦後≧・ｽE・ｽE

1. JSON 隱ｭ霎ｼ・ｽE・ｽEromUrl 縺ｮ蝣ｴ蜷茨ｿｽE fetch 竊・json・ｽE・ｽE
2. Validator 縺ｫ繧医ｋ validation・ｽE・ｽEalidate3DSS 繧貞ｸｸ縺ｫ螳溯｡鯉ｼ・
3. ・ｽE・ｽ謖・ｮ壽凾縺ｮ縺ｿ・ｽE・ｽ蜿ら・謨ｴ蜷域ｧ繝√ぉ繝・・ｽ・ｽ・ｽE・ｽEalidateRefIntegrity・ｽE・ｽE
4. Core 縺ｫ immutable state 縺ｨ縺励※繝ｭ繝ｼ繝会ｼ・eep-freeze・ｽE・ｽE
5. structIndex / frameRange 繧呈ｧ狗ｯ・
6. Renderer 縺ｫ繧医ｋ荳画ｬ｡蜈・・ｽ・ｽ繝ｼ繝ｳ讒狗ｯ会ｼ・yncDocument・ｽE・ｽ縺ｨ繧ｷ繝ｼ繝ｳ繝｡繝医Μ繧ｯ繧ｹ邂暦ｿｽE・ｽE・ｽEetSceneMetrics・ｽE・ｽE
7. 蛻晄悄 cameraState 繧堤｢ｺ螳壹＠縲…ameraEngine.setState(initialState) 繧定｡後≧
8. core.recomputeVisibleSet() 繧・1 蝗槫他縺ｳ縲・ｿｽE譛・visibleSet 繧堤｢ｺ螳壹☆繧・
9. hub 繧定ｿ斐☆・ｽE・ｽ謠冗判繝ｫ繝ｼ繝鈴幕蟋具ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽEost 縺・hub.start() 繧貞他縺ｶ・ｽE・ｽE


### 2.2.1 strict full validation 縺ｮ蜀・・ｽ・ｽ

viewer 縺ｯ `/schemas/3DSS.schema.json`・ｽE・ｽ繝ｭ繝ｼ繧ｫ繝ｫ蜷梧｢ｱ・ｽE・ｽ繧呈ｭ｣縺ｨ縺吶ｋ Validator・ｽE・ｽEJV・ｽE・ｽ縺ｫ繧医ｊ validation 繧定｡後≧縲・

- `validate3DSS(document)` 縺ｯ **蟶ｸ縺ｫ螳溯｡・*・ｽE・ｽEG縺ｪ繧・throw縲”ub 縺ｯ逕滂ｿｽE縺励↑縺・・ｽ・ｽE
- `validateRefIntegrity(document)` 縺ｯ **options.strictValidate===true 縺ｾ縺滂ｿｽE options.validateRefIntegrity===true 縺ｮ縺ｨ縺搾ｿｽE縺ｿ** 螳溯｡鯉ｼ・G縺ｪ繧・throw・ｽE・ｽE
- `bootstrapViewerFromUrl` 縺ｯ `strictValidate` 縺ｮ default 繧・**true** 縺ｨ縺吶ｋ

AJV 縺ｯ蟆代↑縺上→繧よｬ｡繧呈ｺ縺溘☆・ｽE・ｽE

- `removeAdditional: false`
- `useDefaults:      false`
- `coerceTypes:      false`

縺､縺ｾ繧翫・ｿｽE蜉・JSON 繧呈嶌縺肴鋤縺医ｋ譁ｹ蜷托ｿｽE繧ｪ繝励す繝ｧ繝ｳ縺ｯ荳蛻・・ｽ・ｽ繧上↑縺・・ｽ・ｽE


### 2.2.2 繝撰ｿｽE繧ｸ繝ｧ繝ｳ縺翫ｈ縺ｳ schema_uri 縺ｮ謇ｱ縺・

- `document_meta.schema_uri`
  - `.../schemas/3DSS.schema.json` 繧呈欠縺吶％縺ｨ繧定ｦ∵ｱゅ☆繧具ｼ医ヵ繧｡繧､繝ｫ蜷搾ｿｽE蝗ｺ螳夲ｼ・
  - schema_uri 縺ｮ **MAJOR 荳堺ｸ閾ｴ**縺ｯ隱ｭ霎ｼ諡貞凄
  - MINOR/PATCH 縺ｯ縲《trict validation 縺ｮ邨先棡縺ｫ蠕薙≧・ｽE・ｽ繧ｹ繧ｭ繝ｼ繝槭↓蜿阪＠縺ｦ縺・・ｽ・ｽ縺ｰ reject・ｽE・ｽE

- `document_meta.version`
  - 繝峨く繝･繝｡繝ｳ繝茨ｼ医さ繝ｳ繝・・ｽ・ｽ繝・・ｽ・ｽ・ｽE迚育ｮ｡逅・・ｽ・ｽ繧ｿ縺ｧ縺ゅｊ縲√せ繧ｭ繝ｼ繝樔ｺ呈鋤蛻､螳壹↓縺ｯ逕ｨ縺・・ｽ・ｽ縺・・ｽ・ｽ陦ｨ遉ｺ繝ｻ繝ｭ繧ｰ逕ｨ騾費ｼ・


## 2.3 蜀・・ｽ・ｽ state 縺ｮ讒矩・ｽE・ｽ讒矩 vs uiState・ｽE・ｽE

Core 蜀・・ｽ・ｽ縺ｧ菫晄戟縺吶ｋ state 縺ｯ縲梧ｧ矩繝・・ｽE繧ｿ縲阪→縲袈I state縲阪↓螳鯉ｿｽE縺ｫ蛻・・ｽ・ｽ縺輔ｌ繧九・

```
{
  // immutable・ｽE・ｽEeep-freeze 貂医∩・ｽE・ｽE
  document_3dss: {
    document_meta,
    points: [],
    lines: [],
    aux: [],
  },

  // read-only facade・ｽE・ｽEndices 蜀・・ｽ・ｽ・ｽE・ｽE
  structIndex: { /* getCenter/getKind/getItem ... */ },

  // viewer 蟆ら畑 uiState・ｽE・ｽEanonical state・ｽE・ｽE
  uiState: {
    frame: {
      current: number | null,
      range: { min:number, max:number } | null,
    },

    runtime: {
      isFramePlaying: boolean,
      isCameraAuto: boolean,
    },

    mode: "macro" | "micro",

    selection: { kind:"points"|"lines"|"aux"|null, uuid:string|null },
    hover:     { kind:"points"|"lines"|"aux"|null, uuid:string|null },

    filters: {
      points: boolean,
      lines: boolean,
      aux: boolean,
      auxModules: { grid:boolean, axis:boolean, plate:boolean, shell:boolean, hud:boolean, extension:boolean },
    },

    viewerSettings: {
      worldAxesVisible: boolean,
      lineWidthMode: "auto"|"fixed"|"adaptive",
      microFXProfile: "weak"|"normal"|"strong",
    },

    visibleSet: {
      frame: number | null,
      points: Set<string>,
      lines: Set<string>,
      aux: Set<string>,
    } | null,

    cameraState: {
      position: [number,number,number],
      target:   [number,number,number],
      up:       [number,number,number],
      fov: number,
      near: number,
      far: number,
      // 蠢・・ｽ・ｽ縺ｪ繧・distance 縺ｪ縺ｩ繧りｿｽ蜉・ｽE・ｽ縺溘□縺・renderer 縺ｸ貂｡縺呻ｿｽE縺ｯ荳奇ｿｽE遒ｺ螳壼､・ｽE・ｽE
    },

    microState: object | null, // MicroFXPayload
  },
}
```

迚ｹ蠕ｴ・ｽE・ｽE

- 讒矩繝・・ｽE繧ｿ・ｽE・ｽEdata`・ｽE・ｽ・ｽE deep-freeze 縺輔ｌ縺ｦ縺翫ｊ縲・ 
  縺ｩ縺ｮ繝ｬ繧､繝､縺九ｉ繧・**螟画峩遖∵ｭ｢**縲・
- UI state・ｽE・ｽEuiState`・ｽE・ｽ・ｽE viewer 蜀・・ｽ・ｽ螟画峩蜿ｯ閭ｽ縺縺後・ 
  `.3dss.json` 縺ｸ縺ｯ譖ｸ縺肴綾縺輔↑縺・・ｽ・ｽ繧ｻ繝・・ｽ・ｽ繝ｧ繝ｳ髯仙ｮ夲ｼ峨・
- `visibleSet` / `microState` 縺ｯ UI state 縺ｮ豢ｾ逕滓ュ蝣ｱ縺ｨ縺励※ Core 縺梧園譛峨＠縲・ 
  Renderer 縺ｯ縺昴ｌ繧定ｪｭ縺ｿ蜿悶ｋ縺縺代→縺吶ｋ縲・


## 2.4 viewer 縺ｫ縺翫￠繧区ｧ矩繝・・ｽE繧ｿ縺ｮ謇ｱ縺・・ｽ・ｽ

viewer 縺ｯ讒矩繝・・ｽE繧ｿ縺ｫ蟇ｾ縺励※谺｡繧剃ｸ蛻・・ｽ・ｽ繧上↑縺・・ｽ・ｽE

- 蜉遲・・ｽ・ｽEdd・ｽE・ｽE
- 螟画峩・ｽE・ｽEpdate・ｽE・ｽE
- 陬懷ｮ鯉ｼ・uto-fill・ｽE・ｽE
- 髯､蜴ｻ・ｽE・ｽEuto-clean・ｽE・ｽE
- 謗ｨ貂ｬ陬懷ｮ鯉ｼ・nference・ｽE・ｽE
- 蜀肴ｧ具ｿｽE・ｽE・ｽEestructure・ｽE・ｽE
- 閾ｪ蜍包ｿｽE繝ｼ繧ｸ・ｽE・ｽEerge・ｽE・ｽE

讒矩繝・・ｽE繧ｿ縺ｯ **縲瑚ｪｭ縺ｿ蜿悶ｋ縺縺代・* 縺ｧ縺ゅｊ縲・ 
隕冶ｦ壼喧縺ｮ縺溘ａ縺ｮ隗｣驥茨ｿｽE縺励※繧ゅ∵ｧ矩閾ｪ菴難ｿｽE螟峨∴縺ｪ縺・・ｽ・ｽE

### 2.4.1 荳榊､会ｼ・mmutable・ｽE・ｽ・ｽE邯ｭ謖・

- Core 縺ｫ繝ｭ繝ｼ繝峨＠縺滓ｧ矩繝・・ｽE繧ｿ縺ｯ縲‥eep-freeze 縺ｫ繧医ｊ荳榊､峨→縺吶ｋ縲・
- 驕ｸ謚橸ｿｽEhover繝ｻcamera繝ｻ繝輔ぅ繝ｫ繧ｿ繝ｻ蜀咲函迥ｶ諷九↑縺ｩ縺ｮ螟牙喧縺ｯ  
  縺吶∋縺ｦ `uiState` 縺ｫ縺ｮ縺ｿ蜿肴丐縺輔ｌ繧九・
- three.js 縺ｮ繧ｪ繝悶ず繧ｧ繧ｯ繝茨ｼ・THREE.Object3D`・ｽE・ｽ縺ｫ蜈・JSON 繧堤峩謗･縺ｶ繧我ｸ九￡繧九↑縺ｩ縲・ 
  讒矩繝・・ｽE繧ｿ縺ｸ縺ｮ譖ｸ縺崎ｾｼ縺ｿ邨瑚ｷｯ縺檎函縺倥ｋ險ｭ險茨ｿｽE遖∵ｭ｢縺ｨ縺吶ｋ縲・

### 2.4.2 陦ｨ遉ｺ蛻ｶ蠕｡縺ｮ縺溘ａ縺ｮ隗｣驥茨ｿｽE險ｱ蜿ｯ縺輔ｌ繧・

陦ｨ遉ｺ蛻ｶ蠕｡縺ｮ縺溘ａ縺ｮ **縲瑚ｧ｣驥医・* 縺ｯ險ｱ蜿ｯ縺輔ｌ繧九ゆｾ具ｼ・

- `frame.current` 縺ｫ蠢懊§縺溯ｦ∫ｴ縺ｮ陦ｨ遉ｺ繝ｻ髱櫁｡ｨ遉ｺ
- `appearance.*` 縺ｮ謠冗判譁ｹ蠑丞渚譏・ｽE・ｽ濶ｲ繝ｻ螟ｪ縺包ｿｽE騾擾ｿｽE蠎ｦ縺ｪ縺ｩ・ｽE・ｽE
- `marker.shape` 縺ｫ蠢懊§縺・geometry 逕滂ｿｽE
- `aux.module` 縺ｮ遞ｮ鬘槭↓蠢懊§縺溯｡ｨ遉ｺ・ｽE・ｽErid / axis / label 縺ｪ縺ｩ・ｽE・ｽE

縺薙ｌ繧会ｿｽE **陦ｨ遉ｺ繝ｭ繧ｸ繝・・ｽ・ｽ** 縺ｧ縺ゅｊ縲∵ｧ矩繝・・ｽE繧ｿ縺ｮ螟画峩縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE 
viewer 縺ｯ `appearance.visible` 縺ｪ縺ｩ繧貞盾辣ｧ縺励※繧ゅ∝､繧呈嶌縺肴鋤縺医◆繧贋ｸ頑嶌縺阪＠縺溘ｊ縺励↑縺・・ｽ・ｽE

### 2.4.3 marker.text 縺ｮ viewer 隗｣驥井ｻ墓ｧ・
viewer 縺ｯ `points.appearance.marker.text` 繧・**蜚ｯ荳縺ｮ隗｣驥亥ｱ､**・・abelIndex・峨〒豁｣隕丞喧縺励ヽenderer 縺ｯ縺昴・邨先棡縺縺代ｒ蜿ら・縺励※謠冗判縺吶ｋ縲・ 
莉･荳九・隕丞援縺ｯ viewer 蜀・〒蝗ｺ螳壹→縺励｝ublic / dist 縺ｪ縺ｩ縺ｮ繝溘Λ繝ｼ縺ｫ縺ｯ驥崎､・ｮ夂ｾｩ繧堤ｽｮ縺九↑縺・・
- `content`・夐撼遨ｺ譁・ｭ怜・縺ｪ繧画怙蜆ｪ蜈医〒菴ｿ逕ｨ縲らｩｺ縺ｪ繧・`signification.name` 繧定ｨ隱樣・ｼ・document_meta.i18n` 竊・`ja` 竊・`en` 竊・譛蛻昴・譁・ｭ怜・繧ｭ繝ｼ・峨〒繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺吶ｋ縲・ 
  荳｡譁ｹ遨ｺ縺ｪ繧峨Λ繝吶Ν閾ｪ菴薙ｒ逕滓・縺励↑縺・・- `size`・・*world 蜊倅ｽ阪・隲也炊繧ｵ繧､繧ｺ**縲ＡlabelConfig.baseLabelSize=8` 繧貞渕貅悶↓ world 鬮倥＆縺ｸ螟画鋤縺吶ｋ縲・ 
  `number` 莉･螟悶√∪縺溘・ 0 莉･荳九・ `8` 縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縲・- `plane`・啻xy` / `yz` / `zx` / `billboard`縲・ 
  `billboard` 縺ｯ繧ｫ繝｡繝ｩ豁｣髱｢蝗ｺ螳壹～xy` 縺ｯ +Z 豁｣髱｢縲～yz` 縺ｯ +X 豁｣髱｢縲～zx` 縺ｯ +Y 豁｣髱｢繧貞髄縺上・ 
  辟｡蜉ｹ蛟､縺ｯ `zx` 縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縲・- `align`・啻left/center/right` ﾃ・`top/middle/baseline` 繧・`left top` 縺ｮ蠖｢蠑上〒謖・ｮ壹☆繧九・ 
  蝓ｺ貅也せ・・oint 蠎ｧ讓呻ｼ峨↓蟇ｾ縺吶ｋ繧｢繝ｳ繧ｫ繝ｼ菴咲ｽｮ縺ｧ縺ゅｊ縲～baseline` 縺ｯ **譁・ｭ鈴伜沺縺ｮ荳狗ｫｯ**縺ｨ縺励※謇ｱ縺・・ 
  辟｡蜉ｹ蛟､縺ｯ `center middle` 縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縲・- `font`・啻string` 繧貞女縺台ｻ倥￠繧九・ 
  - `helvetiker_regular` 縺ｾ縺溘・遨ｺ譁・ｭ励・ viewer 縺ｮ譌｢螳壹ヵ繧ｩ繝ｳ繝医↓繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縲・ 
  - 縺昴ｌ莉･螟悶・ **CSS font-family 譁・ｭ怜・**縺ｨ縺励※謇ｱ縺・・ 
  - 蜈磯ｭ縺ｫ `italic/oblique/normal` 繧・`100..900/bold` 縺ｪ縺ｩ縺ｮ繝医・繧ｯ繝ｳ縺悟性縺ｾ繧後ｋ蝣ｴ蜷医・ style / weight 縺ｨ縺励※隗｣驥医＠縲∵ｮ九ｊ繧・family 縺ｨ縺吶ｋ縲・

## 2.5 frame / frames 縺ｮ謇ｱ縺・

3DSS 蛛ｴ縺ｮ `frames` 縺ｨ viewer 蛛ｴ縺ｮ `frame.current` 縺ｮ髢｢菫ゑｿｽE谺｡縺ｮ騾壹ｊ縺ｨ縺吶ｋ・ｽE・ｽE

- `uiState.frame.current === null`
  竊・frames 繧堤┌隕悶＠縺ｦ蜿ｯ隕門愛螳壹☆繧具ｼ・rame 繝輔ぅ繝ｫ繧ｿ OFF・ｽE・ｽE

- `uiState.frame.current === n`
  竊・隕∫ｴ縺ｮ `appearance.frames` 縺・
    - number 縺ｮ蝣ｴ蜷茨ｼ嗜 縺ｨ荳閾ｴ縺吶ｋ譎ゅ□縺大庄隕・
    - number[] 縺ｮ蝣ｴ蜷茨ｼ嗜 繧貞性繧譎ゅ□縺大庄隕厄ｼ育ｩｺ驟搾ｿｽE縺ｯ蟶ｸ縺ｫ荳榊庄隕厄ｼ・

- `appearance.frames` 譛ｪ螳夂ｾｩ
  竊・蜈ｨ繝輔Ξ繝ｼ繝縺ｧ蜿ｯ隕厄ｼ・rame.current 縺ｫ萓晏ｭ倥＠縺ｪ縺・・ｽ・ｽE

frameRange `{min,max}` 縺ｯ `detectFrameRange(document)` 縺ｧ邂暦ｿｽE縺励・
frames 縺・1 莉ｶ繧ら┌縺・・ｽ・ｽ蜷茨ｿｽE `range=null` 縺ｨ縺吶ｋ縲・


## 2.6 蜿ゑｿｽE謨ｴ蜷茨ｼ・ef 竊・uuid・ｽE・ｽE

`ref 竊・uuid` 縺ｮ謨ｴ蜷茨ｿｽE **隱ｭ霎ｼ譎ゑｿｽE Validator 縺御ｿ晁ｨｼ** 縺吶ｋ縲・

莉｣陦ｨ萓具ｼ・

- `line.end_a.ref` 竊・`points[*].uuid`
- `line.end_b.ref` 竊・`points[*].uuid`
- 縺晢ｿｽE莉悶・DSS 莉墓ｧ俶嶌縺ｧ螳夂ｾｩ縺輔ｌ縺ｦ縺・・ｽ・ｽ蜈ｨ縺ｦ縺ｮ蜿ゑｿｽE

荳肴紛蜷医′縺ゅｋ蝣ｴ蜷茨ｼ・

- viewer 縺ｯ隱ｭ霎ｼ閾ｪ菴薙ｒ螟ｱ謨励＆縺帙ｋ・ｽE・ｽ萓句､也匱逕滂ｿｽE繧ｨ繝ｩ繝ｼ繝｡繝・・ｽ・ｽ繝ｼ繧ｸ陦ｨ遉ｺ・ｽE・ｽ縲・
- 蜀・・ｽ・ｽ縺ｧ縲後〒縺阪ｋ遽・・ｽ・ｽ縺縺第緒逕ｻ縺吶ｋ縲阪→縺・・ｽ・ｽ縺滓嫌蜍包ｿｽE陦後ｏ縺ｪ縺・ 
  ・ｽE・ｽEartial rendering / best-effort 謠冗判縺ｯ縺励↑縺・・ｽ・ｽ縲・

runtime 蜀・・ｽ・ｽ縺ｮ蜀阪メ繧ｧ繝・・ｽ・ｽ縺ｯ荳崎ｦ√〒縺ゅｊ縲・ 
諤ｧ閭ｽ髱｢繧貞━蜈医＠縺ｦ **validation 縺ｫ荳莉ｻ** 縺吶ｋ縲・


## 2.7 隱ｭ霎ｼ遖∵ｭ｢繝ｻ髱槫ｯｾ雎｡繝・・ｽE繧ｿ

viewer 縺ｯ莉･荳九ｒ讒矩繝・・ｽE繧ｿ縺ｨ縺励※謇ｱ繧上↑縺・・ｽ・ｽE

- UI 迥ｶ諷具ｼ医き繝｡繝ｩ繝ｻ驕ｸ謚樒憾諷九↑縺ｩ・ｽE・ｽE
- 繧ｳ繝｡繝ｳ繝医ヵ繧｣繝ｼ繝ｫ繝会ｼ・uthoring 逕ｨ縺ｮ free text・ｽE・ｽE
- 豕ｨ驥茨ｿｽE繝｡繝｢繝ｻ繝ｬ繝晢ｿｽE繝茨ｼ域ｧ矩螟厄ｿｽE narrative・ｽE・ｽE
- modeler 縺ｮ蜀・・ｽ・ｽ諠・・ｽ・ｽ・ｽE・ｽEndo stack 縺ｪ縺ｩ・ｽE・ｽE
- 螟夜Κ蝓九ａ霎ｼ縺ｿ glTF / 3D 繝｢繝・・ｽ・ｽ・ｽE・ｽ讒矩螻､縺ｨ縺ｯ蛻･繝ｬ繧､繝､・ｽE・ｽE
- viewer 迢ｬ閾ｪ蠖｢蠑擾ｿｽE JSON・ｽE・ｽ・ｽE蜉幢ｿｽE隱ｭ霎ｼ縺ｨ繧ゅ↓遖∵ｭ｢・ｽE・ｽE
- 3DSS-prep・ｽE・ｽEuthoring 逕ｨ繝溘ル繝槭Ν繧ｹ繧ｭ繝ｼ繝橸ｼ・

讒矩繝・・ｽE繧ｿ縺ｨ縺励※謇ｱ縺・・ｽE縺ｯ縲・ 
`/schemas/3DSS.schema.json` 縺ｫ貅匁侠縺励◆ 3DSS 縺ｮ縺ｿ縺ｨ縺吶ｋ縲・


## 2.8 繝・・ｽE繧ｿ讒矩縺ｫ髢｢縺吶ｋ遖∵ｭ｢莠矩・・ｽ・ｽEiewer・ｽE・ｽE

viewer 縺ｯ讒矩繝・・ｽE繧ｿ縺ｫ蟇ｾ縺励※縲∵ｬ｡繧定｡後ｏ縺ｪ縺・・ｽ・ｽE

1. 讒矩縺ｮ閾ｪ蜍穂ｿｮ蠕ｩ
   - 谺謳阪お繝・・ｽ・ｽ繧抵ｿｽE蜍戊｣懷ｮ後☆繧・
   - 蜿ゑｿｽE蛻・・ｽ・ｽ繧抵ｿｽE蜍輔〒蜑企勁縺吶ｋ
2. 證鈴ｻ呻ｿｽE default 莉倅ｸ・
   - 繧ｹ繧ｭ繝ｼ繝槭↓ `default` 縺後≠縺｣縺ｦ繧ゅ・ 
     runtime 蛛ｴ縺ｧ縺昴ｌ繧貞享謇九↓驕ｩ逕ｨ縺励※ JSON 繧呈嶌縺肴鋤縺医↑縺・・ｽ・ｽE
3. 繧ｭ繝ｼ蜷搾ｿｽE譖ｸ縺肴鋤縺・
   - `name_ja` / `name_en` 縺ｪ縺ｩ繧抵ｿｽE蜍・merge / rename 縺励↑縺・・ｽ・ｽE
4. 蠎ｧ讓呻ｿｽE荳ｸ繧・ｿｽE豁｣隕丞喧
   - 蟆乗焚轤ｹ譯∵焚縺ｮ荳ｸ繧・
   - 迚ｹ螳夊ｻｸ縺ｸ縺ｮ謚募ｽｱ
5. frame 諠・・ｽ・ｽ縺ｮ閾ｪ蜍慕函謌・
   - `frames` 譛ｪ螳夂ｾｩ隕∫ｴ縺ｸ縺ｮ閾ｪ蜍穂ｻ倅ｸ・
   - time-series 縺ｮ陬憺俣
6. 繧ｹ繧ｭ繝ｼ繝槫､夜・・ｽ・ｽ縺ｮ菫晄戟
   - `additionalProperties:false` 縺ｫ蜿阪☆繧玖ｿｽ蜉繧ｭ繝ｼ繧・ 
     縲御ｸ譌ｦ隱ｭ繧薙〒縺九ｉ謐ｨ縺ｦ繧九阪％縺ｨ繧り｡後ｏ縺ｪ縺・・ｽ・ｽEalidation 縺ｧ reject・ｽE・ｽ縲・
7. UI 迥ｶ諷具ｿｽE JSON 菫晏ｭ・
   - camera / selection / filters / runtime 繝輔Λ繧ｰ縺ｪ縺ｩ繧・ 
     `.3dss.json` 縺ｸ譖ｸ縺肴綾縺輔↑縺・・ｽ・ｽE
8. normalize / resolve / prune / reorder 縺ｮ螳溯｡・
   - JSON 縺ｮ key 鬆・・ｽ・ｽ螟画峩
   - 蜀鈴聞諠・・ｽ・ｽ縺ｮ蜑企勁
   - 蛻･繝輔か繝ｼ繝槭ャ繝医∈縺ｮ螟画鋤

viewer 縺ｯ讒矩繝・・ｽE繧ｿ繧・ 
**窶懈焔縺､縺九★縺ｮ縺ｾ縺ｾ謇ｱ縺・・ｽ・ｽ縺ｨ窶・* 縺悟宍蟇・・ｽ・ｽ莉墓ｧ倥→縺励※鄒ｩ蜍吶▼縺代ｉ繧後ｋ縲・


## 2.9 Runtime API 讎りｦ・・ｽ・ｽ譛蟆上そ繝・・ｽ・ｽ・ｽE・ｽE

viewer 縺ｯ modeler 縺九ｉ螳鯉ｿｽE縺ｫ迢ｬ遶九＠縺・read-only 繧｢繝励Μ縺ｧ縺ゅｋ縺後・ 
UI 繝擾ｿｽE繝阪せ繝ｻdev 逕ｨ繝・・ｽE繝ｫ繝ｻ蟆・・ｽ・ｽ縺ｮ modeler 縺九ｉ縺ｮ蜀榊茜逕ｨ繧呈Φ螳壹＠縲・ 
螟夜Κ蜷代￠縺ｫ螳牙ｮ壹＠縺ｦ謠蝉ｾ帙☆繧・**runtime API 縺ｮ譛蟆上そ繝・・ｽ・ｽ** 繧貞ｮ夂ｾｩ縺吶ｋ縲・

隧ｳ邏ｰ縺ｪ API 莉墓ｧ假ｿｽE蛻･邏・`runtime_spec` 縺ｫ蟋費ｿｽE縲・ 
譛ｬ遽縺ｧ縺ｯ縲後お繝ｳ繝医Μ繝昴う繝ｳ繝医阪→縲悟､夜Κ縺九ｉ隕九∴繧・hub 縺ｮ鬪ｨ譬ｼ縲阪□縺代ｒ遉ｺ縺吶・

### 2.9.1 繧ｨ繝ｳ繝医Μ API

- `bootstrapViewer(canvasOrId, threeDSS, options?) 竊・hub`
  - validate3DSS 繧貞ｸｸ縺ｫ螳溯｡後＠縲∝ｿ・・ｽ・ｽ縺ｪ繧・validateRefIntegrity 繧貞ｮ溯｡後☆繧九・

- `bootstrapViewerFromUrl(canvasOrId, url, options?) 竊・Promise<hub>`
  - fetch 竊・json 竊・bootstrapViewer 縺ｫ貂｡縺吶・
  - strictValidate 縺ｮ default 縺ｯ true縲・

options・ｽE・ｽE
- `devBootLog?: boolean`
- `logger?: (line:string)=>void`
- `strictValidate?: boolean`
- `validateRefIntegrity?: boolean`

窶ｻ BOOT/MODEL 遲会ｿｽE繝ｭ繧ｰ縺ｫ莉倅ｸ弱☆繧・label 繧・modelUrl 繧呈戟縺溘○縺溘＞蝣ｴ蜷茨ｿｽE縲・
runtime_spec.viewer.yaml 蛛ｴ縺ｮ options 螳夂ｾｩ縺ｫ霑ｽ蜉縺励∽ｸ｡莉墓ｧ倥ｒ荳閾ｴ縺輔○繧九・


### 2.9.2 hub 縺ｮ螟門ｽ｢

`bootstrapViewer*` 縺ｮ謌ｻ繧雁､ `hub` 縺ｯ縲∝ｰ代↑縺上→繧よｬ｡縺ｮ繝励Ο繝代ユ繧｣繧呈戟縺､・ｽE・ｽE

- `hub.core` 窶ｦ runtime API 蜷榊燕遨ｺ髢難ｼ・rame / camera / selection / mode / micro / filters / runtime / uiState 遲会ｼ・
- `hub.start()` 窶ｦ requestAnimationFrame 繝ｫ繝ｼ繝鈴幕蟋・
- `hub.stop()` 窶ｦ 繝ｫ繝ｼ繝怜●豁｢
- `hub.pickObjectAt(ndcX, ndcY)` 窶ｦ 繝斐ャ繧ｭ繝ｳ繧ｰ・ｽE・ｽEI 縺九ｉ selectionController 縺ｸ縺ｮ讖区ｸ｡縺暦ｼ・

莉･髯搾ｿｽE遶・ｽE・ｽE.8 / 7.11 遲会ｼ峨♀繧茨ｿｽE `runtime_spec` 縺ｫ縺翫＞縺ｦ縲・ 
`hub.core` 莉･荳具ｿｽE蜷・・ｽ・ｽ繧ｽ繝・・ｽ・ｽ・ｽE・ｽEframe.get/set/step` / `camera.rotate/pan/zoom/reset` 縺ｪ縺ｩ・ｽE・ｽ繧・ 
隧ｳ邏ｰ縺ｫ螳夂ｾｩ縺吶ｋ縲・

譛ｬ遶縺ｮ遽・・ｽ・ｽ縺ｧ縺ｯ・ｽE・ｽE

- 縲梧ｧ矩繝・・ｽE繧ｿ縺ｯ 3DSS 縺ｫ螳鯉ｿｽE萓晏ｭ倥＠ read-only縲・ 
- 縲袈I 縺九ｉ讒矩縺ｸ縺ｯ蠢・・ｽ・ｽ `hub.core.*` 邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ縺吶ｋ縲・ 

縺ｨ縺・・ｽ・ｽ 2 轤ｹ繧剃ｻ墓ｧ倅ｸ奇ｿｽE邏・・ｽ・ｽ莠九→縺励※譏守､ｺ縺吶ｋ縺ｫ縺ｨ縺ｩ繧√ｋ縲・


---

# 3 UI讒具ｿｽE縺ｨ謫堺ｽ應ｽ鍋ｳｻ・ｽE・ｽEiewer・ｽE・ｽE

viewer 縺ｯ讒矩繝・・ｽE繧ｿ縺ｮ邱ｨ髮・・ｽ・ｽ荳蛻・・ｽ・ｽ繧上★縲・ 
**髢ｲ隕ｧ繝ｻ遒ｺ隱搾ｿｽE逅・・ｽ・ｽ** 縺ｮ縺溘ａ縺ｮ UI 讒矩縺縺代ｒ蛯吶∴繧九・

譛ｬ遶縺ｧ縺ｯ縲・・ｽ・ｽ隕ｧ蟆ら畑 UI 縺ｨ縺励※蠢・・ｽ・ｽ縺ｪ讖滂ｿｽE繝ｻ繝ｬ繧､繧｢繧ｦ繝茨ｿｽE謫堺ｽ應ｽ鍋ｳｻ繧貞ｮ夂ｾｩ縺励・ 
邱ｨ髮・UI 繧・・ｽ・ｽ蟄・UI 縺悟ｭ伜惠縺励↑縺・・ｽ・ｽ縺ｨ繧抵ｿｽE遒ｺ縺ｫ縺吶ｋ縲・

viewer UI 縺ｯ modeler UI 縺ｨ蛻･邉ｻ邨ｱ縺ｧ縺ゅｊ縲∫ｷｨ髮・・ｽ・ｽ蠖吶ｒ蜷ｫ縺ｾ縺ｪ縺・・ｽ・ｽE


## 3.1 UI 蜈ｨ菴薙Ξ繧､繧｢繧ｦ繝・

viewer_dev・ｽE・ｽ髢狗匱逕ｨ viewer・ｽE・ｽ・ｽE讓呎ｺ悶Ξ繧､繧｢繧ｦ繝茨ｿｽE谺｡縺ｮ莠鯉ｿｽE蜑ｲ讒具ｿｽE縺ｨ縺吶ｋ・ｽE・ｽE

```text
笏娯楳笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏・
笏・      繝｡繧､繝ｳ繝薙Η繝ｼ・ｽE・ｽED繝励Ξ繝薙Η繝ｼ・ｽE・ｽE      笏・
笏懌楳笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏ｬ笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏､
笏・    諠・・ｽ・ｽ繝代ロ繝ｫ     笏・ 陦ｨ遉ｺ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝代ロ繝ｫ  笏・
笏披楳笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏ｴ笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏・
```

- 荳頑ｮｵ・ｽE・ｽthree.js 縺ｫ繧医ｋ 3D 繝｡繧､繝ｳ繝薙Η繝ｼ・ｽE・ｽEanvas・ｽE・ｽE
- 蟾ｦ荳具ｼ壹Γ繧ｿ諠・・ｽ・ｽ繝ｻ繝ｭ繧ｰ繧定｡ｨ遉ｺ縺吶ｋ縲梧ュ蝣ｱ繝代ロ繝ｫ縲・
- 蜿ｳ荳具ｼ喃rame / filter / mode / gizmo 縺ｪ縺ｩ縺ｮ縲瑚｡ｨ遉ｺ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝代ロ繝ｫ縲・

譛ｬ繝ｬ繧､繧｢繧ｦ繝茨ｿｽE dev viewer・ｽE・ｽEviewer_dev.html`・ｽE・ｽ・ｽE讓呎ｺ悶→縺励・ 
譛ｬ逡ｪ蝓九ａ霎ｼ縺ｿ viewer 縺ｧ縺ｯ縲・ｿｽE繧ｹ繝茨ｿｽE UI 驛ｽ蜷医↓蜷医ｏ縺帙※蜀肴ｧ具ｿｽE縺励※繧医＞縲・

### 3.1.1 PC 蜷代￠ dev viewer 繝ｬ繧､繧｢繧ｦ繝郁ｦ∽ｻｶ

PC 蜷代￠縺ｮ dev viewer 縺ｧ縺ｯ縲∝ｰ代↑縺上→繧よｬ｡繧呈ｺ縺溘☆・ｽE・ｽE

- 繝｡繧､繝ｳ繝薙Η繝ｼ
  - 3D 繧ｭ繝｣繝ｳ繝舌せ・ｽE・ｽE<canvas id="viewer-canvas">`・ｽE・ｽ繧・1 譫壽戟縺､縲・
  - pointerInput・ｽE・ｽ・ｽE繧ｦ繧ｹ / 繧ｿ繝・・ｽ・ｽ・ｽE・ｽ繧偵く繝｣繝ｳ繝舌せ縺ｫ縺縺托ｿｽE繧我ｸ九￡繧九・
- 諠・・ｽ・ｽ繝代ロ繝ｫ・ｽE・ｽ蟾ｦ荳具ｼ・
  - File 諠・・ｽ・ｽ・ｽE・ｽ繧ｽ繝ｼ繧ｹ繝代せ / frame range / current frame・ｽE・ｽE
  - Model 繝ｭ繧ｰ・ｽE・ｽEevBootLog 繧貞性繧・ｽE・ｽ繧偵せ繧ｯ繝ｭ繝ｼ繝ｫ鬆伜沺縺ｨ縺励※陦ｨ遉ｺ縲・
- 陦ｨ遉ｺ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝代ロ繝ｫ・ｽE・ｽ蜿ｳ荳具ｼ・
  - frame 繧ｹ繝ｩ繧､繝縺ｨ蜀咲函繝懊ち繝ｳ鄒､
  - points / lines / aux 縺ｮ陦ｨ遉ｺ繝輔ぅ繝ｫ繧ｿ
  - mode HUD・ｽE・ｽEacro / meso / micro・ｽE・ｽ縺ｨ focus 陦ｨ遉ｺ
  - 霆ｸ繧ｮ繧ｺ繝｢縺ｮ DOM 繝ｩ繝・・ｽ・ｽ・ｽE・ｽ蟾ｦ荳・canvas 荳翫↓驥搾ｿｽE縺ｦ繧ゅｈ縺・・ｽ・ｽE

### 3.1.2 譛ｬ逡ｪ viewer 譛蟆剰ｦ∽ｻｶ

譛ｬ逡ｪ viewer・ｽE・ｽEstro 蝓九ａ霎ｼ縺ｿ縺ｪ縺ｩ・ｽE・ｽ縺ｧ縺ｯ縲∵ｬ｡縺縺代ｒ譛菴朱剞縺ｨ縺吶ｋ・ｽE・ｽE

- 繝｡繧､繝ｳ繝薙Η繝ｼ・ｽE・ｽED canvas・ｽE・ｽE
- frame 蛻・・ｽ・ｽ UI・ｽE・ｽ繧ｹ繝ｩ繧､繝 or +/- 繝懊ち繝ｳ or 繧ｭ繝ｼ繝懶ｿｽE繝会ｼ・
- layer 蛻・・ｽ・ｽ UI・ｽE・ｽEoints / lines / aux 縺ｮ ON/OFF・ｽE・ｽE
- 驕ｸ謚樔ｸｭ隕∫ｴ縺ｮ隴伜挨縺後〒縺阪ｋ陦ｨ遉ｺ・ｽE・ｽ萓具ｼ啅UID / name 縺ｮ縺ｩ縺｡繧峨°・ｽE・ｽE

dev 逕ｨ HUD / 繝ｭ繧ｰ繝代ロ繝ｫ / 隧ｳ邏ｰ縺ｪ繝｡繧ｿ諠・・ｽ・ｽ陦ｨ遉ｺ縺ｯ縲・ 
譛ｬ逡ｪ viewer 縺ｧ縺ｯ莉ｻ諢上→縺吶ｋ縲・


## 3.2 繝｡繧､繝ｳ繝薙Η繝ｼ縺ｨ HUD

### 3.2.1 繝｡繧､繝ｳ繝薙Η繝ｼ・ｽE・ｽED 繝励Ξ繝薙Η繝ｼ・ｽE・ｽE

繝｡繧､繝ｳ繝薙Η繝ｼ縺ｮ雋ｬ蜍呻ｼ・

- three.js 縺ｫ繧医ｋ 3D 謠冗判・ｽE・ｽEenderer 螻､縺ｮ canvas・ｽE・ｽE
- 繧ｫ繝｡繝ｩ謫堺ｽ懶ｼ・rbit / pan / zoom・ｽE・ｽ・ｽE隕冶ｦ夂噪繝輔ぅ繝ｼ繝峨ヰ繝・・ｽ・ｽ
- 驕ｸ謚櫁ｦ∫ｴ縺ｮ繝上う繝ｩ繧､繝郁｡ｨ遉ｺ・ｽE・ｽEelection + microFX 縺ｮ邨先棡・ｽE・ｽE
- frame / filters 縺ｫ繧医ｋ陦ｨ遉ｺ蛻・・ｽ・ｽ縺ｮ邨先棡繧貞渚譏

蛻ｶ邏・・ｽ・ｽE

- 繝｡繧､繝ｳ繝薙Η繝ｼ縺ｯ讒矩繝・・ｽE繧ｿ繧堤ｷｨ髮・・ｽ・ｽ縺ｪ縺・・ｽ・ｽE
- UI 繧､繝吶Φ繝・竊・camera/frame/selection/mode 縺ｸ縺ｮ蜿肴丐縺ｯ  
  **縺吶∋縺ｦ PointerInput / KeyboardInput 竊・hub.core.* 邨檎罰** 縺ｨ縺吶ｋ縲・

### 3.2.2 HUD・ｽE・ｽ繝医・繧ｹ繝・/ mode 繝斐Ν / focus 繝ｩ繝吶Ν・ｽE・ｽE

dev viewer 縺ｧ縺ｯ縲√Γ繧､繝ｳ繝薙Η繝ｼ荳翫↓谺｡縺ｮ HUD 繧帝㍾縺ｭ繧具ｼ・

- 繝茨ｿｽE繧ｹ繝医Γ繝・・ｽ・ｽ繝ｼ繧ｸ・ｽE・ｽEviewerToast`・ｽE・ｽE
  - `showHudMessage(text, {duration, level})` 逕ｱ譚･縺ｮ邁｡譏馴夂衍縲・
  - 萓具ｼ啻"Viewer loaded"`, `"Camera: HOME"`, `"MACRO MODE"` 縺ｪ縺ｩ縲・
- mode 繝斐Ν
  - `MACRO / MESO / MICRO` 縺ｮ 3 縺､縺ｮ pill 繧定｡ｨ遉ｺ縲・
  - 迴ｾ蝨ｨ mode 縺ｫ蟇ｾ蠢懊☆繧・pill 縺縺・`mode-pill-active` 繧剃ｻ倅ｸ弱・
- focus 繝ｩ繝吶Ν
  - 迴ｾ蝨ｨ selection・ｽE・ｽEuiState.selection.uuid`・ｽE・ｽ繧定｡ｨ遉ｺ縲・
  - selection 縺後↑縺・・ｽ・ｽ蜷茨ｿｽE `"-"` 繧定｡ｨ遉ｺ縲・

HUD 縺ｯ dev viewer 蟆ら畑縺ｮ陬懷勧 UI 縺ｨ縺励・ 
譛ｬ逡ｪ viewer 縺ｧ縺ｯ莉ｻ諢乗ｩ滂ｿｽE縺ｨ縺吶ｋ縲・

### 3.2.3 霆ｸ繧ｮ繧ｺ繝｢・ｽE・ｽEizmo・ｽE・ｽE

- DOM 繝呻ｿｽE繧ｹ縺ｮ HUD 縺ｨ縺励※逕ｻ髱｢蟾ｦ荳九↓驥搾ｿｽE繧九・
- 蠖ｹ蜑ｲ・ｽE・ｽE
  - 迴ｾ蝨ｨ繧ｫ繝｡繝ｩ縺ｮ蜷代″繧堤､ｺ縺咏ｰ｡譏・3D axes 陦ｨ遉ｺ縲・
  - 繧ｯ繝ｪ繝・・ｽ・ｽ縺ｧ繧ｫ繝｡繝ｩ繧剃ｸｻ隕∬ｻｸ譁ｹ蜷托ｼ・X / +Y / +Z・ｽE・ｽ縺ｸ snap 縺吶ｋ縲・
  - HOME 繝懊ち繝ｳ縺ｧ繧ｫ繝｡繝ｩ蛻晄悄迥ｶ諷九∈謌ｻ縺吶・
- 螳溯｣・・ｽ・ｽE
  - `viewer/ui/gizmo.js`・ｽE・ｽEOM 謫堺ｽ懶ｼ峨→縺励》hree.js 縺ｮ scene 縺ｫ縺ｯ蜈･繧後↑縺・・ｽ・ｽE
  - 繧ｫ繝｡繝ｩ謫堺ｽ懶ｿｽE `viewerHub.core.camera.reset` / `.snapToAxis(axis)` 邨檎罰縺ｧ陦後≧縲・


## 3.3 諠・・ｽ・ｽ繝代ロ繝ｫ・ｽE・ｽEile / Model・ｽE・ｽE

諠・・ｽ・ｽ繝代ロ繝ｫ縺ｯ縲∽ｸｻ縺ｫ dev viewer 縺ｧ蛻ｩ逕ｨ縺吶ｋ **繝・・ｽ・ｽ繧ｹ繝茨ｿｽE繝ｼ繧ｹ縺ｮ繝｡繧ｿ陦ｨ遉ｺ鬆伜沺** 縺ｨ縺吶ｋ縲・

### 3.3.1 File 諠・・ｽ・ｽ繝代ロ繝ｫ

- 陦ｨ遉ｺ蜀・・ｽ・ｽ・ｽE・ｽ萓具ｼ会ｼ・
  - Source: `../3dss/sample/frame_aux_demo.3dss.json`
  - Frame range: `[min, max]`
  - Current frame: `n`
- 諠・・ｽ・ｽ貅撰ｼ・
  - `hub.core.frame.getRange()` / `hub.core.frame.getActive()`
  - `bootstrapViewerFromUrl` 縺ｫ貂｡縺励◆ `modelUrl`

### 3.3.2 Model 繝ｭ繧ｰ繝代ロ繝ｫ

- 蛻晄悄迥ｶ諷具ｼ・
  - `"Model"` 隕具ｿｽE縺励→縲～(logs will appear here)` 縺ｮ繝励Ξ繝ｼ繧ｹ繝帙Ν繝縲・
- devBootLog 繧呈怏蜉ｹ縺ｫ縺励◆蝣ｴ蜷茨ｼ・
  - 襍ｷ蜍墓凾縺ｫ蠢・・ｽ・ｽ谺｡縺ｮ 5 陦後′縺難ｿｽE繝代ロ繝ｫ縺ｫ荳ｦ縺ｶ・ｽE・ｽE

    ```text
    BOOT  <devLabel>
    MODEL <modelUrl or (unknown)>
    CAMERA {"position":[...],"target":[...],"fov":50}
    LAYERS points=on/off lines=on/off aux=on/off
    FRAME  frame_id=<n>
    ```

- 蜃ｺ蜉帷ｵ瑚ｷｯ・ｽE・ｽE
  - `bootstrapViewer` 繧ｪ繝励す繝ｧ繝ｳ `devBootLog: true` 譎ゅ・
  - `options.logger` 縺後≠繧鯉ｿｽE縺昴ｌ繧剃ｽｿ縺・・ｽ・ｽ辟｡縺代ｌ縺ｰ `console.log` 繧堤畑縺・・ｽ・ｽ縲・
  - viewer_dev 繝擾ｿｽE繝阪せ縺ｧ縺ｯ `logger: devLogger` 繧呈ｸ｡縺励・ 
    `devLogger` 縺・`appendModelLog` 繧帝壹§縺ｦ Model 繝代ロ繝ｫ縺ｸ霑ｽ險倥☆繧九・

devBootLog 縺ｮ隧ｳ邏ｰ莉墓ｧ假ｿｽE 1.8 遽繧呈ｭ｣縺ｨ縺吶ｋ縲・


## 3.4 陦ｨ遉ｺ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝代ロ繝ｫ

陦ｨ遉ｺ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ繝代ロ繝ｫ縺ｯ縲」iewer 縺ｮ **迥ｶ諷九ｒ螟厄ｿｽE縺九ｉ謫堺ｽ懊☆繧句髪荳縺ｮ UI 髮・・ｽ・ｽE* 縺ｧ縺ゅｋ縲・ 
縺溘□縺玲悽逡ｪ viewer 縺ｧ縺ｯ縲・・ｽE鄂ｮ繧・・ｽ・ｽ縺溽岼縺ｯ繝帙せ繝医↓莉ｻ縺帙・ 
API 蜻ｼ縺ｳ蜃ｺ縺暦ｼ・ub.core.*・ｽE・ｽ縺縺代ｒ莉墓ｧ倥→縺励※蝗ｺ螳壹☆繧九・

### 3.4.1 Frame 繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ

dev viewer 縺ｮ frame UI 縺ｯ谺｡縺ｮ讒具ｿｽE縺ｨ縺吶ｋ・ｽE・ｽE

- 繧ｹ繝ｩ繧､繝・ｽE・ｽE#frame-slider`・ｽE・ｽE
  - `input` 繧､繝吶Φ繝医〒 `hub.core.frame.setActive(newValue)` 繧貞他縺ｶ縲・

- 繝ｩ繝吶Ν・ｽE・ｽE#frame-slider-label`・ｽE・ｽE
  - `hub.core.frame.getActive()` 繧定｡ｨ遉ｺ縺吶ｋ縲・

- 繝懊ち繝ｳ鄒､
  - `btn-rew` 窶ｦ `hub.core.frame.setActive(range.min)`
  - `btn-step-back` 窶ｦ `hub.core.frame.prev()`
  - `btn-home` 窶ｦ `hub.core.frame.setActive(range.min)`
  - `btn-step-forward` 窶ｦ `hub.core.frame.next()`
  - `btn-ff` 窶ｦ `hub.core.frame.setActive(range.max)`
  - `btn-play` 窶ｦ ・ｽE・ｽEev harness 蛛ｴ縺ｧ蜀咲函繝医げ繝ｫ・ｽE・ｽE


蜀咲函繝医げ繝ｫ縺ｯ dev viewer 蝗ｺ譛会ｿｽE螳溯｣・・ｽ・ｽ縺励・ 
蜀・・ｽ・ｽ逧・・ｽ・ｽ縺ｯ `setInterval` 遲峨〒 `next` 繧剃ｸ螳夐俣髫斐〒蜻ｼ縺ｳ蜃ｺ縺吶・ 
runtime 譛ｬ菴難ｿｽE莉墓ｧ倥→縺励※縺ｯ縲掲rame 蜀咲函 API縲阪′縺ｪ縺上※繧ゅｈ縺上・ 
螳溯｣・・ｽ・ｽ繧句ｴ蜷茨ｿｽE `hub.core.runtime.*` 縺ｨ縺励※蛻･騾泌ｮ夂ｾｩ縺吶ｋ縲・

frame UI 縺ｮ隕∽ｻｶ・ｽE・ｽE

- frame ID 螟画峩縺ｯ **蟶ｸ縺ｫ `hub.core.frame.*` 邨檎罰** 縺ｨ縺吶ｋ縲・
- UI 莉･螟厄ｼ・eyboardInput・ｽE・ｽ縺九ｉ・ｽE螟画峩縺ｯ縲～frameUiLoop` 縺ｫ繧医ｊ繧ｹ繝ｩ繧､繝繝ｻ繝ｩ繝吶Ν縺ｸ蜿肴丐縺吶ｋ縲・
- 繝槭え繧ｹ繝帙う繝ｼ繝ｫ縺ｯ v1 縺ｧ縺ｯ **Zoom 蟆ら畑** 縺ｨ縺励’rame 螟画峩縺ｫ縺ｯ菴ｿ繧上↑縺・・ｽ・ｽE

### 3.4.2 Layer 繝輔ぅ繝ｫ繧ｿ

points / lines / aux 縺ｮ陦ｨ遉ｺ蛻・・ｽ・ｽ UI 繧呈戟縺､縲・

- 繝懊ち繝ｳ・ｽE・ｽE
  - `#filter-points`
  - `#filter-lines`
  - `#filter-aux`
- 陦ｨ遉ｺ迥ｶ諷具ｼ・
  - `filter-on` / `filter-off` 繧ｯ繝ｩ繧ｹ縺ｨ邨ｵ譁・・ｽ・ｽ・芋汨・/ 刪・ｽE・ｽ縺ｧ陦ｨ迴ｾ縲・
- 繝ｭ繧ｸ繝・・ｽ・ｽ・ｽE・ｽE
  - 蜷・・ｽE繧ｿ繝ｳ縺ｯ `filters.setTypeEnabled(kind, enabled)` 繧貞他縺ｶ縲・
  - `filters.get()` 縺ｮ邨先棡縺九ｉ UI 迥ｶ諷九ｒ蜷梧悄縺吶ｋ縲・

蜀・・ｽ・ｽ縺ｧ縺ｯ・ｽE・ｽE

- `hub.core.filters.setTypeEnabled(kind, enabled)`  
  竊・`visibilityController.setTypeFilter` 縺・`uiState.filters.types.*` 縺ｨ `visibleSet` 繧呈峩譁ｰ縺吶ｋ縲・
- `hub.core.filters.get()`  
  竊・迴ｾ蝨ｨ縺ｮ `FiltersState` 繧定ｿ斐☆縲・

### 3.4.3 Mode / Focus 謫堺ｽ懶ｼ・acro / micro + meso optional・ｽE・ｽE

- mode 繝斐Ν・ｽE・ｽEUD・ｽE・ｽE
  - 陦ｨ遉ｺ縺ｮ縺ｿ繧貞渕譛ｬ縺ｨ縺吶ｋ・ｽE・ｽ繧ｯ繝ｪ繝・・ｽ・ｽ蛻・・ｽ・ｽ縺ｯ蠢・・ｽ・ｽ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽ縲・
  - host / dev harness 縺ｯ `hub.core.mode.getSupported()` 繧貞盾辣ｧ縺励・
    `meso === false` 縺ｮ蝣ｴ蜷茨ｿｽE MESO 陦ｨ遉ｺ繧抵ｿｽE縺輔↑縺・・ｽ・ｽ縺ｾ縺滂ｿｽE disabled 陦ｨ遉ｺ・ｽE・ｽ縲・

- focus 繝医げ繝ｫ繝懊ち繝ｳ・ｽE・ｽE#mode-focus-toggle`・ｽE・ｽE
  - 繧ｯ繝ｪ繝・・ｽ・ｽ譎ゑｼ・
    - 迴ｾ蝨ｨ selection 繧貞叙蠕暦ｼ・hub.core.selection.get()`・ｽE・ｽ縲・
    - `sel.uuid` 縺後≠繧鯉ｿｽE `hub.core.mode.set("micro", sel.uuid)` 繧貞他縺ｶ縲・
    - `set()` 縺・`false` 繧定ｿ斐＠縺溷ｴ蜷茨ｿｽE菴輔ｂ縺励↑縺・・ｽ・ｽ蠢・・ｽ・ｽ縺ｪ繧・HUD 繝茨ｿｽE繧ｹ繝医〒騾夂衍・ｽE・ｽ縲・

- MESO pill / 繝懊ち繝ｳ・ｽE・ｽEptional・ｽE・ｽE
  - `hub.core.mode.getSupported().meso === true` 縺ｮ縺ｨ縺搾ｿｽE縺ｿ UI 繧抵ｿｽE縺励※繧医＞縲・
  - 繧ｯ繝ｪ繝・・ｽ・ｽ譎ゑｼ・
    - selection 縺後≠繧鯉ｿｽE `hub.core.mode.set("meso", sel.uuid)` 繧貞他縺ｶ縲・
    - 縺溘□縺・v1 螳溯｣・・ｽ・ｽ縺ｯ meso 縺ｯ **macro 逶ｸ蠖難ｼ・icroFX 辟｡縺暦ｼ・* 縺ｨ縺励※謇ｱ縺｣縺ｦ繧医￥縲・
      隕九◆逶ｮ縺ｮ蟾ｮ蛻・・ｽ・ｽ辟｡縺上※繧ゆｻ墓ｧ倬＆蜿阪〒縺ｯ縺ｪ縺・・ｽ・ｽE
  - `meso === false` 縺ｮ迺ｰ蠅・・ｽ・ｽ縺ｯ `set("meso", ...)` 縺ｯ `false` 繧定ｿ斐＠縲∫憾諷具ｿｽE螟峨∴縺ｪ縺・・ｽ・ｽE

mode 縺ｨ microFX 縺ｮ隧ｳ邏ｰ繝ｫ繝ｼ繝ｫ縺ｯ 6.8 遽繝ｻruntime_spec 繧呈ｭ｣縺ｨ縺励・
譛ｬ遽縺ｯ縲袈I 縺九ｉ蜻ｼ縺ｶ API 繝代ち繝ｼ繝ｳ縲阪→縲稽eso optional縲搾ｿｽE譚｡莉ｶ縺縺代ｒ螳夂ｾｩ縺吶ｋ縲・

## 3.5 蜈･蜉帶桃菴懶ｼ・ointerInput / KeyboardInput・ｽE・ｽE

蜈･蜉帶桃菴懶ｿｽE runtime 螻､縺ｧ縺ｯ縺ｪ縺・**UI 繝ｬ繧､繝､・ｽE・ｽEiewer/ui/*・ｽE・ｽE* 縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧九・

- PointerInput / KeyboardInput 縺ｯ Host / dev harness 蛛ｴ縺ｧ `new` 縺励…anvas / window 縺ｫ繧､繝吶Φ繝医ｒ謗･邯壹☆繧九・
- runtime 螻､・ｽE・ｽEuntime/*・ｽE・ｽ縺九ａEPointerInput / KeyboardInput 繧・import / new 縺吶ｋ縺薙→縺ｯ遖∵ｭ｢縺吶ｋ縲・
- 蜈･蜉帙う繝吶Φ繝茨ｿｽE蠢・・ｽ・ｽ `hub.core.*` / `hub.pickObjectAt` 縺ｫ繝槭ャ繝斐Φ繧ｰ縺励，ameraEngine 繧・three.js 繧堤峩謗･隗ｦ繧峨↑縺・・ｽ・ｽE


### 3.5.1 PointerInput・ｽE・ｽ・ｽE繧ｦ繧ｹ / 繧ｿ繝・・ｽ・ｽ・ｽE・ｽE

PointerInput 縺ｮ雋ｬ蜍呻ｼ・

- 繧ｭ繝｣繝ｳ繝舌せ荳奇ｿｽE繝昴う繝ｳ繧ｿ謫堺ｽ懊ｒ荳謇九↓髮・・ｽ・ｽE・ｽ・ｽ繧九・
- camera / selection / mode 縺ｸ縺ｮ螟画峩縺ｯ **hub.core.* 邨檎罰** 縺ｧ陦後≧縲・
- renderer 繧・three.js 繧堤峩謗･隗ｦ繧峨↑縺・・ｽ・ｽE
驟咲ｽｮ・ｽE・ｽE
- `viewer/ui/pointerInput.js` 縺ｫ鄂ｮ縺擾ｼ・I 繝ｬ繧､繝､・ｽE・ｽ縲・
- runtime 縺九ｉ蜿ゑｿｽE縺励↑縺・・ｽ・ｽ謗･邯夲ｿｽE host・ｽE・ｽEiewerDevHarness 遲会ｼ峨′陦後≧縲・


v1 縺ｮ讓呎ｺ厄ｿｽE繝・・ｽ・ｽ繝ｳ繧ｰ・ｽE・ｽ・ｽE繧ｦ繧ｹ・ｽE・ｽ・・

- 蟾ｦ繝峨Λ繝・・ｽ・ｽ・ｽE・ｽorbit・ｽE・ｽ繧ｫ繝｡繝ｩ蝗櫁ｻ｢・ｽE・ｽE
- 蜿ｳ繝峨Λ繝・・ｽ・ｽ or 荳ｭ繝峨Λ繝・・ｽ・ｽ・ｽE・ｽpan・ｽE・ｽ繧ｫ繝｡繝ｩ蟷ｳ陦檎ｧｻ蜍包ｼ・
- 繝帙う繝ｼ繝ｫ・ｽE・ｽzoom・ｽE・ｽ蜑榊ｾ鯉ｼ・
- 繧ｯ繝ｪ繝・・ｽ・ｽ・ｽE・ｽE
  - click / pointerup 譎ゅ↓ canvas 蠎ｧ讓・竊・NDC 螟画鋤縺励・
  - `hub.pickObjectAt(ndcX, ndcY)` 繧貞他縺ｳ縲・
  - 繝偵ャ繝医＠縺・uuid 縺後≠繧鯉ｿｽE `hub.core.selection.select(uuid)` 繧貞他縺ｶ縲・
  - 縺晢ｿｽE邨先棡縲［ode / microFX 縺ｯ core 蛛ｴ縺ｧ蜀崎ｨ育ｮ励＆繧後ｋ縲・

豕ｨ諢擾ｼ・

- Frame 縺ｮ蠅玲ｸ帙ｒ繝槭え繧ｹ繝帙う繝ｼ繝ｫ縺ｫ蜑ｲ繧雁ｽ薙※繧九％縺ｨ縺ｯ遖∵ｭ｢・ｽE・ｽE.4.1 蜿ゑｿｽE・ｽE・ｽ縲・
- 繝｢繝ｼ繝会ｿｽE遘ｻ譚｡莉ｶ・ｽE・ｽEanEnter / exit 縺ｪ縺ｩ・ｽE・ｽ・ｽE core/modeController 縺ｮ雋ｬ蜍吶→縺励・ 
  PointerInput 縺ｯ縲慶lick 竊・select縲阪∪縺ｧ縺ｧ豁｢繧√ｋ縲・

### 3.5.2 KeyboardInput・ｽE・ｽ繧ｭ繝ｼ繝懶ｿｽE繝会ｼ・

KeyboardInput 縺ｮ雋ｬ蜍呻ｼ・
- `window` 縺ｮ `keydown` 繧・1 邂・・ｽ・ｽ縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧九・
- **core.camera / core.frame / core.mode / core.selection 縺ｮ縺ｿ** 繧貞娼縺上・
- UI 隕∫ｴ・ｽE・ｽEOM・ｽE・ｽ繧・CameraEngine 縺ｫ縺ｯ逶ｴ謗･隗ｦ繧後↑縺・・ｽ・ｽE
驟咲ｽｮ・ｽE・ｽE
- `viewer/ui/keyboardInput.js` 縺ｫ鄂ｮ縺擾ｼ・I 繝ｬ繧､繝､・ｽE・ｽ縲・
- runtime 縺九ｉ蜿ゑｿｽE縺励↑縺・・ｽ・ｽ謗･邯夲ｿｽE host・ｽE・ｽEiewerDevHarness 遲会ｼ峨′陦後≧縲・


繧ｭ繝ｼ蜈･蜉幢ｿｽE谺｡縺ｮ繝ｫ繝ｼ繝ｫ縺ｫ蠕薙≧・ｽE・ｽE

1. 蜈･蜉帶ｬ・・ｽ・ｽ螟・
   - `ev.target.tagName` 縺・`INPUT` / `TEXTAREA` 縺ｮ蝣ｴ蜷茨ｿｽE辟｡隕悶・

2. Home・ｽE・ｽ繧ｫ繝｡繝ｩ HOME・ｽE・ｽE
   - `ev.code === "Home"` 縺九▽ `core.camera.reset` 縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
     - `ev.preventDefault()`
     - `core.camera.reset()` 繧貞他縺ｶ縲・

3. Frame 謫堺ｽ懶ｼ・ageUp / PageDown・ｽE・ｽE
   - `core.frame` 縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
     - `PageUp` 窶ｦ `next`
     - `PageDown` 窶ｦ `prev`
   - frame 遽・・ｽ・ｽ螟悶∈縺ｯ FrameController 蛛ｴ縺ｧ繧ｯ繝ｩ繝ｳ繝励☆繧具ｼ・untime_spec 蜿ゑｿｽE・ｽE・ｽ縲・

4. Mode 蛻・・ｽ・ｽ・ｽE・ｽEsc・ｽE・ｽE
   - `Escape`・ｽE・ｽE
     - `mode.set("macro")`

5. 繧ｫ繝｡繝ｩ Zoom・ｽE・ｽE / -・ｽE・ｽE
   - `+` / `NumpadAdd`・ｽE・ｽE
     - `camera.zoom(-ﾎ・`・ｽE・ｽ蜑埼ｲ・ｽE・ｽE
   - `-` / `NumpadSubtract`・ｽE・ｽE
     - `camera.zoom(+ﾎ・`・ｽE・ｽ蠕碁・ｽE・ｽE
   - ﾎ費ｼ・OOM_STEP・ｽE・ｽ・ｽE螳溯｣・・ｽE縺ｮ螳壽焚・ｽE・ｽ萓具ｼ・.1・ｽE・ｽ縺ｨ縺吶ｋ縲・

6. 繧ｫ繝｡繝ｩ Orbit・ｽE・ｽ遏｢蜊ｰ繧ｭ繝ｼ・ｽE・ｽE
   - `ArrowLeft` 窶ｦ `camera.rotate(-step, 0)`
   - `ArrowRight` 窶ｦ `camera.rotate(+step, 0)`
   - `ArrowUp` 窶ｦ `camera.rotate(0, -step)`・ｽE・ｽ荳翫↓繝√Ν繝茨ｼ・
   - `ArrowDown` 窶ｦ `camera.rotate(0, +step)`・ｽE・ｽ荳九↓繝√Ν繝茨ｼ・
   - `Shift` 謚ｼ縺励〒 step 繧貞｢励ｄ縺励∵掠蝗槭＠縺ｨ縺吶ｋ・ｽE・ｽ萓具ｼ・ﾂｰ 竊・4ﾂｰ・ｽE・ｽ縲・

dev viewer 縺ｧ縺ｯ縲√％繧後↓蜉縺医※繝擾ｿｽE繝阪せ蛛ｴ縺ｧ谺｡繧定ｿｽ蜉縺励※繧医＞・ｽE・ｽE

- `Space`・ｽE・ｽE
  - 蜀咲函繝懊ち繝ｳ・ｽE・ｽE#btn-play`・ｽE・ｽ・ｽE click 繧剃ｻ｣逅・・ｽ・ｽ轣ｫ縺励’rame 蜀咲函繧偵ヨ繧ｰ繝ｫ縺吶ｋ縲・
  - 縺薙ｌ縺ｯ **viewer_dev 蟆ら畑繧ｷ繝ｧ繝ｼ繝医き繝・・ｽ・ｽ** 縺ｨ縺励〉untime 譛ｬ菴謎ｻ墓ｧ倥↓縺ｯ蜷ｫ繧√↑縺・・ｽ・ｽE


## 3.6 dev viewer 蝗ｺ譛会ｿｽE諡｡蠑ｵ

viewer_dev・ｽE・ｽ髢狗匱逕ｨ harness・ｽE・ｽ・ｽE縲∵悽逡ｪ viewer 縺ｫ蜷ｫ繧√↑縺・・ｽ・ｽ蜉ｩ讖滂ｿｽE繧呈戟縺､・ｽE・ｽE

- `window.hub` 窶ｦ `viewerHub` 縺ｸ縺ｮ繝・・ｽ・ｽ繝・・ｽ・ｽ逕ｨ蜿ゑｿｽE
- `window.viewerLog(line)` 窶ｦ Model 繝代ロ繝ｫ縺ｸ縺ｮ繝ｭ繧ｰ霑ｽ險・
- `window.viewerToast(text, options)` 窶ｦ HUD 繝茨ｿｽE繧ｹ繝郁｡ｨ遉ｺ
- 襍ｷ蜍墓凾 devBootLog
  - `BOOT / MODEL / CAMERA / LAYERS / FRAME` 縺ｮ 5 陦後ｒ Model 繝代ロ繝ｫ縺ｸ陦ｨ遉ｺ
- gizmo HOME / axis 繝懊ち繝ｳ
  - 繧ｫ繝｡繝ｩ謫堺ｽ懊さ繝槭Φ繝会ｿｽE繧ｷ繝ｧ繝ｼ繝医き繝・・ｽ・ｽ・ｽE・ｽEeset / snapToAxis・ｽE・ｽE

縺薙ｌ繧会ｿｽE **縲碁幕逋ｺ謾ｯ謠ｴ讖滂ｿｽE縲・* 縺ｨ縺励※謇ｱ縺・・ｽ・ｽE 
譛ｬ逡ｪ viewer 莉墓ｧ假ｼ域ｩ滂ｿｽE隕∽ｻｶ・ｽE・ｽ縺ｫ縺ｯ蜷ｫ繧√↑縺・・ｽ・ｽE 
縺溘□縺励∝ｰ・・ｽ・ｽ host 繧｢繝励Μ縺ｧ蜀榊茜逕ｨ縺励◆縺・・ｽ・ｽ蜷医↓蛯吶∴縲・ 
蜷榊燕繝ｻ雋ｬ蜍呻ｿｽE譛ｬ遶縺ｮ螳夂ｾｩ縺九ｉ螟ｧ縺阪￥螟悶ｌ縺ｪ縺・・ｽ・ｽ縺・・ｽ・ｽ縺吶ｋ縲・


---

# 4 荳画ｬ｡蜈・・ｽ・ｽ逕ｻ縺ｨ繧ｫ繝｡繝ｩ・ｽE・ｽEiewer・ｽE・ｽE

viewer 縺ｮ謠冗判繧ｷ繧ｹ繝・・ｽ・ｽ縺ｯ modeler 縺ｨ蜷後§ three.js 繧堤畑縺・・ｽ・ｽ縺後・ 
髢ｲ隕ｧ蟆ら畑繧｢繝励Μ縺ｨ縺励※ **騾擾ｿｽE諤ｧ繝ｻ蠢螳滓ｧ繝ｻ髱樒ｷｨ髮・・ｽ・ｽ** 繧呈怙蜆ｪ蜈医☆繧九・

譛ｬ遶縺ｧ縺ｯ縲〉enderer 螻､縺ｨ CameraEngine 繧剃ｸｭ蠢・・ｽ・ｽ縲・ 
荳画ｬ｡蜈・・ｽ・ｽ逕ｻ繝ｻvisibleSet繝ｻmicroFX繝ｻ繧ｫ繝｡繝ｩ謖吝虚縺ｮ隕冗ｯ・・ｽ・ｽ螳夂ｾｩ縺吶ｋ縲・

窶ｻ 蜈･蜉帙Ξ繧､繝､・ｽE・ｽEointerInput / KeyboardInput・ｽE・ｽ・ｽE 3 遶縲√♀繧茨ｿｽE `runtime_spec` 繧呈ｭ｣縺ｨ縺吶ｋ縲・ 
譛ｬ遶縺ｧ縺ｯ縲鯉ｿｽE蜉帶ｸ医∩縺ｮ迥ｶ諷九′ renderer 縺ｫ縺ｩ縺・・ｽ・ｽ譏縺輔ｌ繧九°縲阪ｒ謇ｱ縺・・ｽ・ｽE


## 4.1 謠冗判繝ｬ繧､繝､讒矩

viewer 縺ｮ謠冗判繝ｬ繧､繝､讒矩縺ｯ谺｡縺ｮ騾壹ｊ縺ｨ縺吶ｋ・ｽE・ｽE

- Core 螻､・ｽE・ｽEuntime/core・ｽE・ｽE
  - `uiState` / `CameraEngine` / `frameController`
  - `selectionController` / `modeController`
  - `visibilityController` / `microController`
  - 3DSS 讒矩・ｽE・ｽEmmutable・ｽE・ｽ縺ｨ蜷・・ｽ・ｽ index 繧剃ｿ晄戟
- Renderer 螻､・ｽE・ｽEuntime/renderer・ｽE・ｽE
  - `createRendererContext(canvas)` 縺・three.js 縺ｾ繧上ｊ繧剃ｸ謇九↓諡・・ｽ・ｽE
  - three.js 縺ｮ Scene / Camera / Renderer / light / Object3D 鄒､繧抵ｿｽE驛ｨ縺ｫ菫晄戟
  - microFX・ｽE・ｽExes / bounds / glow / marker / highlight・ｽE・ｽ繧貞性繧
- Hub 螻､・ｽE・ｽEuntime/viewerHub・ｽE・ｽE
  - `core` 縺ｨ `renderer` 繧偵∪縺ｨ繧√・ 
    豈弱ヵ繝ｬ繝ｼ繝 `uiState` 縺ｮ繧ｹ繝翫ャ繝励す繝ｧ繝・・ｽ・ｽ繧・renderer 縺ｫ豬√☆
  - `hub.start()` / `hub.stop()` 縺ｫ繧医ｋ render loop 繧貞腰荳邂・・ｽ・ｽ縺ｧ邂｡逅・

### 4.1.1 謇譛画ｨｩ縺ｨ遖∵ｭ｢莠矩・

- 3DSS document・ｽE・ｽ讒矩繝・・ｽE繧ｿ・ｽE・ｽE
  - Core 螻､縺・deep-freeze 貂医∩縺ｮ繧ｪ繝悶ず繧ｧ繧ｯ繝医→縺励※菫晄戟
  - Renderer 螻､縺ｯ **蜿ゑｿｽE縺ｮ縺ｿ** 險ｱ蜿ｯ縲∵嶌縺肴鋤縺育ｦ∵ｭ｢
- uiState / visibleSet / microState / cameraState
  - Core 螻､縺悟髪荳縺ｮ豁｣隕乗園譛芽・
  - Renderer 螻､縺ｯ hub 邨檎罰縺ｧ **隱ｭ縺ｿ蜿悶ｊ蟆ら畑** 縺ｨ縺励※蜿励￠蜿悶ｊ縲∝渚譏縺ｮ縺ｿ陦後≧
- three.js Object3D 鄒､
  - Renderer 螻､縺梧園譛・
  - Core / UI / hub 縺ｯ Object3D 繧堤峩謗･隗ｦ繧峨↑縺・・ｽ・ｽEUID 遲峨〒蜿ゑｿｽE縺吶ｋ縺ｮ縺ｿ・ｽE・ｽE

### 4.1.2 frame 竊・visibleSet 竊・renderer 縺ｮ豬√ｌ・ｽE・ｽ豁｣隕上Ν繝ｼ繝茨ｼ・

1. Core 縺ｮ frameController 縺・`uiState.frame.current` 繧呈峩譁ｰ縺吶ｋ縲・

2. Core 縺ｯ **蠢・・ｽ・ｽ** `core.recomputeVisibleSet()` 繧貞他縺ｶ縲・
   - 縺薙ｌ縺・visibleSet 蜀崎ｨ育ｮ暦ｿｽE **蜚ｯ荳縺ｮ蜈･蜿｣** 縺ｨ縺吶ｋ縲・
   - 蜀・・ｽ・ｽ縺ｧ frames / appearance.visible / filters・ｽE・ｽEoints/lines/aux・ｽE・ｽ繧貞粋・ｽE縺励・
     `uiState.visibleSet: Set<uuid>` 繧呈峩譁ｰ縺吶ｋ縲・

3. hub 縺ｮ 1 繝輔Ξ繝ｼ繝 tick 縺ｧ縲・
   - `renderer.applyFrame(uiState.visibleSet)`・ｽE・ｽ縺ｾ縺滂ｿｽE蜷檎ｭ陰PI・ｽE・ｽ縺悟他縺ｰ繧後・
   - 蜷・Object3D 縺ｮ `obj.visible` 縺・UUID 繝呻ｿｽE繧ｹ縺ｧ譖ｴ譁ｰ縺輔ｌ繧九・

Renderer 縺ｯ visibleSet 莉･螟厄ｿｽE譚｡莉ｶ縺ｧ base object 縺ｮ陦ｨ遉ｺ・ｽE・ｽ髱櫁｡ｨ遉ｺ繧貞享謇九↓豎ｺ繧√※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE
・ｽE・ｽEverlay / microFX 逕ｨ縺ｮ霑ｽ蜉 Object3D 縺ｯ縺難ｿｽE蛻ｶ邏・・ｽE蟇ｾ雎｡螟厄ｼ・


## 4.2 謠冗判蟇ｾ雎｡隕∫ｴ・ｽE・ｽEoints / lines / aux・ｽE・ｽE

### 4.2.1 Points

points 縺ｯ縲檎ｩｺ髢謎ｸ奇ｿｽE莉｣陦ｨ轤ｹ縲阪→縺励※謠冗判縺吶ｋ縲・

- 蜿ゑｿｽE蜈・・ｽ・ｽE
  - `points[*].position`
  - `points[*].appearance`・ｽE・ｽEolor / opacity / marker 縺ｪ縺ｩ・ｽE・ｽE
- 譛菴手ｦ∽ｻｶ・ｽE・ｽE
  - 蜷・point 縺ｫ縺､縺・1 縺､縺ｮ Object3D・ｽE・ｽ騾壼ｸｸ縺ｯ蟆上＆縺ｪ逅・or billboard・ｽE・ｽ繧堤函・ｽE縺吶ｋ縲・
  - color / opacity 縺ｯ appearance.* 縺ｮ蛟､繧偵◎縺ｮ縺ｾ縺ｾ蜿肴丐縺吶ｋ縲・
- 霑ｽ蜉陦ｨ迴ｾ・ｽE・ｽEptional・ｽE・ｽ・・
  - microFX 縺ｫ繧医ｋ glow / marker 縺ｮ荳贋ｹ励○
  - selection 縺ｫ繧医ｋ繝上う繝ｩ繧､繝茨ｼ郁牡・ｽE・ｽ螟ｪ縺包ｼ冗匱蜈会ｼ・

points 縺ｫ髢｢縺励※ viewer 縺ｯ **菴咲ｽｮ縺ｮ陬憺俣繧・・ｽ・ｽ繧√ｒ陦後ｏ縺ｪ縺・*縲・ 
position 繝吶け繝医Ν縺ｯ 3DSS JSON 縺ｮ蛟､繧偵◎縺ｮ縺ｾ縺ｾ world 蠎ｧ讓吶→縺励※逕ｨ縺・・ｽ・ｽ縲・

### 4.2.2 Lines

lines 縺ｯ縲継oints 蜷悟｣ｫ縺ｮ謗･邯夲ｼ茨ｿｽE繧ｯ繝医Ν・ｽE・ｽ縲阪→縺励※謠冗判縺吶ｋ縲・

- 蜿ゑｿｽE蜈・・ｽ・ｽE
  - `lines[*].end_a.ref` / `end_b.ref` 縺九ｉ point UUID 繧定ｧ｣豎ｺ
  - `lines[*].appearance.shape` / `arrow` / `effect` / `color` / `opacity` 縺ｪ縺ｩ
- 譛菴手ｦ∽ｻｶ・ｽE・ｽE
  - ref 縺ｯ strict validation 縺ｫ繧医ｊ謨ｴ蜷医′菫晁ｨｼ縺輔ｌ繧九・
  - Renderer 縺ｯ `end_a.ref` / `end_b.ref` 繧貞ｿ・・ｽ・ｽ隗｣豎ｺ縺ｧ縺阪ｋ蜑肴署縺ｧ謠冗判縺吶ｋ縲・
  - 繧ゅ＠隗｣豎ｺ縺ｧ縺阪↑縺・・ｽ・ｽ蜷医√◎繧鯉ｿｽE縲瑚ｪｭ霎ｼ諡貞凄縺輔ｌ繧九∋縺搾ｿｽE蜉帙阪∪縺滂ｿｽE縲悟ｮ溯｣・・ｽ・ｽ繧ｰ縲阪→縺励※謇ｱ縺・・ｽ・ｽE
  - 縲瑚ｧ｣豎ｺ縺ｧ縺阪◆蛻・・ｽ・ｽ縺第緒逕ｻ縺吶ｋ・ｽE・ｽEartial rendering・ｽE・ｽ縲搾ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽE
- 邂ｭ鬆ｭ・ｽE・ｽErrow・ｽE・ｽ・・
  - `arrow.shape` / `arrow.placement` 縺ｮ蛟､繧偵◎縺ｮ縺ｾ縺ｾ蜿肴丐縺吶ｋ縲・
  - 莉墓ｧ倥→縺励※縺ｯ 3DSS 縺ｮ螳夂ｾｩ繧呈ｭ｣縺ｨ縺励」iewer 蛛ｴ縺ｧ蜍晄焔縺ｫ陬懈ｭ｣繝ｻ諡｡蠑ｵ縺励↑縺・・ｽ・ｽE
- effect:
  - `effect: none | flow | glow | pulse` 縺ｯ **謠冗判髯仙ｮ夲ｿｽE隕冶ｦ壼柑譫・* 縺ｨ縺励※謇ｱ縺・・ｽ・ｽE
  - `none` 縺ｯ霑ｽ蜉縺ｮ隕冶ｦ壼柑譫懊↑縺励ｒ諢丞袖縺吶ｋ縲・

lineWidth 縺ｫ縺､縺・・ｽ・ｽ・ｽE・ｽE

- WebGL 螳溯｣・・ｽ・ｽ繧医ｊ 1px 莉･荳九ｄ蝗ｺ螳壼ｹ・・ｽ・ｽ縺ｪ繧狗腸蠅・・ｽ・ｽ蟄伜惠縺吶ｋ縲・
- viewer 縺ｯ蜀・・ｽ・ｽ縺ｫ `line_width_mode: auto | fixed | adaptive` 縺ｮ讎ょｿｵ繧呈戟縺｣縺ｦ繧医＞縺後・
  - v1 螳溯｣・・ｽ・ｽ縺ｯ **auto 蝗ｺ螳・* 縺ｨ縺励・
  - 莉悶Δ繝ｼ繝会ｿｽE縲悟ｰ・・ｽ・ｽ諡｡蠑ｵ蛟呵｣懊阪→縺励※譛ｬ莉墓ｧ倥↓谿九☆縺ｫ逡吶ａ繧九・

### 4.2.3 Aux

aux 縺ｯ points / lines 莉･螟厄ｿｽE陬懷勧逧・・ｽ・ｽ逕ｻ隕∫ｴ縺ｧ縺ゅｋ縲・

莉｣陦ｨ逧・・ｽ・ｽ module 縺ｨ v1 縺ｫ縺翫￠繧区桶縺・・ｽ・ｽ・・

| module 蜷・ | 繧ｹ繧ｭ繝ｼ繝・| Viewer v1 縺ｮ謇ｱ縺・      | 蛯呵・                                     |
|------------|---------|------------------------|-------------------------------------------|
| `grid`     | 縺ゅｊ    | 謠冗判蠢・・ｽ・ｽ・井ｿ晁ｨｼ・ｽE・ｽE      | ground 繧ｰ繝ｪ繝・・ｽ・ｽ縲ょ渕譛ｬ繝代Λ繝｡繝ｼ繧ｿ縺ｮ縺ｿ蟇ｾ蠢懊〒蜿ｯ縲・|
| `axis`     | 縺ゅｊ    | 謠冗判莉ｻ諢擾ｿｽE辟｡隕門庄       | 讒矩螻､縺ｮ霆ｸ縲・UD 縺ｮ gizmo axis 縺ｨ縺ｯ蛻･迚ｩ縲・  |
| `plate`    | 縺ゅｊ    | 謠冗判莉ｻ諢擾ｿｽE辟｡隕門庄       | 蠎奇ｿｽE繝ｬ繝ｼ繝茨ｼ剰レ譎ｯ譚ｿ縲Ｗ1 縺ｧ縺ｯ髱槫ｿ・・ｽ・ｽ縲・      |
| `shell`    | 縺ゅｊ    | 謠冗判莉ｻ諢擾ｿｽE辟｡隕門庄       | 螟也坩陦ｨ迴ｾ縲Ｗ1 縺ｧ縺ｯ髱槫ｿ・・ｽ・ｽ縲・                |
| `hud`      | 縺ゅｊ    | 謠冗判莉ｻ諢擾ｿｽE辟｡隕門庄       | 讒矩蛛ｴ HUD縲７iewer UI 縺ｧ莉｣譖ｿ縺吶ｋ諠ｳ螳壹・   |

v1 縺ｧ縺ｯ grid 莉･螟厄ｿｽE aux module 縺ｯ縲悟ｭ伜惠縺励※繧ら┌隕門庄縲阪→縺励・ 
蟆・・ｽ・ｽ蟇ｾ蠢懈凾縺ｫ縺ｮ縺ｿ譛ｬ陦ｨ繧呈峩譁ｰ縺吶ｋ縲・


## 4.3 frame・ｽE・ｽ譎る俣螻､・ｽE・ｽ縺ｨ陦ｨ遉ｺ蛻ｶ蠕｡

### 4.3.1 陦ｨ遉ｺ繝ｫ繝ｼ繝ｫ

`uiState.frame.current = n` 縺ｮ縺ｨ縺阪∬｡ｨ遉ｺ繝ｫ繝ｼ繝ｫ縺ｯ谺｡縺ｮ騾壹ｊ・ｽE・ｽE

- uiState.frame.current == n  
  竊・`frames` 縺ｫ n 繧貞性繧隕∫ｴ縺ｮ縺ｿ陦ｨ遉ｺ
- uiState.frame.current 縺・null  
  竊・`frames` 繧堤┌隕悶＠縺ｦ蜈ｨ隕∫ｴ繧定｡ｨ遉ｺ・ｽE・ｽErame 繝輔ぅ繝ｫ繧ｿ OFF・ｽE・ｽE
- frames 縺梧悴螳夂ｾｩ縺ｾ縺滂ｿｽE遨ｺ  
  竊・蟶ｸ譎り｡ｨ遉ｺ・ｽE・ｽEiState.frame.current 縺ｫ萓晏ｭ倥＠縺ｪ縺・・ｽ・ｽE
- frame 蛻・・ｽ・ｽ縺ｯ UI 迥ｶ諷具ｼ・iState.frame・ｽE・ｽ・ｽE譖ｴ譁ｰ縺ｮ縺ｿ縺ｧ陦後＞縲・ 
  讒矩繝・・ｽE繧ｿ・ｽE・ｽEDSS JSON・ｽE・ｽ・ｽE螟画峩縺励↑縺・・ｽ・ｽE

### 4.3.2 Core / Renderer 縺ｮ雋ｬ蜍呻ｿｽE髮｢

- Core・ｽE・ｽE
  - `frameController.set / step / range` 縺ｫ繧医ｊ `uiState.frame` 繧呈峩譁ｰ縺吶ｋ縲・
  - `visibilityController.recompute()` 縺ｧ `uiState.visibleSet` 繧抵ｿｽE險育ｮ励☆繧九・
- Renderer・ｽE・ｽE
  - `renderer.applyFrame(uiState.visibleSet)` 縺ｧ `obj.visible` 繧呈峩譁ｰ縺吶ｋ縲・
  - frame ID 繧・frames 驟搾ｿｽE繧堤峩謗･隱ｭ繧縺薙→縺ｯ遖∵ｭ｢縲・

frames 縺ｮ謗ｨ貂ｬ繝ｻ陬懷ｮ鯉ｿｽE陬懈ｭ｣縺ｯ陦後ｏ縺ｪ縺・・ｽ・ｽE 
3DSS 縺ｫ蜈･縺｣縺ｦ縺・・ｽ・ｽ frames 諠・・ｽ・ｽ縺ｮ縺ｿ繧呈ｭ｣縺ｨ縺吶ｋ縲・


## 4.4 microFX 繝ｬ繧､繝､縺ｨ selection / mode

microFX 縺ｯ縲瑚ｦ冶ｦ夊｣懷勧繝ｬ繧､繝､縲阪〒縺ゅｊ縲∵ｧ矩繝・・ｽE繧ｿ縺ｫ縺ｯ荳蛻・・ｽ・ｽ髻ｿ縺励↑縺・・ｽ・ｽE 
renderer 蜀・・ｽE `microFX/*` 繝｢繧ｸ繝･繝ｼ繝ｫ縺ｨ縺励※螳溯｣・・ｽ・ｽ繧後ｋ縲・

### 4.4.1 蜈･蜃ｺ蜉帙→ invariants

- 蜈･蜉幢ｼ・
  - `uiState.microState`・ｽE・ｽEicroFXPayload・ｽE・ｽE
  - `uiState.selection`
  - scene metrics・ｽE・ｽ荳ｭ蠢・・ｽE蜊雁ｾ・・ｽ・ｽ縺ｩ・ｽE・ｽE
- 蜃ｺ蜉幢ｼ・
  - 譌｢蟄・Object3D 縺ｮ color / opacity / scale 縺ｪ縺ｩ縺ｮ荳頑嶌縺・
  - 霑ｽ蜉縺ｮ overlay Object3D・ｽE・ｽExes / bounds / marker / glow / highlight・ｽE・ｽ鄒､
- 荳榊､画擅莉ｶ・ｽE・ｽE
  - 3DSS document 縺ｯ豎ｺ縺励※螟画峩縺励↑縺・・ｽ・ｽE
  - baseStyle・ｽE・ｽ・ｽE縺ｮ濶ｲ繝ｻ荳埼擾ｿｽE蠎ｦ・ｽE・ｽ・ｽE蠢・・ｽ・ｽ菫晄戟縺励［icroFX OFF 縺ｧ螳鯉ｿｽE蠕ｩ蜈・・ｽ・ｽ縺阪ｋ縲・
  - 蠎ｧ讓咏ｳｻ縺ｯ 3DSS 縺ｨ蜷後§縲蛍nitless 縺ｪ world 蠎ｧ讓咏ｳｻ縲阪→縺励｝x 縺ｪ縺ｩ縺ｮ逕ｻ邏蜊倅ｽ阪ｒ謖√■霎ｼ縺ｾ縺ｪ縺・・ｽ・ｽE

### 4.4.2 microFX 繝｢繧ｸ繝･繝ｼ繝ｫ縺ｮ蠖ｹ蜑ｲ

莉｣陦ｨ逧・・ｽ・ｽ繝｢繧ｸ繝･繝ｼ繝ｫ縺ｮ雋ｬ蜍呻ｼ・

- `axes`・ｽE・ｽE
  - focus 隕∫ｴ縺ｾ繧上ｊ縺ｮ繝ｭ繝ｼ繧ｫ繝ｫ霆ｸ繧堤ｰ｡譏楢｡ｨ遉ｺ縺吶ｋ縲・
  - scene 蜊雁ｾ・・ｽ・ｽ繧ｫ繝｡繝ｩ霍晞屬縺九ｉ繧ｹ繧ｱ繝ｼ繝ｫ繧呈ｱｺ繧√∝ｸｸ縺ｫ隱ｭ縺ｿ繧・・ｽ・ｽ縺・・ｽ・ｽ縺阪＆縺ｫ菫昴▽縲・
- `bounds`・ｽE・ｽE
  - focus 繧ｯ繝ｩ繧ｹ繧ｿ縺ｮ AABB・ｽE・ｽ霆ｸ蟷ｳ陦悟｢・・ｽ・ｽ繝懊ャ繧ｯ繧ｹ・ｽE・ｽ繧呈緒縺上・
  - shrinkFactor 縺ｫ繧医ｊ蟆代＠蜀・・ｽE縺ｫ邵ｮ繧√※謠上￥縺薙→縺ｧ隕冶ｪ肴ｧ繧剃ｸ翫￡繧九・
- `marker`・ｽE・ｽE
  - focus 菴咲ｽｮ縺ｫ蟆上＆縺ｪ繝橸ｿｽE繧ｫ繝ｼ繧抵ｿｽE鄂ｮ縺吶ｋ・ｽE・ｽ轤ｹ or 遏｢蜊ｰ・ｽE・ｽ縲・
- `glow`・ｽE・ｽE
  - focus 隕∫ｴ縺ｫ蟇ｾ縺励※ halo 逧・・ｽ・ｽ glow 繧定ｿｽ蜉縺吶ｋ縲・
- `highlight`・ｽE・ｽE
  - `microState.relatedUuids` 縺ｫ蜷ｫ縺ｾ繧後ｋ隕∫ｴ鄒､繧偵後↑縺槭ｋ縲阪が繝ｼ繝撰ｿｽE繝ｬ繧､繧呈緒逕ｻ縺励・
  - 讒矩逧・・ｽ・ｽ菫ゑｼ郁ｿ大ｍ・ｽE・ｽ邨瑚ｷｯ縺ｪ縺ｩ・ｽE・ｽ繧貞ｼｷ隱ｿ縺吶ｋ縲・

microState 縺ｮ隧ｳ邏ｰ縺ｪ蠖｢縺ｯ 7.11 遽縺翫ｈ縺ｳ `runtime_spec` 縺ｮ MicroFXPayload 繧呈ｭ｣縺ｨ縺吶ｋ縲・ 
譛ｬ遶縺ｧ縺ｯ縲罫enderer 縺御ｽ輔ｒ縺励※繧医＞縺具ｼ上＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽ縲阪□縺代ｒ螳夂ｾｩ縺吶ｋ縲・

### 4.4.3 譁懊ａ邱壹す繝｣繝峨え・ｽE・ｽ蟆・・ｽ・ｽ諡｡蠑ｵ・ｽE・ｽE

譁懊ａ邱夲ｼ・on-axis-aligned line・ｽE・ｽ縺ｫ蟇ｾ縺吶ｋ繧ｷ繝｣繝峨え陦ｨ迴ｾ・ｽE・ｽEhadow Convention・ｽE・ｽ・ｽE縲・ 
microFX 縺ｮ蟆・・ｽ・ｽ諡｡蠑ｵ譯医→縺励※莉墓ｧ倅ｸ翫↓菫晄戟縺吶ｋ・ｽE・ｽE

- 蟇ｾ雎｡・ｽE・ｽE
  - 繝吶け繝医Ν v = (dx, dy, dz) 縺ｫ縺翫＞縺ｦ隍・・ｽ・ｽ霆ｸ縺ｫ髱槭ぞ繝ｭ謌撰ｿｽE繧呈戟縺､邱夲ｿｽE縲・
- 譁ｹ驥晢ｼ・
  - 蜷・・ｽ・ｽ謌撰ｿｽE縺斐→縺ｫ縲悟ｽｱ邱壹阪ｒ關ｽ縺ｨ縺励∵婿蜷第─縺ｨ螂･陦後″繧定｣懷勧縺吶ｋ縲・
- 螳溯｣・・ｽ・ｽ辟｡・ｽE・ｽE
  - v1 縺ｮ蠢・・ｽ・ｽ隕∽ｻｶ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE
  - 螳溯｣・・ｽ・ｽ繧句ｴ蜷茨ｿｽE 3DSS 繧剃ｸ蛻・・ｽ・ｽ譖ｴ縺帙★縲［icroFX 縺縺代〒螳檎ｵ舌＆縺帙ｋ縲・

隧ｳ邏ｰ縺ｪ豼・・ｽ・ｽ繧・・ｽ・ｽ蜷題ｦ冗ｯ・・ｽE譌ｧ 4.7 遽縺ｮ譯医ｒ蜿り・・ｽ・ｽ縺励※繧医＞縺後・ 
譛ｬ莉墓ｧ倥〒縺ｯ縲御ｻｻ諢丞ｮ溯｣・・ｽ・ｽ縺ｨ縺励※謇ｱ縺・・ｽ・ｽE


## 4.5 繧ｫ繝｡繝ｩ莉墓ｧ假ｼ磯夢隕ｧ逕ｨ CameraEngine・ｽE・ｽE

繧ｫ繝｡繝ｩ縺ｯ `CameraEngine` 縺ｫ繧医▲縺ｦ荳蜈・・ｽ・ｽ逅・・ｽ・ｽ繧後ｋ縲・ 
cameraState 縺ｯ Core 螻､縺梧戟縺｡縲〉enderer 縺ｯ豈弱ヵ繝ｬ繝ｼ繝縺昴ｌ繧貞女縺大叙縺｣縺ｦ蜿肴丐縺吶ｋ縲・

### 4.5.1 遨ｺ髢灘ｺｧ讓咏ｳｻ縺ｨ繧ｫ繝｡繝ｩ迥ｶ諷・

遨ｺ髢灘ｺｧ讓咏ｳｻ・ｽE・ｽE

- 蜿ｳ謇狗ｳｻ繧貞燕謠舌→縺励・
- `Z+` 繧堤ｵｶ蟇ｾ荳頑婿蜷代→縺吶ｋ・ｽE・ｽErid / axis 繧ゅ％繧後↓蠕薙≧・ｽE・ｽ縲・

cameraState 縺ｮ蜈ｬ髢句ｽ｢・ｽE・ｽEub.core.camera.getState / 襍ｷ蜍輔Ο繧ｰ・ｽE・ｽ・ｽE谺｡繧呈ｭ｣縺ｨ縺吶ｋ・ｽE・ｽE

```ts
cameraState = {
  position: [number, number, number],  // world
  target:   [number, number, number],  // world
  fov:      number,                    // deg
  // optional: 謫堺ｽ懃ｳｻ縺ｮ蜀・・ｽ・ｽ陦ｨ迴ｾ・ｽE・ｽ螳溯｣・・ｽ・ｽ蠢・・ｽ・ｽ縺ｪ繧我ｽｵ險倥＠縺ｦ繧医＞・ｽE・ｽE
  theta?:    number,
  phi?:      number,
  distance?: number,
}
```

- 襍ｷ蜍輔Ο繧ｰ CAMERA {...} 縺ｯ蟆代↑縺上→繧・position/target/fov 繧貞性繧 JSON 繧抵ｿｽE蜉帙☆繧九・
- Renderer 縺ｯ position/target/fov 繧貞女縺大叙繧翫√◎縺ｮ縺ｾ縺ｾ camera 縺ｫ蜿肴丐縺吶ｋ縲・
- theta/phi/distance 縺ｯ CameraEngine 縺ｮ蜀・・ｽ・ｽ驛ｽ蜷医〒菫晄戟縺励※繧医＞縺後・ｿｽE髢句ｽ｢縺ｨ遏帷崟縺輔○縺ｪ縺・

### 4.5.2 蛻晄悄繧ｫ繝｡繝ｩ

bootstrapViewer 縺ｧ縺ｯ縲〉enderer 縺ｮ scene metrics 縺九ｉ蛻晄悄繧ｫ繝｡繝ｩ繧呈ｱｺ繧√ｋ・ｽE・ｽE

1. `renderer.syncDocument()` 蠕後↓ scene 縺ｮ bounding sphere・ｽE・ｽEenter, radius・ｽE・ｽ繧貞叙蠕励☆繧九・
2. `target = center` 縺ｨ縺吶ｋ縲・
3. `distance 竕・radius ﾃ・2.4` 遞句ｺｦ髮｢縺励∵ｧ矩蜈ｨ菴薙′逕ｻ髱｢縺ｫ蜿弱∪繧玖ｷ晞屬繧堤｢ｺ菫昴☆繧九・
4. `theta / phi` 縺ｯ繧上★縺九↓菫ｯ迸ｰ・ｽE・ｽ繧・ａE・ｽ・ｽ繧∽ｸ奇ｼ峨→縺ｪ繧九ｈ縺・・ｽ・ｽ險ｭ螳壹☆繧九・

縺難ｿｽE蛻晄悄迥ｶ諷具ｿｽE `uiState.cameraState` 縺ｫ縺ｮ縺ｿ菫晄戟縺励・ 
3DSS document 縺ｸ譖ｸ縺肴綾縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

### 4.5.3 CameraEngine API

CameraEngine 縺ｯ蟆代↑縺上→繧よｬ｡繧呈署萓帙☆繧具ｼ郁ｩｳ邏ｰ縺ｯ `runtime_spec`・ｽE・ｽ・・

- `rotate(dTheta, dPhi)`  
  - `theta += dTheta`, `phi += dPhi` 縺ｨ縺励※ orbit 繧定｡後≧縲・
  - `phi` 縺ｯ讌ｵ轤ｹ莉倩ｿ代〒繧ｯ繝ｩ繝ｳ繝励＠縲√き繝｡繝ｩ縺ｮ陬剰ｿ斐ｊ・ｽE・ｽEimbal lock・ｽE・ｽ繧帝∩縺代ｋ縲・
- `pan(dx, dy)`  
  - 逕ｻ髱｢蠎ｧ讓咏ｳｻ縺ｫ豐ｿ縺｣縺ｦ `target` 繧貞ｹｳ陦檎ｧｻ蜍輔☆繧九・
  - distance / FOV 縺ｫ蠢懊§縺ｦ pan 縺ｮ螳溯ｷ晞屬繧偵せ繧ｱ繝ｼ繝ｪ繝ｳ繧ｰ縺吶ｋ縲・
- `zoom(delta)`  
  - `distance += delta` 縺ｨ縺励※蜑榊ｾ檎ｧｻ蜍輔☆繧九・
  - `MIN_DISTANCE` / `MAX_DISTANCE` 縺ｧ繧ｯ繝ｩ繝ｳ繝励☆繧九・
  - 繧ｭ繝ｼ繝懶ｿｽE繝会ｼ擾ｿｽE繧､繝ｼ繝ｫ縺ｮ隨ｦ蜿ｷ隕冗ｴ・・ｽE縲瑚ｲ縺ｧ蜑埼ｲ・ｽE・ｽ繧ｺ繝ｼ繝繧､繝ｳ・ｽE・ｽ縲阪→縺吶ｋ縲・
- `reset()`  
  - 蛻晄悄繧ｫ繝｡繝ｩ迥ｶ諷九↓謌ｻ縺呻ｼ・ootstrap 譎ゅ↓險倬鹸縺励※縺翫￥・ｽE・ｽ縲・
- `snapToAxis(axis: 'x' | 'y' | 'z')`  
  - 謖・・ｽ・ｽ霆ｸ譁ｹ蜷代°繧画ｧ矩繧剃ｿｯ迸ｰ縺吶ｋ隗貞ｺｦ・ｽE・ｽEheta, phi・ｽE・ｽ縺ｸ繧ｹ繝翫ャ繝励☆繧九・
  - target / distance 縺ｯ邯ｭ謖√☆繧九・
- `setFOV(value)` / `setState(partial)` / `getState()`

Renderer 蛛ｴ縺ｧ縺ｯ縲∵ｯ弱ヵ繝ｬ繝ｼ繝・ｽE・ｽE

1. `camState = cameraEngine.getState()`
2. `renderer.updateCamera(camState)`
3. `renderer.render()`

縺ｨ縺・・ｽ・ｽ豬√ｌ縺ｧ蜿肴丐縺吶ｋ縲・

### 4.5.4 蜈･蜉帙Ξ繧､繝､縺ｨ縺ｮ髢｢菫・

- Mouse / Wheel / Keyboard / Gizmo 縺ｪ縺ｩ縺ｮ迚ｩ逅・・ｽE蜉幢ｿｽE縲・
  - PointerInput / KeyboardInput / gizmo.js 縺悟女縺大叙繧翫・
  - `hub.core.camera.rotate / pan / zoom / reset / snapToAxis` 縺縺代ｒ蜻ｼ縺ｳ蜃ｺ縺吶・
- CameraEngine 閾ｪ菴薙ｒ UI 繧・renderer 縺九ｉ逶ｴ謗･蜿ｩ縺上％縺ｨ縺ｯ遖∵ｭ｢縺吶ｋ縲・

蜈･蜉幢ｿｽE繝・・ｽ・ｽ繝ｳ繧ｰ縺ｮ隧ｳ邏ｰ縺ｯ 3.5 遽縺翫ｈ縺ｳ `runtime_spec` 縺ｮ KeyboardInput / PointerInput 繧貞盾辣ｧ縺吶ｋ縲・


## 4.6 繧ｫ繝｡繝ｩ繝｢繝ｼ繝会ｼ・acro / micro + meso optional・ｽE・ｽ縺ｨ謠冗判

mode・ｽE・ｽEmacro" / "micro" / "meso"・ｽE・ｽ・ｽE縲後←縺ｮ繧ｹ繧ｱ繝ｼ繝ｫ縺ｧ讒矩繧定ｦ九ｋ縺九阪ｒ陦ｨ縺吶・
uiState.mode 繧貞髪荳縺ｮ豁｣隕冗憾諷九→縺励［odeController 縺檎ｮ｡逅・・ｽ・ｽ繧九・

縺溘□縺・**meso 縺ｯ optional** 縺ｨ縺励」1 螳溯｣・・ｽ・ｽ縺ｯ **macro 逶ｸ蠖難ｼ・icroFX 辟｡縺暦ｼ・* 縺ｨ縺励※謇ｱ縺｣縺ｦ繧医＞
・ｽE・ｽ・拯eso 繧貞ｮ溯｣・・ｽ・ｽ縺ｪ縺・/ 蜿礼炊縺励※繧りｦ九◆逶ｮ縺・macro 縺ｨ蜷御ｸ縲√←縺｡繧峨〒繧ゆｻ墓ｧ倬＆蜿阪〒縺ｯ縺ｪ縺・・ｽ・ｽ縲・

### 4.6.1 繝｢繝ｼ繝牙ｮ夂ｾｩ

| 繝｢繝ｼ繝・| 逕ｨ騾・        | 隱ｬ譏・|
|--------|--------------|------|
| macro  | 蜈ｨ菴謎ｿｯ迸ｰ     | 繧ｷ繝ｼ繝ｳ蜈ｨ菴薙ｒ菫ｯ迸ｰ縺吶ｋ蝓ｺ譛ｬ繝｢繝ｼ繝峨・|
| meso   | 霑大ｍ繧ｯ繝ｩ繧ｹ繧ｿ | **optional**縲Ｗ1 縺ｧ縺ｯ macro 逶ｸ蠖薙〒繧ょ庄・ｽE・ｽEicroFX 辟｡縺暦ｼ峨ょｰ・・ｽ・ｽ縲・・ｽ・ｽ謚櫁ｿ大ｍ繧ｯ繝ｩ繧ｹ繧ｿ隕ｳ蟇溘↓諡｡蠑ｵ縺励※繧医＞縲・|
| micro  | 1 隕∫ｴ蜴溽せ   | 1 隕∫ｴ繧貞次轤ｹ縺ｨ縺ｿ縺ｪ縺呵ｿ第磁隕ｳ蟇溘Δ繝ｼ繝峨・|

- v1 縺ｮ蠢・・ｽ・ｽ螳溯｣・・ｽE macro / micro縲・
- meso 縺ｯ譛ｪ蟇ｾ蠢懊〒繧ゅｈ縺・・ｽ・ｽ譛ｪ蟇ｾ蠢懈凾縲ゞI 縺ｯ meso 繧抵ｿｽE縺輔↑縺・・ｽ・ｽ縺ｾ縺滂ｿｽE辟｡蜉ｹ蛹厄ｼ峨％縺ｨ縲・

### 4.6.2 繝｢繝ｼ繝峨→ microFX 縺ｮ髢｢菫ゑｼ・1・ｽE・ｽE

- macro
  - microFX 縺ｯ辟｡蜉ｹ・ｽE・ｽEuiState.microState = null`・ｽE・ｽ縲・
  - 蜈ｨ繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ baseStyle 縺ｮ縺ｾ縺ｾ陦ｨ遉ｺ縺吶ｋ縲・

- meso・ｽE・ｽEptional・ｽE・ｽE
  - v1 縺ｧ縺ｯ **macro 縺ｨ蜷御ｸ謖吝虚**縺ｧ繧医＞・ｽE・ｽEicroFX 辟｡縺励［icroState 縺ｯ null・ｽE・ｽ縲・
  - 蟆・・ｽ・ｽ諡｡蠑ｵ縺ｧ microState 繧定ｨ育ｮ励＠縺ｦ霑大ｍ蠑ｷ隱ｿ繝ｻ驕譁ｹ繝輔ぉ繝ｼ繝臥ｭ峨ｒ螳溯｣・・ｽ・ｽ縺ｦ繧医＞縲・

- micro
  - focus 隕∫ｴ繧剃ｸｭ蠢・・ｽ・ｽ縺励※ axes / bounds / glow / highlight 遲会ｿｽE microFX 繧帝←逕ｨ縺吶ｋ縲・
  - 髱・focus 隕∫ｴ縺ｯ繝輔ぉ繝ｼ繝峨＠縲∝ｱ謇讒矩繧定ｪｭ繧√ｋ縺薙→繧貞━蜈医☆繧九・

### 4.6.3 繝｢繝ｼ繝会ｿｽE遘ｻ縺ｨ selection・ｽE・ｽEeso optional・ｽE・ｽE

modeController 縺ｯ谺｡縺ｮ繝ｫ繝ｼ繝ｫ繧呈ｺ縺溘☆・ｽE・ｽE

- micro 縺ｫ蜈･繧九→縺搾ｼ・
  - selection 縺ｫ uuid 縺後↑縺代ｌ縺ｰ蜈･繧後↑縺・・ｽ・ｽE
  - canEnter(uuid) 縺・false 縺ｮ蝣ｴ蜷茨ｿｽE驕ｷ遘ｻ縺励↑縺・・ｽ・ｽE

- meso 縺ｫ蜈･繧九→縺搾ｼ・ptional・ｽE・ｽ・・
  - `getSupported().meso === false` 縺ｮ蝣ｴ蜷茨ｿｽE驕ｷ遘ｻ隕∵ｱゅｒ reject 縺吶ｋ・ｽE・ｽ迥ｶ諷具ｿｽE螟峨∴縺ｪ縺・・ｽ・ｽ縲・
  - `getSupported().meso === true` 縺ｮ蝣ｴ蜷医〒繧ゅ」1 縺ｧ縺ｯ macro 逶ｸ蠖薙〒繧医＞・ｽE・ｽEicroFX 辟｡縺暦ｼ峨・

- Esc 繧ｭ繝ｼ・ｽE・ｽE
  - 縺ｩ縺ｮ繝｢繝ｼ繝峨°繧峨〒繧・macro 縺ｸ謌ｻ繧具ｼ・election 縺ｯ邯ｭ謖√＠縺ｦ繧医＞・ｽE・ｽ縲・

- frame 蜀咲函髢句ｧ区凾・ｽE・ｽ謗ｨ螂ｨ・ｽE・ｽ・・
  - mode 繧・macro 縺ｫ謌ｻ縺励［icroFX 繧・OFF 縺ｫ縺吶ｋ縲・

繝｢繝ｼ繝会ｿｽE遘ｻ縺ｯ蠢・・ｽ・ｽ `core.mode.set(mode, uuid?)` 繧堤ｵ檎罰縺励・
renderer 蛛ｴ縺ｧ迢ｬ閾ｪ縺ｫ mode 繧貞愛螳壹＠縺ｦ縺ｯ縺・・ｽ・ｽ縺ｪ縺・・ｽ・ｽE


## 4.7 謠冗判繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ隕∽ｻｶ

viewer 縺ｯ髢ｲ隕ｧ蟆ら畑縺ｧ縺ゅｊ縲∵ｬ｡繧堤岼讓吶→縺吶ｋ・ｽE・ｽE

- frame 蛻・・ｽ・ｽ・ｽE・ｽE00ms 莉･蜀・
- 2000縲・000 隕∫ｴ縺ｧ譏守｢ｺ縺ｪ驕・・ｽ・ｽ縺ｪ縺・
- 繧ｫ繝｡繝ｩ謫堺ｽ懶ｼ・0fps 莉･荳奇ｼ亥ｮ溯｡檎腸蠅・・ｽ・ｽ蟄假ｼ・
- aux 蛻・・ｽ・ｽ・ｽE・ｽ繝ｦ繝ｼ繧ｶ謫堺ｽ懊°繧・1 繝輔Ξ繝ｼ繝莉･蜀・・ｽ・ｽ蜿肴丐
- selection / microFX・ｽE・ｽE 繝輔Ξ繝ｼ繝莉･蜀・・ｽ・ｽ隕冶ｦ夂噪螟牙喧縺瑚ｦ九∴繧九％縺ｨ

繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ蜷台ｸ奇ｿｽE縺溘ａ縺ｫ・ｽE・ｽE

- instancing / LOD / caching / frustum culling 縺ｪ縺ｩ縺ｮ譛驕ｩ蛹悶ｒ陦後▲縺ｦ繧医＞縲・
- 縺溘□縺励％繧後ｉ縺ｯ **viewer 蜀・・ｽ・ｽ縺ｧ螳檎ｵ・* 縺輔○縲・DSS 繧・uiState 縺ｮ諢丞袖繧貞､峨∴縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

萓九∴縺ｰ・ｽE・ｽE

- 驕譎ｯ縺ｧ縺ｯ points 繧・billboard 縺ｸ關ｽ縺ｨ縺・
- 髟ｷ螟ｧ縺ｪ polyline 繧定ｷ晞屬縺ｫ蠢懊§縺ｦ邁｡逡･蛹悶☆繧・

縺ｨ縺・・ｽ・ｽ縺滓怙驕ｩ蛹厄ｿｽE險ｱ螳ｹ縺輔ｌ繧九′縲・ 
蜈・・ｽE讒矩繝・・ｽE繧ｿ縺後後％縺・・ｽ・ｽ縺｣縺ｦ縺・・ｽ・ｽ縲阪→隱､隗｣縺輔ｌ繧九ｈ縺・・ｽ・ｽ謠冗判縺ｯ驕ｿ縺代ｋ縲・


## 4.8 謠冗判遖∵ｭ｢莠矩・・ｽ・ｽEiewer・ｽE・ｽE

viewer 縺ｯ谺｡縺ｮ陦檎ぜ繧定｡後▲縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

1. 菴咲ｽｮ縺ｮ荳ｸ繧・ｿｽE陬懷ｮ・
   - 萓具ｼ壼ｺｧ讓吶ｒ蜍晄焔縺ｫ謨ｴ謨ｰ縺ｸ荳ｸ繧√ｋ縲∵ｼ蟄千せ縺ｸ繧ｹ繝翫ャ繝励☆繧九√↑縺ｩ縲・
2. 繧ｸ繧ｪ繝｡繝医Μ縺ｮ謗ｨ貂ｬ繝ｻ陬懈ｭ｣
   - 萓具ｼ壼ｺｧ讓吶′霑代＞縺九ｉ縺ｨ縺・・ｽ・ｽ縺ｦ閾ｪ蜍輔〒謗･邯夂ｷ壹ｒ霑ｽ蜉縺吶ｋ縲・
3. ref 謨ｴ蜷茨ｿｽE菫ｮ蠕ｩ
   - 萓具ｼ壼ｭ伜惠縺励↑縺・UUID 縺ｫ蟇ｾ縺励※縲後◎繧後ｉ縺励＞縲・point 繧貞享謇九↓陬懷ｮ後☆繧九・
4. 讒矩繝・・ｽE繧ｿ縺ｫ蟄伜惠縺励↑縺・・ｽ・ｽ邏縺ｮ霑ｽ蜉
   - 萓具ｼ夂ｷ夲ｿｽE繧定｣懷ｮ後☆繧九◆繧・ｿｽE縲御ｻｮ諠ｳ繝趣ｿｽE繝峨阪ｒ 3DSS 荳翫↓逕溘ｄ縺吶・
5. 謠冗判迥ｶ諷九ｒ JSON 縺ｸ譖ｸ縺肴綾縺・
   - camera / frame / filters / selection 縺ｪ縺ｩ縺ｮ UI 迥ｶ諷九ｒ 3DSS 縺ｫ菫晏ｭ倥＠縺ｪ縺・・ｽ・ｽE
6. 繧ｫ繝｡繝ｩ迥ｶ諷具ｿｽE菫晏ｭ假ｼ域ｰｸ邯壼喧・ｽE・ｽE
   - session 蜀・・ｽ・ｽ菫晄戟縺吶ｋ縺ｮ縺ｯ繧医＞縺後∵ｧ矩繝・・ｽE繧ｿ繧・・ｽ・ｽ驛ｨ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ險倬鹸縺励↑縺・・ｽ・ｽE
7. viewer 迢ｬ閾ｪ繝・・ｽE繧ｿ縺ｮ 3DSS 縺ｸ縺ｮ莉倅ｸ・
   - 萓具ｼ嘛iewerConvenience 縺ｪ縺ｩ縺ｮ繝輔ぅ繝ｼ繝ｫ繝峨ｒ 3DSS 縺ｫ霑ｽ險倥☆繧九・
8. modeler 縺ｮ邱ｨ髮・UI 縺ｮ豺ｷ蜈･
   - viewer 縺九ｉ讒矩繧堤ｷｨ髮・・ｽ・ｽ縺阪ｋ繧医≧縺ｪ UI 繧堤ｴ帙ｌ霎ｼ縺ｾ縺帙↑縺・・ｽ・ｽE
9. 豕ｨ驥茨ｿｽE繝ｬ繝晢ｿｽE繝育ｭ峨ｒ謠冗判縺ｸ莉具ｿｽE縺輔○繧・
   - 繝・・ｽ・ｽ繧ｹ繝医Ξ繝晢ｿｽE繝育函謌舌ｄ繧ｳ繝｡繝ｳ繝茨ｿｽE UI 螻､縺ｧ陦後＞縲∵緒逕ｻ隕冗ｯ・・ｽ・ｽ蟠ｩ縺輔↑縺・・ｽ・ｽE
10. 譖ｲ邱夲ｿｽE蠎ｧ讓呻ｿｽE縲鯉ｿｽE蜍穂ｿｮ豁｣縲・
    - 萓具ｼ夂峩邱壹〒螳夂ｾｩ縺輔ｌ縺ｦ縺・・ｽ・ｽ繧ゑｿｽE繧・spline 縺ｧ繧ｹ繝繝ｼ繧ｸ繝ｳ繧ｰ縺吶ｋ縲√↑縺ｩ縲・

縺薙ｌ繧会ｿｽE遖∵ｭ｢莠矩・・ｽ・ｽ驕募渚縺吶ｋ螳溯｣・・ｽ・ｽ隕九▽縺九▲縺溷ｴ蜷医・ 
莉墓ｧ倅ｸ奇ｿｽE縲計iewer 繝舌げ縲阪→縺励※謇ｱ縺・・ｽ・ｽ菫ｮ豁｣蟇ｾ雎｡縺ｨ縺吶ｋ縲・

譛ｬ遶縺ｧ縺ｯ縲∵緒逕ｻ隕冗ｯ・・ｽ・ｽ繧ｫ繝｡繝ｩ謖吝虚繧貞ｮ夂ｾｩ縺吶ｋ縲・


---

# 5 UI 繧､繝吶Φ繝医→迥ｶ諷狗ｮ｡逅・・ｽ・ｽEiewer・ｽE・ｽE

viewer 縺ｮ UI 繧､繝吶Φ繝茨ｿｽE縲・ 
**讒矩繝・・ｽE繧ｿ・ｽE・ｽEDSS・ｽE・ｽ繧剃ｸ蛻・・ｽ・ｽ譖ｴ縺帙★**縲・ 
蜀・・ｽ・ｽ縺ｮ `uiState` 繧呈峩譁ｰ縺吶ｋ縺薙→縺ｧ螳檎ｵ舌☆繧九・

譛ｬ遶縺ｧ縺ｯ縲ゞI 繧､繝吶Φ繝・竊・core 竊・renderer 縺ｾ縺ｧ縺ｮ迥ｶ諷具ｿｽE遘ｻ縺ｨ縲・ 
縲後←縺ｮ邨瑚ｷｯ縺縺代′豁｣隕上Ν繝ｼ繝医°縲阪ｒ謨ｴ逅・・ｽ・ｽ繧九・


## 5.1 uiState 縺ｮ蠖ｹ蜑ｲ縺ｨ謇譛画ｨｩ

uiState 縺ｮ逶ｮ逧・・ｽE谺｡縺ｮ 2 轤ｹ・ｽE・ｽE

1. 髢ｲ隕ｧ菴馴ｨ薙↓蠢・・ｽ・ｽ縺ｪ荳譎ら憾諷具ｼ・election / frame / filters / mode / runtime / microFX・ｽE・ｽ繧剃ｿ晄戟縺吶ｋ  
2. 讒矩繝・・ｽE繧ｿ・ｽE・ｽEDSS・ｽE・ｽ縺ｸ縺ｮ螟画峩繧帝亟縺舌◆繧√∵ｧ矩螻､縺ｨ螳鯉ｿｽE蛻・・ｽ・ｽ縺吶ｋ  

謇譛画ｨｩ・ｽE・ｽE

- `data`・ｽE・ｽEDSS 讒矩・ｽE・ｽ・喞ore 縺御ｿ晄戟繝ｻdeep-freeze 貂医∩繝ｻread-only
- `uiState`・ｽE・ｽcore 縺悟髪荳縺ｮ譖ｸ縺崎ｾｼ縺ｿ讓ｩ繧呈戟縺､
- `visibleSet` / `microState` / `cameraState`・ｽE・ｽuiState 縺ｮ荳驛ｨ縺ｨ縺励※ core 縺檎ｮ｡逅・
- renderer / ui / hub 縺ｯ uiState 繧・**隱ｭ繧縺縺・*・ｽE・ｽEore 縺ｮ API 邨檎罰・ｽE・ｽE

uiState 縺ｮ隧ｳ邏ｰ讒矩縺ｯ 2.3 遽縺翫ｈ縺ｳ `runtime_spec` 縺ｮ `uiState` 螳夂ｾｩ繧呈ｭ｣縺ｨ縺吶ｋ縲・


## 5.2 繧､繝吶Φ繝医た繝ｼ繧ｹ縺ｨ豁｣隕上Ν繝ｼ繝・

UI 繧､繝吶Φ繝茨ｿｽE荳ｻ縺ｪ繧ｽ繝ｼ繧ｹ・ｽE・ｽE

- PointerInput・ｽE・ｽ・ｽE繧ｦ繧ｹ / 繧ｿ繝・・ｽ・ｽ・ｽE・ｽE
- KeyboardInput・ｽE・ｽ繧ｭ繝ｼ繝懶ｿｽE繝会ｼ・
- dev 繝擾ｿｽE繝阪せ・ｽE・ｽErame 繧ｹ繝ｩ繧､繝 / 蜀咲函繝懊ち繝ｳ / filter 繝懊ち繝ｳ / gizmo 繝懊ち繝ｳ・ｽE・ｽE
- 蟆・・ｽ・ｽ縺ｮ繝帙せ繝医い繝励Μ縺九ｉ縺ｮ逶ｴ謗･ API 蜻ｼ縺ｳ蜃ｺ縺暦ｼ・hub.core.*`・ｽE・ｽE

豁｣隕上Ν繝ｼ繝茨ｼ亥髪荳縺ｮ譖ｸ縺肴鋤縺育ｵ瑚ｷｯ・ｽE・ｽ・・

```text
DOM Event
  竊・
PointerInput / KeyboardInput / viewerDevHarness
  竊難ｼ・ub.core.* 縺ｮ縺ｿ・ｽE・ｽE
Core controllers / CameraEngine・ｽE・ｽ迥ｶ諷区峩譁ｰ・ｽE・ｽE
  竊・
core.recomputeVisibleSet()   竊・豢ｾ逕溽憾諷具ｿｽE蜚ｯ荳縺ｮ蜀崎ｨ育ｮ暦ｿｽE蜿｣
  - visibleSet 蜀崎ｨ育ｮ暦ｼ・rames / appearance.visible / filters 蜷茨ｿｽE・ｽE・ｽE
  - selection 縺ｮ null 謨ｴ蜷育ｶｭ謖・・ｽ・ｽ蠢・・ｽ・ｽ縺ｪ繧・null 蛹厄ｼ・
  - mode 縺ｨ遏帷崟縺励↑縺・・ｽ・ｽ縺・・ｽ・ｽ蜷茨ｼ井ｾ具ｼ嗄icro 縺ｪ縺ｮ縺ｫ selection=null 繧堤ｦ∵ｭ｢・ｽE・ｽE
  - microState 縺ｮ譖ｴ譁ｰ/隗｣髯､・ｽE・ｽEode 縺ｫ蠕薙≧・ｽE・ｽE
  竊・
hub・ｽE・ｽEender loop・ｽE・ｽE
  竊・
renderer.applyFrame / applyMicroFX / applySelection / updateCamera
  竊・
three.js Scene 縺ｫ蜿肴丐
```

遖∵ｭ｢莠矩・・ｽ・ｽE
- UI 螻､縺・uiState 繧堤峩謗･譖ｸ縺肴鋤縺医※縺ｯ縺ｪ繧峨↑縺・
- UI 螻､縺・CameraEngine 繧・three.js 縺ｮ camera / scene 縺ｫ逶ｴ謗･隗ｦ繧後※縺ｯ縺ｪ繧峨↑縺・
- renderer 螻､縺・uiState 繧・3DSS 繧呈嶌縺肴鋤縺医※縺ｯ縺ｪ繧峨↑縺・
- visibleSet / microState 繧・controller 蛛ｴ縺ｧ繝舌Λ繝舌Λ縺ｫ蜀崎ｨ育ｮ励＠縺ｦ縺ｯ縺ｪ繧峨↑縺・
 ・ｽE・ｽ・ｽE險育ｮ暦ｿｽE蠢・・ｽ・ｽ core.recomputeVisibleSet() 縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧具ｼ・

## 5.3 Frame 邉ｻ繧､繝吶Φ繝・

### 5.3.1 繧､繝吶Φ繝医た繝ｼ繧ｹ

- dev viewer 縺ｮ frame 繧ｹ繝ｩ繧､繝 / 繝懊ち繝ｳ
- KeyboardInput・ｽE・ｽEageUp / PageDown・ｽE・ｽE
- 蟆・・ｽ・ｽ・ｽE・ｽ・ｽE繧ｹ繝医い繝励Μ縺九ｉ縺ｮ `hub.core.frame.*` 蜻ｼ縺ｳ蜃ｺ縺・

### 5.3.2 豁｣隕上Ν繝ｼ繝・

萓具ｼ喃rame 繧ｹ繝ｩ繧､繝謫堺ｽ懶ｼ・ev viewer・ｽE・ｽE

1. `#frame-slider` 縺ｮ `input` 繧､繝吶Φ繝育匱轣ｫ
2. viewerDevHarness 蜀・・ｽE `initFrameControls` 縺・`frameAPI.set(v)` 繧貞他縺ｶ
   - `frameAPI` 縺ｯ `viewerHub.core.frame` 縺ｮ繝ｩ繝・・ｽ・ｽ
3. `core/frameController.set(v)` 縺悟他縺ｰ繧後ｋ
4. `uiState.frame.current` 繧呈峩譁ｰ縺励∝ｿ・・ｽ・ｽ縺ｪ繧峨け繝ｩ繝ｳ繝・
5. `frameController` 縺ｯ `uiState.frame.current` 繧呈峩譁ｰ縺励∝ｿ・・ｽ・ｽ縺ｪ繧峨け繝ｩ繝ｳ繝励☆繧・
6. **蠢・・ｽ・ｽ** `core.recomputeVisibleSet()` 繧貞他縺ｳ縲・
   - `uiState.visibleSet` 繧呈峩譁ｰ
   - selection / mode / microState 縺ｮ謨ｴ蜷医ｒ蟠ｩ縺輔↑縺・
7. hub 縺ｮ谺｡繝輔Ξ繝ｼ繝 tick 縺ｧ
   - `renderer.applyFrame(uiState.visibleSet)`
   - `renderer.render()`

KeyboardInput・ｽE・ｽEageUp / PageDown・ｽE・ｽ繧ょ酔讒倥↓・ｽE・ｽE

- `frame.step(+1)` / `frame.step(-1)` 繧堤ｵ檎罰縺励※  
  `frameController.step` 竊・`uiState.frame.current` 竊・`visibleSet` 竊・renderer  
  縺ｨ縺・・ｽ・ｽ繝ｫ繝ｼ繝茨ｿｽE縺ｿ繧剃ｽｿ縺・・ｽ・ｽE

### 5.3.3 遖∵ｭ｢莠矩・・ｽ・ｽErame・ｽE・ｽE

- renderer 縺・`frames` 繧堤峩謗･隱ｭ繧薙〒陦ｨ遉ｺ蜿ｯ蜷ｦ繧呈ｱｺ繧√ｋ
- UI 螻､縺・`uiState.frame.current` 縺ｫ逶ｴ謗･譖ｸ縺崎ｾｼ繧
- frame 遽・・ｽ・ｽ螟悶↓閾ｪ逕ｱ縺ｫ鬟幢ｿｽE縺励√◎縺ｮ蠕後〒蜍晄焔縺ｫ繧ｯ繝ｩ繝ｳ繝励☆繧・ 
  ・ｽE・ｽ繧ｯ繝ｩ繝ｳ繝暦ｿｽE frameController 蛛ｴ縺ｮ雋ｬ蜍吶→縺吶ｋ・ｽE・ｽE


## 5.4 Filter / Layer 邉ｻ繧､繝吶Φ繝・

### 5.4.1 繧､繝吶Φ繝医た繝ｼ繧ｹ

- dev viewer 縺ｮ filter 繝懊ち繝ｳ・ｽE・ｽEoints / lines / aux・ｽE・ｽE
- 蟆・・ｽ・ｽ・ｽE・ｽ・ｽE繧ｹ繝医い繝励Μ縺九ｉ縺ｮ `hub.core.filters.*`

### 5.4.2 豁｣隕上Ν繝ｼ繝・

1. 繝ｦ繝ｼ繧ｶ縺・filter 繝懊ち繝ｳ・ｽE・ｽ萓具ｼ啻#filter-lines`・ｽE・ｽ繧偵け繝ｪ繝・・ｽ・ｽ
2. viewerDevHarness 縺ｮ `initFilterControls` 縺・ 
   `filtersAPI.setTypeEnabled("lines", enabled)` 繧貞他縺ｶ
3. `filtersAPI` 縺ｯ `hub.core.filters` 縺ｮ繝ｩ繝・・ｽ・ｽ
4. `visibilityController.setTypeFilter("lines", enabled)` 縺悟他縺ｰ繧後ｋ
5. `uiState.filters.types.lines` 繧呈峩譁ｰ縺励◆繧峨・*蠢・・ｽ・ｽ** `core.recomputeVisibleSet()` 繧貞他縺ｶ  
   ・ｽE・ｽEilters / frames / appearance.visible 繧貞粋謌舌＠縺ｦ visibleSet 繧呈峩譁ｰ縺励∵紛蜷医ｒ菫昴▽・ｽE・ｽE
6. hub 縺ｮ谺｡繝輔Ξ繝ｼ繝 tick 縺ｧ `renderer.applyFrame(visibleSet)` 縺悟渚譏
7. `syncFilterUI()` 縺・`filtersAPI.get()` 繧定ｪｭ繧薙〒  
   繝懊ち繝ｳ縺ｮ繧ｯ繝ｩ繧ｹ・ｽE・ｽEilter-on / filter-off・ｽE・ｽ縺ｨ icon・ｽE・ｽ早E/ 刪・ｽE・ｽ繧呈峩譁ｰ

### 5.4.3 遖∵ｭ｢莠矩・・ｽ・ｽEilter・ｽE・ｽE

- renderer 縺・`appearance.visible` 繧・`frames` 繧定ｦ九※迢ｬ閾ｪ縺ｫ filter 縺吶ｋ
  - filter 蜷茨ｿｽE・ｽE・ｽErames / appearance.visible / filters.types・ｽE・ｽ・ｽE  
    **visibilityController 縺ｫ荳蜈・・ｽ・ｽ** 縺吶ｋ
- UI 螻､縺・`uiState.visibleSet` 繧堤峩謗･譖ｸ縺肴鋤縺医ｋ


## 5.5 Selection / Picker 邉ｻ繧､繝吶Φ繝・

### 5.5.1 繧､繝吶Φ繝医た繝ｼ繧ｹ

- PointerInput 縺ｫ繧医ｋ canvas click・ｽE・ｽEay picking・ｽE・ｽE
- 蟆・・ｽ・ｽ・ｽE・ｽUI 縺九ｉ逶ｴ謗･ `hub.core.selection.select(uuid)` 繧貞他縺ｶ繧ｱ繝ｼ繧ｹ

v1 螳溯｣・・ｽ・ｽ縺ｯ PointerInput 縺・`hub.pickObjectAt` 繧剃ｽｿ縺｣縺ｦ驕ｸ謚槭ｒ陦後≧縲・

### 5.5.2 豁｣隕上Ν繝ｼ繝・

1. 繝ｦ繝ｼ繧ｶ縺・canvas 荳翫ｒ繧ｯ繝ｪ繝・・ｽ・ｽ
2. PointerInput 縺・`pointerup` / `click` 繧偵ヵ繝・・ｽ・ｽ縺励・
   - 逕ｻ髱｢蠎ｧ讓・竊・NDC 蠎ｧ讓吶∈螟画鋤
   - `hub.pickObjectAt(ndcX, ndcY)` 繧貞他縺ｶ
3. viewerHub 縺・`renderer.pickObjectAt` 縺ｫ蟋碑ｭｲ縺励・
   - `userData.uuid` 繧呈戟縺､譛蜑埼擇繝偵ャ繝医ｒ霑斐☆・ｽE・ｽ縺ｪ縺代ｌ縺ｰ null・ｽE・ｽE
4. PointerInput 縺・`uuid` 繧貞女縺大叙繧翫・ 
   - `hub.core.selection.select(uuid)` 繧貞他縺ｶ
5. `selectionController.select(uuid)` 縺・
   - `structIndex` 縺九ｉ `kind` 繧定ｧ｣豎ｺ
   - `uiState.selection = {kind, uuid}` 繧呈峩譁ｰ
6. **蠢・・ｽ・ｽ** `core.recomputeVisibleSet()` 繧貞他縺ｳ縲・
   - selection 縺・visibleSet 縺ｨ遏帷崟縺励↑縺・・ｽ・ｽ縺ｨ繧剃ｿ晁ｨｼ
   - mode / microState 繧剃ｻ墓ｧ倬壹ｊ縺ｫ譖ｴ譁ｰ・ｽE・ｽ蠢・・ｽ・ｽ縺ｪ繧・micro 繧定ｧ｣髯､・ｽE・ｽE
7. hub 縺ｮ谺｡繝輔Ξ繝ｼ繝 tick 縺ｧ
   - `renderer.applySelection(uiState.selection)`
   - `renderer.applyMicroFX(uiState.microState)`
   - `renderer.render()`


### 5.5.3 遖∵ｭ｢莠矩・・ｽ・ｽEelection・ｽE・ｽE

- UI 螻､縺・`uiState.selection` 繧堤峩謗･譖ｸ縺・
- renderer 縺後梧怙蠕後↓ hit 縺励◆繧ｪ繝悶ず繧ｧ繧ｯ繝医阪ｒ蜍晄焔縺ｫ selection 縺ｨ縺励※謇ｱ縺・
- modeController 繧定ｿょ屓縺励※ microState 繧堤峩謗･譖ｸ縺肴鋤縺医ｋ


## 5.6 Mode / MicroFX 邉ｻ繧､繝吶Φ繝茨ｼ・eso optional・ｽE・ｽE

### 5.6.1 繧､繝吶Φ繝医た繝ｼ繧ｹ

- KeyboardInput・ｽE・ｽEsc・ｽE・ｽE
- dev viewer 縺ｮ focus 繝医げ繝ｫ繝懊ち繝ｳ・ｽE・ｽ繧ｯ繝ｪ繝・・ｽ・ｽ・ｽE・ｽE
- ・ｽE・ｽEptional・ｽE・ｽMESO UI・ｽE・ｽ繧ｯ繝ｪ繝・・ｽ・ｽ縲ＡgetSupported().meso === true` 縺ｮ縺ｨ縺搾ｿｽE縺ｿ陦ｨ遉ｺ・ｽE・ｽE
- 蟆・・ｽ・ｽ・ｽE・ｽ・ｽE繧ｹ繝医い繝励Μ縺九ｉ縺ｮ `hub.core.mode.*` 蜻ｼ縺ｳ蜃ｺ縺・

### 5.6.2 豁｣隕上Ν繝ｼ繝・

- micro 縺ｸ・ｽE・ｽE
  1. UI 縺・`selection.get()` 縺ｧ迴ｾ蝨ｨ selection 繧貞叙蠕・
  2. `sel.uuid` 縺後≠繧鯉ｿｽE `mode.set("micro", sel.uuid)` 繧貞他縺ｶ
  3. `modeController.set("micro", uuid)` 縺鯉ｿｽE遘ｻ蜿ｯ蜷ｦ繧貞愛螳壹＠ `uiState.mode` 繧呈峩譁ｰ
  4. **蠢・・ｽ・ｽ** `core.recomputeVisibleSet()` 繧貞他縺ｳ縲［icroState 繧貞性繧豢ｾ逕溽憾諷九ｒ譖ｴ譁ｰ縺吶ｋ
  5. 谺｡繝輔Ξ繝ｼ繝縺ｧ `renderer.applyMicroFX(microState)` 縺悟渚譏縺輔ｌ繧・

- macro 謌ｻ繧奇ｼ・sc・ｽE・ｽ・・
  - `mode.set("macro")` 竊・`uiState.mode="macro"` 竊・**`core.recomputeVisibleSet()`**  
    ・ｽE・ｽEicroState 繧・null 縺ｫ縺励※ microFX OFF・ｽE・ｽE

- meso・ｽE・ｽEptional・ｽE・ｽ・・
  - `getSupported().meso === false` 縺ｮ迺ｰ蠅・・ｽ・ｽ縺ｯ `set("meso", ...)` 縺ｯ false 繧定ｿ斐＠菴輔ｂ縺励↑縺・・ｽ・ｽE
  - v1 螳溯｣・・ｽ・ｽ縺ｯ meso 縺ｯ **macro 逶ｸ蠖難ｼ・icroFX 辟｡縺暦ｼ・*縺ｧ繧ゆｻ墓ｧ倬＆蜿阪〒縺ｯ縺ｪ縺・・ｽ・ｽE

### 5.6.3 遖∵ｭ｢莠矩・・ｽ・ｽEode / MicroFX・ｽE・ｽE

- renderer 縺・`uiState.mode` 繧堤峡閾ｪ隗｣驥医＠縺ｦ microFX 繝ｭ繧ｸ繝・・ｽ・ｽ繧呈戟縺､縺薙→縺ｯ遖∵ｭ｢  
  ・ｽE・ｽ蟇ｾ雎｡豎ｺ螳夲ｿｽE core 蛛ｴ・ｽE・ｽ`recomputeVisibleSet()` 縺ｫ髮・・ｽ・ｽE・ｽ・ｽE
- UI 螻､縺・`uiState.microState` 繧堤峩謗･譖ｸ縺肴鋤縺医ｋ縺ｮ縺ｯ遖∵ｭ｢
- modeController 繧堤ｵ檎罰縺帙★ microController 繧堤峩謗･蜿ｩ縺擾ｿｽE縺ｯ遖∵ｭ｢


## 5.7 Camera 邉ｻ繧､繝吶Φ繝・

### 5.7.1 繧､繝吶Φ繝医た繝ｼ繧ｹ

- PointerInput・ｽE・ｽ繝峨Λ繝・・ｽ・ｽ / 繝帙う繝ｼ繝ｫ・ｽE・ｽE
- KeyboardInput・ｽE・ｽ遏｢蜊ｰ繧ｭ繝ｼ / Home / +/-・ｽE・ｽE
- gizmo 繝懊ち繝ｳ・ｽE・ｽEOME / axis・ｽE・ｽE
- dev viewer 縺ｮ霑ｽ蜉繧ｷ繝ｧ繝ｼ繝医き繝・・ｽ・ｽ・ｽE・ｽ萓具ｼ唏ome 繧ｭ繝ｼ 竊・reset・ｽE・ｽE

### 5.7.2 豁｣隕上Ν繝ｼ繝・

PointerInput・ｽE・ｽErbit / zoom / pan・ｽE・ｽ・・

- 蟾ｦ繝峨Λ繝・・ｽ・ｽ・ｽE・ｽE
  - 繝峨Λ繝・・ｽ・ｽ驥上°繧・`dTheta` / `dPhi` 繧堤ｮ暦ｿｽE縺励～camera.rotate(dTheta, dPhi)`
- 蜿ｳ or 荳ｭ繝峨Λ繝・・ｽ・ｽ・ｽE・ｽE
  - 逕ｻ髱｢蠎ｧ讓吝ｷｮ蛻・・ｽ・ｽ繧・`dx` / `dy` 繧堤ｮ暦ｿｽE縺励～camera.pan(dx, dy)`
- 繝帙う繝ｼ繝ｫ・ｽE・ｽE
  - `deltaY` 縺九ｉ邵ｮ蟆ｺ繧呈ｱｺ繧√※ `camera.zoom(delta)`

KeyboardInput・ｽE・ｽE

- `ArrowLeft/Right/Up/Down`・ｽE・ｽE
  - `camera.rotate(ﾂｱstep, 0)` / `camera.rotate(0, ﾂｱstep)`
- `Home`・ｽE・ｽE
  - `camera.reset()`
- `+` / `-` / `NumpadAdd` / `NumpadSubtract`・ｽE・ｽE
  - `camera.zoom(ﾂｱZOOM_STEP)`

gizmo・ｽE・ｽE

- HOME 繝懊ち繝ｳ・ｽE・ｽE
  - `camera.reset()`
- X/Y/Z 繝懊ち繝ｳ・ｽE・ｽE
  - `camera.snapToAxis('x'|'y'|'z')`

縺・・ｽ・ｽ繧後ｂ譛邨ら噪縺ｫ縺ｯ `CameraEngine` 縺ｮ繝｡繧ｽ繝・・ｽ・ｽ縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧後・ 
`uiState.cameraState` 繧呈峩譁ｰ縺吶ｋ縲・

### 5.7.3 遖∵ｭ｢莠矩・・ｽ・ｽEamera・ｽE・ｽE

- UI 螻､縺・`uiState.cameraState` 繧堤峩謗･譖ｸ縺肴鋤縺医ｋ
- renderer 縺・`camera.position` 繧貞享謇九↓蜍輔°縺励，ameraEngine 縺ｨ莠碁㍾邂｡逅・・ｽ・ｽ繧・
- modeController 繧・microController 縺檎峩謗･ camera 繧呈桃菴懊☆繧・ 
  ・ｽE・ｽ蠢・・ｽ・ｽ縺ｪ繧・CameraEngine API 繧帝壹☆・ｽE・ｽE


## 5.8 runtime 繝輔Λ繧ｰ・ｽE・ｽEsFramePlaying / isCameraAuto・ｽE・ｽE

`uiState.runtime` 縺ｯ縲・ｿｽE逕溽憾諷具ｿｽE閾ｪ蜍輔き繝｡繝ｩ迥ｶ諷九↑縺ｩ縺ｮ  
**繝ｩ繝ｳ繧ｿ繧､繝繝ｬ繝吶Ν縺ｮ繝輔Λ繧ｰ** 繧剃ｿ晄戟縺吶ｋ縲・

```ts
uiState.runtime = {
  isFramePlaying: boolean,
  isCameraAuto:   boolean,
}
```

v1 縺ｧ縺ｯ・ｽE・ｽE

- dev viewer 縺ｮ蜀咲函繝懊ち繝ｳ・ｽE・ｽElay/Stop・ｽE・ｽ・ｽE  
  繝擾ｿｽE繝阪せ蜀・・ｽ・ｽ縺ｮ `setInterval` 縺ｧ螳檎ｵ舌＠縺ｦ縺翫ｊ縲・ 
  `isFramePlaying` 縺ｯ縺ｾ縺 runtime API 縺九ｉ縺ｯ菴ｿ逕ｨ縺励※縺・・ｽ・ｽ縺・・ｽ・ｽE
- 蟆・・ｽ・ｽ縲’rame 蜀咲函繝ｭ繧ｸ繝・・ｽ・ｽ繧・core/frameController 蛛ｴ縺ｸ遘ｻ縺吝ｴ蜷茨ｿｽE縲・
  - `hub.core.runtime.startFramePlayback()` / `.stopFramePlayback()` 縺ｪ縺ｩ繧定ｿｽ蜉縺励・
  - `uiState.runtime.isFramePlaying` 繧・core 縺悟髪荳縺ｮ豁｣隕上Ν繝ｼ繝医→縺励※譖ｴ譁ｰ縺吶ｋ縲・

遖∵ｭ｢莠矩・・ｽ・ｽE

- UI 螻､縺・runtime 繝輔Λ繧ｰ繧堤峩謗･譖ｸ縺肴鋤縺医・ 
  core 蛛ｴ縺ｮ繝ｭ繧ｸ繝・・ｽ・ｽ縺ｨ遏帷崟繧定ｵｷ縺薙☆縺薙→
- renderer 縺・runtime 繝輔Λ繧ｰ繧定ｦ九※迢ｬ閾ｪ縺ｮ迥ｶ諷具ｿｽE繧ｷ繝ｳ繧呈戟縺､縺薙→


## 5.9 dev 繝擾ｿｽE繝阪せ・ｽE・ｽEiewerDevHarness.js・ｽE・ｽ・ｽE雋ｬ蜍・

viewer_dev 逕ｨ繝擾ｿｽE繝阪せ縺ｯ縲・ 
UI 縺ｨ hub 縺ｮ繝悶Μ繝・・ｽ・ｽ縺ｧ縺ゅｊ縲〉untime 縺晢ｿｽE繧ゑｿｽE縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE

雋ｬ蜍呻ｼ・

- 襍ｷ蜍包ｼ・
  - `window.load` 竊・`boot()` 繧・1 蝗槭□縺大ｮ溯｡・
  - `bootstrapViewerFromUrl(canvasId, modelUrl, options)` 繧貞他縺ｳ蜃ｺ縺・
- devBootLog 縺ｮ驟咲ｷ夲ｼ・
  - `options.devBootLog = true` / `options.logger = devLogger`
  - Model 繝ｭ繧ｰ繝代ロ繝ｫ縺ｸ  
    `BOOT / MODEL / CAMERA / LAYERS / FRAME` 繧定｡ｨ遉ｺ
- UI 謗･邯夲ｼ・
  - frame 繧ｹ繝ｩ繧､繝 / 繝懊ち繝ｳ 竊・`hub.core.frame.*`
  - filter 繝懊ち繝ｳ 竊・`hub.core.filters.*`
  - mode HUD / focus 繝医げ繝ｫ 竊・`hub.core.mode.*` / `hub.core.selection.get()`
  - gizmo 竊・`hub.core.camera.reset / snapToAxis`
  - Keyboard shortcuts・ｽE・ｽEpace 竊・Play・ｽE・ｽ縺ｪ縺ｩ縲・ 
    dev 蟆ら畑繧ｷ繝ｧ繝ｼ繝医き繝・・ｽ・ｽ縺ｮ螳溯｣・
- HUD / 繝｡繧ｿ諠・・ｽ・ｽ陦ｨ遉ｺ・ｽE・ｽE
  - File 繝代ロ繝ｫ・ｽE・ｽEource / frame range / current frame・ｽE・ｽE
  - Model 繝代ロ繝ｫ・ｽE・ｽ繝ｭ繧ｰ・ｽE・ｽE
  - HUD 繝茨ｿｽE繧ｹ繝茨ｼ・iewerToast・ｽE・ｽE

蛻ｶ邏・・ｽ・ｽE

- runtime 螻､・ｽE・ｽEore / renderer・ｽE・ｽ・ｽE蜀・・ｽ・ｽ讒矩縺ｫ縺ｯ隗ｦ繧後↑縺・
  - 隗ｦ縺｣縺ｦ繧医＞縺ｮ縺ｯ `viewerHub` 縺ｮ蜈ｬ髢・API・ｽE・ｽEhub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop`・ｽE・ｽ・ｽE縺ｿ
- KeyboardInput / PointerInput 縺ｮ繝ｭ繧ｸ繝・・ｽ・ｽ繧剃ｸ頑嶌縺阪＠縺ｪ縺・
  - 萓句､厄ｿｽE縲郡pace 竊・Play縲阪↑縺ｩ dev 蝗ｺ譛峨す繝ｧ繝ｼ繝医き繝・・ｽ・ｽ縺ｮ縺ｿ

莉･荳翫↓繧医ｊ縲ゞI 繧､繝吶Φ繝茨ｿｽE縺吶∋縺ｦ  
縲計iewerDevHarness / PointerInput / KeyboardInput 竊・hub.core.* 竊・core 竊・uiState 竊・renderer縲・ 
縺ｨ縺・・ｽ・ｽ荳譛ｬ蛹悶＆繧後◆邨瑚ｷｯ繧帝壹ｋ縺薙→縺御ｿ晁ｨｼ縺輔ｌ繧九・

## 5.10 豢ｾ逕溽憾諷具ｿｽE蜀崎ｨ育ｮ励→謨ｴ蜷域ｧ・ｽE・ｽ蠢・・ｽ・ｽ・・

viewer 縺ｯ豢ｾ逕溽憾諷具ｼ・isibleSet / microState・ｽE・ｽ繧定､・・ｽ・ｽ邂・・ｽ・ｽ縺ｧ險育ｮ励＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

- `core.recomputeVisibleSet()` 縺・**蜚ｯ荳縺ｮ蜀崎ｨ育ｮ暦ｿｽE蜿｣**縺ｧ縺ゅｊ縲・
  縺吶∋縺ｦ縺ｮ UI 繧､繝吶Φ繝亥ｾ後↓蠢・・ｽ・ｽ縺ｫ蠢懊§縺ｦ縺薙ｌ繧貞他縺ｶ縲・

`core.recomputeVisibleSet()` 縺ｯ蟆代↑縺上→繧よｬ｡繧剃ｿ晁ｨｼ縺吶ｋ・ｽE・ｽE

1. visibleSet 縺ｯ蟶ｸ縺ｫ  
   `frames` + `appearance.visible` + `filters.types` 縺ｮ蜷茨ｿｽE邨先棡縺ｧ縺ゅｋ
2. selection 縺ｯ蟶ｸ縺ｫ null-safe 縺ｧ縺ゅｋ  
   ・ｽE・ｽEisibleSet 縺ｨ遏帷崟縺吶ｋ selection 縺ｯ null 蛹悶☆繧九√↑縺ｩ・ｽE・ｽE
3. mode 縺ｯ selection 縺ｨ遏帷崟縺励↑縺・ 
   ・ｽE・ｽ萓具ｼ嗄icro 縺ｪ縺ｮ縺ｫ selection=null 縺ｮ迥ｶ諷九ｒ菴懊ｉ縺ｪ縺・・ｽ・ｽE
4. microState 縺ｯ mode 縺ｫ蠕薙▲縺ｦ譖ｴ譁ｰ/隗｣髯､縺輔ｌ繧・ 
   ・ｽE・ｽEacro 縺ｧ縺ｯ蠢・・ｽ・ｽ null縲［icro 縺ｧ縺ｯ蠢・・ｽ・ｽ蜀崎ｨ育ｮ暦ｼ・

縺薙ｌ縺ｫ繧医ｊ縲√檎憾諷具ｿｽE莠碁㍾邂｡逅・・ｽ・ｽ縲鯉ｿｽE險育ｮ玲ｼ上ｌ縲阪稽ode 縺ｨ selection 縺ｮ遏帷崟縲阪ｒ莉墓ｧ倅ｸ顔ｦ∵ｭ｢縺吶ｋ縲・


---

# 6 繝ｭ繧ｰ繝ｻ險ｺ譁ｭ繝ｻ螟夜Κ騾｣謳ｺ縺ｨ遖∵ｭ｢讖滂ｿｽE・ｽE・ｽEiewer・ｽE・ｽE

viewer 縺ｯ讒矩繝・・ｽE繧ｿ繧貞､画峩縺励↑縺・・ｽ・ｽ隕ｧ蟆ら畑繧｢繝励Μ縺ｧ縺ゅｋ縺ｨ蜷梧凾縺ｫ縲・ 
髢狗匱繝ｻ讀懆ｨｼ縺ｮ縺溘ａ縺ｮ **險ｺ譁ｭ繝ｭ繧ｰ** 繧抵ｿｽE蜉帙〒縺阪ｋ dev viewer・ｽE・ｽEiewer_dev・ｽE・ｽ繧呈戟縺､縲・

譛ｬ遶縺ｧ縺ｯ縲・

- 繝ｭ繧ｰ・ｽE・ｽ迚ｹ縺ｫ devBootLog・ｽE・ｽ・ｽE莉墓ｧ・
- 繧ｨ繝ｩ繝ｼ蝣ｱ蜻翫→繝ｦ繝ｼ繧ｶ蜷代￠繝｡繝・・ｽ・ｽ繝ｼ繧ｸ
- runtime API 繧剃ｻ九＠縺溷､夜Κ騾｣謳ｺ
- 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ・ｽE・ｽ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝域ｩ滂ｿｽE縺ｮ謇ｱ縺・
- microFX 縺ｮ驕狗畑繝ｫ繝ｼ繝ｫ・ｽE・ｽ隧ｳ邏ｰ迚茨ｼ・

繧貞ｮ夂ｾｩ縺吶ｋ縲・


## 6.1 繝ｭ繧ｰ縺ｮ蝓ｺ譛ｬ譁ｹ驥・

### 6.1.1 繝ｭ繧ｰ繝ｬ繧､繝､

viewer 縺ｮ繝ｭ繧ｰ縺ｯ螟ｧ縺阪￥ 3 繝ｬ繧､繝､縺ｫ蛻・・ｽ・ｽ繧後ｋ・ｽE・ｽE

1. **dev viewer UI 繝ｭ繧ｰ**
   - viewer_devHarness 蜀・・ｽ・ｽ謇ｱ縺・・ｽ・ｽModel 繝代ロ繝ｫ縲咲ｭ峨∈縺ｮ蜃ｺ蜉・
   - 莠ｺ髢薙′髢狗匱譎ゅ↓遒ｺ隱阪☆繧九◆繧・ｿｽE繧ゑｿｽE
2. **繝悶Λ繧ｦ繧ｶ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ繝ｭ繧ｰ**
   - `console.log` / `console.warn` / `console.error` 縺ｫ繧医ｋ蜃ｺ蜉・
   - 髢狗匱譎ゑｿｽE繝・・ｽ・ｽ繝・・ｽ・ｽ縲√♀繧茨ｿｽE譛ｬ逡ｪ縺ｧ繧ょｿ・・ｽ・ｽ譛蟆城剞縺ｮ繧ｨ繝ｩ繝ｼ騾夂衍縺ｫ蛻ｩ逕ｨ
3. **繝帙せ繝医い繝励Μ蛛ｴ繝ｭ繧ｰ・ｽE・ｽ莉ｻ諢擾ｼ・*
   - Astro / 螟夜Κ JS 縺ｪ縺ｩ縺・viewer 縺ｮ繧､繝吶Φ繝医ｒ諡ｾ縺｣縺ｦ縲・ 
     繧ｵ繝ｼ繝舌Ο繧ｮ繝ｳ繧ｰ繧・・ｽ・ｽ閾ｪ UI 縺ｫ蜃ｺ縺吝ｴ蜷・
   - viewer 莉墓ｧ倥→縺励※縺ｯ縲後う繝吶Φ繝磯夂衍縺ｮ蠖｢縲阪∪縺ｧ繧剃ｿ晁ｨｼ縺励・ 
     螳滄圀縺ｮ繝ｭ繧ｰ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｯ繝帙せ繝茨ｿｽE雋ｬ蜍吶→縺吶ｋ

### 6.1.2 繝ｭ繧ｰ縺ｮ逶ｮ逧・

繝ｭ繧ｰ縺ｮ荳ｻ逶ｮ逧・・ｽE谺｡縺ｮ騾壹ｊ縺ｨ縺吶ｋ・ｽE・ｽE

- 3DSS 繝ｭ繝ｼ繝会ｿｽE讀懆ｨｼ繝ｻ蛻晄悄蛹厄ｿｽE謌仙粥・ｽE・ｽ螟ｱ謨励ｒ蜿ｯ隕門喧縺吶ｋ
- frame / filter / selection / mode / camera 縺ｮ謖吝虚繧定ｨｺ譁ｭ縺吶ｋ
- microFX 繧・structIndex 縺ｪ縺ｩ縲・ｿｽE驛ｨ蜃ｦ逅・・ｽE荳肴紛蜷医ｒ讀懃衍縺吶ｋ

騾・・ｽ・ｽ縲・

- 繧ｨ繝ｳ繝峨Θ繝ｼ繧ｶ蜷代￠縺ｮ蟶ｸ譎ゅΟ繧ｰ繝薙Η繝ｼ繧｢繧呈署萓帙☆繧・
- 3DSS 縺ｮ蜀・・ｽ・ｽ繧偵後Ο繧ｰ縺ｨ縺励※繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝医阪☆繧・

縺ｨ縺・・ｽ・ｽ縺溽畑騾費ｿｽE viewer 譛ｬ菴難ｿｽE雋ｬ蜍吝､悶→縺吶ｋ縲・


## 6.2 devBootLog・ｽE・ｽ襍ｷ蜍輔Ο繧ｰ・ｽE・ｽ莉墓ｧ・

### 6.2.1 蠖ｹ蜑ｲ

devBootLog 縺ｯ縲‥ev viewer 襍ｷ蜍墓凾縺ｫ **譛菴・1 蝗槭□縺・* 蜃ｺ蜉帙＆繧後ｋ  
讓呎ｺ門ｽ｢蠑擾ｿｽE襍ｷ蜍輔Ο繧ｰ鄒､縺ｧ縺ゅｋ縲・

逶ｮ逧・・ｽ・ｽE

- 襍ｷ蜍慕ｵ瑚ｷｯ縺御ｻ墓ｧ倥←縺翫ｊ縺ｫ縺ｪ縺｣縺ｦ縺・・ｽ・ｽ縺九ｒ遒ｺ隱阪☆繧・
- model URL / 蛻晄悄 camera / layers / frame 迥ｶ諷九ｒ荳逶ｮ縺ｧ謚頑升縺吶ｋ
- 繝・・ｽ・ｽ繝・・ｽ・ｽ譎ゅ↓縲瑚ｵｷ蜍輔∪縺ｧ縺ｯ豁｣蟶ｸ縺九阪ｒ邏譌ｩ縺擾ｿｽE繧奇ｿｽE縺代ｋ

### 6.2.2 蜃ｺ蜉帛ｽ｢蠑・

襍ｷ蜍募ｮ御ｺ・・ｽ・ｽ縲∵ｬ｡縺ｮ 5 繝ｬ繧ｳ繝ｼ繝峨ｒ縺難ｿｽE鬆・・ｽ・ｽ蜃ｺ蜉帙☆繧具ｼ・

```text
BOOT  <devLabel>
MODEL <modelUrl or (unknown)>
CAMERA {"position":[x,y,z],"target":[x,y,z],"fov":number}
LAYERS points=on|off lines=on|off aux=on|off
FRAME  frame_id=<number>
```

- BOOT
  - 繝ｩ繝吶Ν譁・・ｽ・ｽ・ｽE・ｽE・ｽ騾壼ｸｸ縺ｯ `"viewer_dev"`・ｽE・ｽ繧貞・縺吶・
- MODEL
  - JSON 繝ｭ繝ｼ繝会ｿｽE縺ｮ URL・ｽE・ｽEmodelUrl`・ｽE・ｽ繧貞・縺吶・ 
    譛ｪ險ｭ螳夲ｿｽE蝣ｴ蜷茨ｿｽE `"MODEL (unknown)"` 縺ｨ縺吶ｋ縲・
- CAMERA
  - `cameraEngine.getState()` 縺ｪ縺ｩ縺九ｉ cameraState 繧貞叙蠕励＠縲・
    - position: `[x,y,z]`・ｽE・ｽ蟄伜惠縺励↑縺・・ｽ・ｽ蜷茨ｿｽE `[0,0,0]`・ｽE・ｽE
    - target: `[x,y,z]`・ｽE・ｽ蟄伜惠縺励↑縺・・ｽ・ｽ蜷茨ｿｽE `[0,0,0]`・ｽE・ｽE
    - fov: number・ｽE・ｽ蟄伜惠縺励↑縺・・ｽ・ｽ蜷茨ｿｽE `50`・ｽE・ｽE
  - 繧・JSON 譁・・ｽ・ｽ・ｽE縺ｨ縺励※蝓九ａ霎ｼ繧縲・
- LAYERS
  - `uiState.filters.types.{points,lines,aux}` 繧貞━蜈医＠縲・
- FRAME
  - `uiState.frame.current` 縺ｾ縺滂ｿｽE `frameController.get()` 縺ｮ蛟､繧抵ｿｽE縺吶・

### 6.2.3 蜃ｺ蜉幢ｿｽE縺ｨ繧ｪ繝励す繝ｧ繝ｳ

`bootstrapViewer` / `bootstrapViewerFromUrl` 縺ｮ `options` 縺ｨ縺励※・ｽE・ｽE

- `devBootLog: boolean`  
  - true 縺ｮ蝣ｴ蜷茨ｿｽE縺ｿ devBootLog 繧抵ｿｽE蜉帙☆繧九・
- `devLabel?: string`  
  - BOOT 陦後↓蝓九ａ霎ｼ繧繝ｩ繝吶Ν・ｽE・ｽ逵∫払譎・`"viewer_dev"`・ｽE・ｽ縲・
- `modelUrl?: string`  
  - MODEL 陦後↓蜃ｺ縺・model URL縲・
- `logger?: (line: string) => void`
  - 繝ｭ繧ｰ蜃ｺ蜉幃未謨ｰ縲ら怐逡･譎ゑｿｽE `console.log` 繧堤畑縺・・ｽ・ｽ縲・

viewer_dev 繝擾ｿｽE繝阪せ縺ｧ縺ｯ騾壼ｸｸ・ｽE・ｽE

- `devBootLog: true`
- `devLabel: "viewer_dev"`
- `modelUrl: jsonUrl`
- `logger: devLogger`・ｽE・ｽEevLogger 縺ｯ Model 繝代ロ繝ｫ縺ｸ霑ｽ險假ｼ・

縺ｨ縺励※蜻ｼ縺ｳ蜃ｺ縺吶・

### 6.2.4 dev / 譛ｬ逡ｪ縺ｧ縺ｮ謇ｱ縺・・ｽ・ｽE-10 蟇ｾ蠢懶ｼ・

- dev viewer・ｽE・ｽEiewer_dev.html・ｽE・ｽ・・
  - 荳願ｨ・5 陦後ｒ **蠢・・ｽ・ｽE* 縺ｨ縺吶ｋ縲・
  - 蜃ｺ蜉幢ｿｽE縺ｯ UI・ｽE・ｽEodel 繝代ロ繝ｫ・ｽE・ｽ・・繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ繧呈Φ螳壹・
- 譛ｬ逡ｪ viewer・ｽE・ｽE
  - 蜷後§繝輔か繝ｼ繝槭ャ繝茨ｿｽE繝ｭ繧ｰ繧・**莉ｻ諢上〒** 蜃ｺ蜉帙＠縺ｦ繧医＞縲・
  - 蠢・・ｽ・ｽ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽ縲∬ｨｺ譁ｭ荳頑怏逕ｨ縺ｪ縺溘ａ蟆・・ｽ・ｽ逧・・ｽ・ｽ蜀榊茜逕ｨ繧呈Φ螳壹☆繧九・

縺､縺ｾ繧・devBootLog 縺ｯ縲慧ev viewer 縺ｧ蠢・・ｽ・ｽ縲∵悽逡ｪ縺ｧ莉ｻ諢上搾ｿｽE險ｺ譁ｭ繝ｭ繧ｰ縺ｨ縺吶ｋ縲・ 
繝輔か繝ｼ繝槭ャ繝茨ｿｽE蟆・・ｽ・ｽ繧ょｮ会ｿｽE縺ｫ螟画峩縺励↑縺・・ｽ・ｽE


## 6.3 霑ｽ蜉繝ｭ繧ｰ繧ｫ繝・・ｽ・ｽ繝ｪ・ｽE・ｽ髢狗匱逕ｨ・ｽE・ｽE

螳溯｣・・ｽ・ｽ縲∵ｬ｡縺ｮ繧医≧縺ｪ繧ｫ繝・・ｽ・ｽ繝ｪ繧・DEBUG 繝輔Λ繧ｰ莉倥″縺ｧ謖√▲縺ｦ繧医＞・ｽE・ｽE

- HUB (`DEBUG_HUB`)
  - hub 縺ｮ繝輔Ξ繝ｼ繝縺斐→縺ｮ迥ｶ諷九せ繝翫ャ繝励す繝ｧ繝・・ｽ・ｽ
  - 萓具ｼ啻[hub] frame n { cam, visibleSet, selection }`
- POINTER (`DEBUG_POINTER`)
  - PointerInput 縺ｮ pointerdown / move / up / click 繧､繝吶Φ繝・
- KEYBOARD (`DEBUG_KEYBOARD`)
  - KeyboardInput 縺ｮ keydown 繧､繝吶Φ繝・
- MICROFX (`DEBUG_MICROFX`)
  - microFX 驕ｩ逕ｨ蜑榊ｾ鯉ｿｽE state 螟牙喧・ｽE・ｽEocusUuid / relatedUuids / localBounds 遲会ｼ・

縺薙ｌ繧会ｿｽE **繝・・ｽ・ｽ繧ｩ繝ｫ繝・OFF** 縺ｨ縺励・ 
髢狗匱譎ゅ↓縺ｮ縺ｿ true 縺ｫ縺励※菴ｿ縺・・ｽ・ｽE

遖∵ｭ｢莠矩・・ｽ・ｽE

- DEBUG 繝輔Λ繧ｰ OFF 譎ゅ↓繧ょ､ｧ驥擾ｿｽE繝ｭ繧ｰ繧抵ｿｽE縺礼ｶ壹￠繧九％縺ｨ
- 蛟倶ｺｺ諠・・ｽ・ｽ縺ｪ縺ｩ 3DSS 螟夜Κ縺ｮ繝・・ｽE繧ｿ繧貞享謇九↓繝ｭ繧ｰ縺ｸ譖ｸ縺崎ｾｼ繧縺薙→


## 6.4 繧ｨ繝ｩ繝ｼ蜃ｦ逅・・ｽ・ｽ繝ｦ繝ｼ繧ｶ繝｡繝・・ｽ・ｽ繝ｼ繧ｸ

### 6.4.1 3DSS 繝ｭ繝ｼ繝会ｼ乗､懆ｨｼ繧ｨ繝ｩ繝ｼ

`bootstrapViewerFromUrl` 縺ｯ谺｡繧定｡後≧・ｽE・ｽE

1. `loadJSON(url)` 縺ｧ fetch
2. JSON parse
3. `ensureValidatorInitialized()`・ｽE・ｽEJV 縺ｫ繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繧ｭ繝ｼ繝槭ｒ隱ｭ縺ｿ霎ｼ繧・ｽE・ｽE
4. `validate3DSS(doc)` 縺ｧ strict validation
5. NG 縺ｮ蝣ｴ蜷茨ｿｽE謨ｴ蠖｢縺励◆ Error 繧・throw・ｽE・ｽEub 縺ｯ逕滂ｿｽE縺励↑縺・・ｽ・ｽE

繧ｨ繝ｩ繝ｼ遞ｮ蛻･・ｽE・ｽEev 陦ｨ遉ｺ逕ｨ・ｽE・ｽ・・

- `NETWORK_ERROR` 窶ｦ fetch 螟ｱ謨暦ｼ・04 / CORS / offline 遲会ｼ・
- `JSON_ERROR` 窶ｦ JSON parse 螟ｱ謨・
- `VALIDATION_ERROR` 窶ｦ strict validation NG

dev viewer 縺ｧ縺ｯ・ｽE・ｽE

- File 繝代ロ繝ｫ縺ｫ
  - `ERROR: <遞ｮ蛻･>` 縺ｨ繝｡繝・・ｽ・ｽ繝ｼ繧ｸ
  - `(no struct loaded)` 繧抵ｿｽE遉ｺ
- Model 繝代ロ繝ｫ縺ｫ
  - 隧ｳ邏ｰ・ｽE・ｽEalidation 縺ｮ `instancePath` / `message` 縺ｪ縺ｩ・ｽE・ｽ繧・`<pre>` 縺ｧ陦ｨ遉ｺ

譛ｬ逡ｪ viewer 縺ｧ縺ｯ・ｽE・ｽE

- 繝ｦ繝ｼ繧ｶ縺ｫ縺ｯ邁｡譏薙Γ繝・・ｽ・ｽ繝ｼ繧ｸ縺ｮ縺ｿ・ｽE・ｽ萓具ｼ啻"繝・・ｽE繧ｿ隱ｭ霎ｼ繧ｨ繝ｩ繝ｼ"`・ｽE・ｽE
- 隧ｳ邏ｰ縺ｯ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ・ｽE・ｽ・ｽE繧ｹ繝茨ｿｽE繝ｭ繧ｮ繝ｳ繧ｰ縺ｧ謇ｱ縺・
- 縺・・ｽ・ｽ繧鯉ｿｽE繧ｨ繝ｩ繝ｼ縺ｧ繧・**hub 繧堤函謌舌○縺・* render loop 繧帝幕蟋九＠縺ｪ縺・


### 6.4.2 繝ｩ繝ｳ繧ｿ繧､繝繧ｨ繝ｩ繝ｼ

繝ｩ繝ｳ繧ｿ繧､繝繧ｨ繝ｩ繝ｼ・ｽE・ｽ萓具ｼ嗄icroFX 蜀・・ｽ・ｽ null 蜿ゑｿｽE縺ｪ縺ｩ・ｽE・ｽ・ｽE・ｽE・ｽE

- 蜿ｯ閭ｽ縺ｪ髯舌ｊ try/catch 縺ｧ謠｡繧翫▽縺､縲・
  - `console.warn` / `console.error` 縺ｫ險倬鹸
- viewer 蜈ｨ菴難ｿｽE繧ｯ繝ｩ繝・・ｽ・ｽ繝･繧帝∩縺代ｋ譁ｹ蜷代〒繝上Φ繝峨Μ繝ｳ繧ｰ縺吶ｋ

縺溘□縺励√き繝｡繝ｩ繧・frame 謫堺ｽ懊′螳鯉ｿｽE縺ｫ荳搾ｿｽE縺ｫ縺ｪ繧九ｈ縺・・ｽ・ｽ閾ｴ蜻ｽ逧・・ｽ・ｽ繝ｩ繝ｼ縺ｯ縲・ 
繝ｦ繝ｼ繧ｶ UI 縺ｫ繧らｰ｡譏薙↑繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ・ｽE・ｽ繝医・繧ｹ繝育ｭ会ｼ峨ｒ蜃ｺ縺励※繧医＞縲・


## 6.5 runtime API 縺ｨ螟夜Κ騾｣謳ｺ・ｽE・ｽEublic surface・ｽE・ｽE

viewer 縺ｮ螟夜Κ蜈ｬ髢矩擇・ｽE・ｽEublic surface・ｽE・ｽ・ｽE谺｡縺ｮ 2 縺､縺ｧ讒具ｿｽE縺輔ｌ繧具ｼ・

1. **runtime entry・ｽE・ｽ蠢・・ｽ・ｽ・ｽE豁｣隕擾ｼ・*
   - `bootstrapViewer(canvasOrId, threeDSS, options?) 竊・hub`
   - `bootstrapViewerFromUrl(canvasOrId, url, options?) 竊・Promise<hub>`
   - 霑斐ｋ `hub` 縺ｮ `hub.core.*` 縺悟､夜Κ謫堺ｽ懶ｿｽE蜚ｯ荳縺ｮ蜈･蜿｣縺ｧ縺ゅｋ

2. **viewerCore・ｽE・ｽ莉ｻ諢擾ｿｽE繝帙せ繝亥髄縺題埋縺・・ｽ・ｽ繝・・ｽ・ｽ・ｽE・ｽE*
   - 譛ｬ逡ｪ繝帙せ繝茨ｼ・stro 遲会ｼ峨〒菴ｿ縺・・ｽ・ｽ縺吶￥縺吶ｋ縺溘ａ縺ｮ *阮・・ｽ・ｽ繝輔ぃ繧ｵ繝ｼ繝・ 縺ｨ縺励※謠蝉ｾ帙＠縺ｦ繧医＞
   - viewerCore 縺ｯ蜀・・ｽ・ｽ縺ｧ蠢・・ｽ・ｽ `bootstrapViewer*` 繧貞他縺ｳ縲”ub 繧剃ｿ晄戟縺励※蟋碑ｭｲ縺吶ｋ縺縺代↓縺吶ｋ
   - viewerCore 繧剃ｽｿ縺・・ｽ・ｽ縺ｩ縺・・ｽ・ｽ縺ｯ繝帙せ繝茨ｿｽE蜷茨ｼ亥ｿ・・ｽ・ｽ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE

繝ｬ繧､繝､繝ｪ繝ｳ繧ｰ隕冗ｯ・・ｽ・ｽE

- Host 縺ｯ **bootstrapViewer* 繧ゅ＠縺擾ｿｽE viewerCore 縺ｮ縺ｩ縺｡繧峨°**繧抵ｿｽE蜿｣縺ｫ縺吶ｋ
- Host 縺ｯ `runtime/core/*` / `runtime/renderer/*` 繧堤峩 import 縺励※縺ｯ縺ｪ繧峨↑縺・
- Host 縺ｯ three.js / Object3D 縺ｫ逶ｴ謗･隗ｦ繧後※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽ隗ｦ縺｣縺ｦ縺医∴縺ｮ縺ｯ hub 縺ｮ API 縺縺托ｼ・

險ｱ蜿ｯ縺輔ｌ繧区桃菴懶ｼ・ub.core.* 邨檎罰・ｽE・ｽ・・

- frame / filter / mode / selection / camera / runtime 繝輔Λ繧ｰ縺ｮ get / set / step
- pick・ｽE・ｽEhub.pickObjectAt`・ｽE・ｽ縺ｫ繧医ｋ UUID 蜿門ｾ・
- ・ｽE・ｽ蟆・・ｽ・ｽ・ｽE・ｽ繧､繝吶Φ繝郁ｳｼ隱ｭ・ｽE・ｽ`onFrameChanged`, `onSelectionChanged` 遲・

遖∵ｭ｢縺輔ｌ繧区桃菴懶ｼ・

- 3DSS document 縺ｮ譖ｸ縺肴鋤縺・
- exporter / 菫晏ｭ・/ 3DSS 縺ｸ縺ｮ譖ｸ縺肴綾縺・
- viewer 蜀・・ｽ・ｽ縺ｮ three.js / Object3D 縺ｸ縺ｮ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ

### 6.5.1 API 繝ｬ繧､繝､繝ｪ繝ｳ繧ｰ

- viewerCore・ｽE・ｽ螟夜Κ蜈ｬ髢具ｼ・
  - `createViewerCore(canvasOrId, options)` 縺ｪ縺ｩ繧帝壹§縲・
  - 蜀・・ｽ・ｽ縺ｧ `bootstrapViewerFromUrl` / `bootstrapViewer` 繧貞他縺ｳ縲・
  - `hub` 縺ｸ縺ｮ螳会ｿｽE縺ｪ繝輔ぃ繧ｵ繝ｼ繝峨ｒ謠蝉ｾ帙☆繧九・
- hub・ｽE・ｽ・ｽE驛ｨ・ｽE・ｽE
  - `hub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop` 繧呈戟縺､縲・
- core / renderer・ｽE・ｽ螳鯉ｿｽE蜀・・ｽ・ｽ・ｽE・ｽE
  - 螟夜Κ縺九ｉ逶ｴ謗･隗ｦ繧峨↑縺・・ｽ・ｽE

繝帙せ繝医い繝励Μ縺ｯ **蠢・・ｽ・ｽ viewerCore 邨檎罰** 縺ｧ viewer 繧呈桃菴懊☆繧九・ 
hub / core / renderer 繧堤峩 import 縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

### 6.5.2 險ｱ蜿ｯ縺輔ｌ繧区桃菴・

runtime API 繧帝壹§縺ｦ險ｱ蜿ｯ縺輔ｌ繧区桃菴懶ｿｽE・ｽE・ｽE

- frame / filter / mode / selection / camera / runtime 繝輔Λ繧ｰ縺ｫ髢｢縺吶ｋ
  - 隱ｭ縺ｿ蜿悶ｊ・ｽE・ｽEet 邉ｻ・ｽE・ｽE
  - 譖ｸ縺崎ｾｼ縺ｿ・ｽE・ｽEet / step / next / prev 邉ｻ・ｽE・ｽE
- pick・ｽE・ｽEpickObjectAt`・ｽE・ｽ縺ｫ繧医ｋ UUID 蜿門ｾ・
- 繧､繝吶Φ繝郁ｳｼ隱ｭ・ｽE・ｽ蟆・・ｽ・ｽ諡｡蠑ｵ・ｽE・ｽ・・
  - 萓具ｼ啻onFrameChanged`, `onSelectionChanged`

遖∵ｭ｢縺輔ｌ繧区桃菴懶ｿｽE・ｽE・ｽE

- 3DSS document 縺ｮ譖ｸ縺肴鋤縺・
- 3DSS 縺ｮ縲御ｿ晏ｭ倥阪ｄ縲後お繧ｯ繧ｹ繝晢ｿｽE繝医阪→縺励※縺ｮ蛻ｩ逕ｨ
- viewer 蜀・・ｽ・ｽ縺ｮ three.js / Object3D 縺ｸ縺ｮ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ


## 6.6 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ繝ｻ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝域ｩ滂ｿｽE・ｽE・ｽE-11・ｽE・ｽE

### 6.6.1 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ

viewer 譛ｬ菴難ｼ・untime / viewerCore / hub・ｽE・ｽ・ｽE縲・ 
**繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ逕滂ｿｽE API 繧呈署萓帙＠縺ｦ縺ｯ縺ｪ繧峨↑縺・*縲・

- `toDataURL` / `toBlob` 縺ｪ縺ｩ縺ｧ canvas 縺九ｉ逕ｻ蜒上ｒ蜿悶ｋ陦檎ぜ縺ｯ縲・
  - 繝帙せ繝医い繝励Μ・ｽE・ｽETML / Astro・ｽE・ｽ・ｽE雋ｬ蜍吶→縺吶ｋ縲・
- viewer 縺檎峡閾ｪ縺ｮ縲後せ繧ｯ繧ｷ繝ｧ繝懊ち繝ｳ縲阪ｒ謖√■縲・ 
  蜀・・ｽ・ｽ縺ｧ逕ｻ蜒冗函謌撰ｿｽE繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨ｒ陦後≧縺薙→縺ｯ遖∵ｭ｢縲・

逅・・ｽ・ｽ・ｽE・ｽE

- viewer 縺ｯ縲梧ｧ矩縺ｮ髢ｲ隕ｧ繝ｻ菴馴ｨ薙阪↓迚ｹ蛹悶＠縲・ 
  逕ｻ蜒冗函謌舌ヤ繝ｼ繝ｫ蛹悶ｒ驕ｿ縺代ｋ縲・
- 蟆ら畑 API 繧定ｨｭ險医☆繧九→縲√Δ繝・・ｽ・ｽ縺斐→縺ｫ莉墓ｧ倥′閹ｨ繧会ｿｽE縺溘ａ縲・

### 6.6.2 讒矩繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝・

viewer 譛ｬ菴難ｿｽE谺｡縺ｮ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝域ｩ滂ｿｽE繧呈戟縺｣縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

- glTF / OBJ / FBX 遲・3D 繝｢繝・・ｽ・ｽ蠖｢蠑上∈縺ｮ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝・
- CSV / TSV 遲峨ユ繧ｭ繧ｹ繝亥ｽ｢蠑上∈縺ｮ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝・
- SVG / PDF / 逕ｻ蜒擾ｿｽE繧ｯ繝医Ν蠖｢蠑上∈縺ｮ繧ｨ繧ｯ繧ｹ繝晢ｿｽE繝・
- 縲檎樟蝨ｨ縺ｮ filter / selection / frame 迥ｶ諷九阪ｒ蜷ｫ繧薙□ 3DSS 縺ｸ縺ｮ譖ｸ縺肴綾縺・

3DSS 縺九ｉ莉門ｽ｢蠑上∈縺ｮ螟画鋤縺ｯ **modeler 繧・・ｽ・ｽ逕ｨ繝・・ｽE繝ｫ縺ｮ雋ｬ蜍・* 縺ｨ縺励・ 
viewer 縺ｯ read-only 縺ｮ縺ｾ縺ｾ菫昴▽縲・

### 6.6.3 萓句､厄ｼ夲ｿｽE繧ｹ繝茨ｿｽE繝ｦ繝ｼ繝・・ｽ・ｽ繝ｪ繝・・ｽ・ｽ

繝帙せ繝医い繝励Μ縺檎峡閾ｪ縺ｫ・ｽE・ｽE

- canvas 繧偵く繝｣繝励メ繝｣縺励※逕ｻ蜒上ム繧ｦ繝ｳ繝ｭ繝ｼ繝会ｿｽE繧ｿ繝ｳ繧定ｨｭ鄂ｮ
- API 縺九ｉ 3DSS 繧貞叙蠕励＠縺ｦ蛻･繝・・ｽE繝ｫ縺ｸ貂｡縺・

縺ｨ縺・・ｽ・ｽ縺溷ｮ溯｣・・ｽ・ｽ縺吶ｋ縺薙→縺ｯ險ｱ蜿ｯ縺輔ｌ繧九・ 
縺溘□縺励◎繧鯉ｿｽE viewer 莉墓ｧ假ｿｽE荳驛ｨ縺ｧ縺ｯ縺ｪ縺上・ 
繝帙せ繝亥崋譛会ｿｽE繝ｦ繝ｼ繝・・ｽ・ｽ繝ｪ繝・・ｽ・ｽ縺ｨ縺励※菴咲ｽｮ縺･縺代ｋ縲・


## 6.7 髢狗匱譎ゑｿｽE繝・・ｽ・ｽ繝茨ｿｽE繝・・ｽ・ｽ繝・・ｽ・ｽ謖・・ｽE・ｽE・ｽ髱櫁ｦ冗ｯ・・ｽ・ｽE

譛ｬ遽縺ｯ謗ｨ螂ｨ莠矩・・ｽ・ｽ縺ゅｊ縲∝ｿ・・ｽ・ｽ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE

### 6.7.1 譛菴朱剞遒ｺ隱阪☆縺ｹ縺阪Ν繝ｼ繝・

髢狗匱譎ゅ↓譛菴朱剞遒ｺ隱阪☆繧九∋縺埼・・ｽ・ｽ・ｽE・ｽE

- 襍ｷ蜍輔Ν繝ｼ繝・
  - viewer_dev.html 竊・viewerDevHarness 竊・bootstrapViewerFromUrl 竊・hub.start
- 蜈･蜉・
  - 繝槭え繧ｹ繝峨Λ繝・・ｽ・ｽ・ｽE・ｽorbit / pan / zoom
  - PageUp / PageDown・ｽE・ｽframe ﾂｱ1・ｽE・ｽElider / label 霑ｽ髫擾ｼ・
  - Esc・ｽE・ｽmode 蛻・・ｽ・ｽ・ｽE・ｽEUD pill / toast・ｽE・ｽE
  - Home・ｽE・ｽcamera reset・ｽE・ｽEizmo HOME 縺ｨ荳閾ｴ・ｽE・ｽE
- devBootLog
  - Model 繝代ロ繝ｫ縺ｫ BOOT / MODEL / CAMERA / LAYERS / FRAME 縺ｮ 5 陦後′荳ｦ縺ｶ縺薙→
- filter
  - points / lines / aux 縺ｮ ON/OFF 縺悟庄隕悶↓蜿肴丐縺輔ｌ繧九％縺ｨ
- selection / microFX
  - 繧ｯ繝ｪ繝・・ｽ・ｽ縺ｧ selection / focus UUID 縺梧峩譁ｰ縺輔ｌ縲・
  - microFX・ｽE・ｽExes / bounds / marker / glow / highlight・ｽE・ｽ縺梧Φ螳壹←縺翫ｊ蜃ｺ繧九％縺ｨ

### 6.7.2 DEBUG 繝輔Λ繧ｰ縺ｮ驕狗畑

- DEBUG_* 縺ｯ git commit 蜑阪↓ false 縺ｫ謌ｻ縺吶°縲・ 
  迺ｰ蠅・・ｽ・ｽ謨ｰ繧・・ｽ・ｽ繝ｫ繝峨ヵ繝ｩ繧ｰ縺ｧ蛻・・ｽ・ｽ譖ｿ縺医ｋ縲・
- 荳譎ら噪縺ｪ `console.log` / `debugger` 縺ｪ縺ｩ縺ｯ  
  繝ｭ繝ｼ繧ｫ繝ｫ讀懆ｨｼ蠕後↓蜑企勁縺励．EBUG 繝輔Λ繧ｰ莉倥″繝ｭ繧ｬ繝ｼ縺ｸ遘ｻ縺吶・


## 6.8 microFX 驕狗畑繝ｫ繝ｼ繝ｫ・ｽE・ｽ隧ｳ邏ｰ・ｽE・ｽE

譛ｬ遽縺ｯ縲・.4 遽縺ｧ霑ｰ縺ｹ縺・microFX 縺ｮ陬懆ｶｳ縺ｨ縺励※縲・ 
runtime_spec / 7.11 遽縺ｮ MicroFXPayload 繧定ｸ上∪縺医◆驕狗畑繝ｫ繝ｼ繝ｫ繧堤､ｺ縺吶・

### 6.8.1 microState・ｽE・ｽEicroFXPayload・ｽE・ｽ・ｽE蜑肴署

microState 縺ｯ豢ｾ逕溽憾諷九〒縺ゅｊ縲・*core 縺檎函謌撰ｿｽE譖ｴ譁ｰ繝ｻ隗｣髯､繧剃ｸ蜈・・ｽ・ｽ逅・*縺吶ｋ縲・

- microState 縺ｯ `uiState.microState` 縺ｫ縺ｮ縺ｿ菫晄戟縺吶ｋ
- 逕滂ｿｽE繝ｻ隗｣髯､縺ｮ豁｣隕上Ν繝ｼ繝茨ｿｽE **`core.recomputeVisibleSet()`** 縺ｨ縺吶ｋ
  ・ｽE・ｽEode / selection / visibleSet 謨ｴ蜷医→蜷梧凾縺ｫ譖ｴ譁ｰ縺吶ｋ・ｽE・ｽE

renderer 縺ｯ microState 繧定ｪｭ繧縺縺代〒縲∵嶌縺肴鋤縺医※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE


### 6.8.3 focus / selection / mode 縺ｨ縺ｮ髢｢菫ゑｼ・eso optional・ｽE・ｽE

- microFX 縺ｯ蟶ｸ縺ｫ mode 縺ｫ蠕灘ｱ槭☆繧具ｼ・

  - mode = macro 竊・`microState = null`・ｽE・ｽEicroFX OFF・ｽE・ｽE
  - mode = micro 竊・`microState != null`・ｽE・ｽ蠢・・ｽ・ｽ縺ｪ payload 繧定ｨ育ｮ暦ｼ・
  - mode = meso 竊・**optional**
    - v1 縺ｧ縺ｯ `meso` 繧・**macro 逶ｸ蠖難ｼ・icroFX 辟｡縺暦ｼ・*縺ｨ縺励※繧ゆｻ墓ｧ倬＆蜿阪〒縺ｯ縺ｪ縺・
    - meso 繧貞ｮ溯｣・・ｽ・ｽ繧句ｴ蜷茨ｿｽE縺ｿ `microState != null` 繧定ｨｱ蜿ｯ縺吶ｋ

- focusUuid 縺ｯ蜴溷援 `selection.uuid` 縺ｨ荳閾ｴ縺吶ｋ


### 6.8.4 microFX 縺ｮ ON/OFF

ON/OFF 縺ｯ core 縺ｮ雋ｬ蜍吶〒縺ゅｊ縲〉enderer 縺ｯ `microState === null` 縺九←縺・・ｽ・ｽ縺縺代〒蛻､譁ｭ縺吶ｋ縲・

- `microState === null`
  - microFX overlay 繧偵☆縺ｹ縺ｦ隗｣髯､縺励｜aseStyle 縺ｫ螳鯉ｿｽE蠕ｩ蜈・・ｽ・ｽ繧・
- `microState !== null`
  - focusUuid / relatedUuids / localBounds 遲峨↓蠕薙▲縺ｦ overlay 繧帝←逕ｨ縺吶ｋ

豕ｨ諢擾ｼ・
- microFX 縺ｮ隗｣髯､・ｽE・ｽ蠕ｩ蜈・・ｽE **蟶ｸ縺ｫ螳鯉ｿｽE蜿ｯ騾・*縺ｧ縺ゅｋ縺薙→・ｽE・ｽEaseStyle 縺ｮ菫晄戟縺悟ｿ・・ｽ・ｽ・・
- 隗｣髯､縺悟ｿ・・ｽ・ｽ縺ｪ繧ｿ繧､繝溘Φ繧ｰ・ｽE・ｽ萓具ｼ嗄acro 謌ｻ繧・/ selection 縺ｮ null 蛹厄ｼ会ｿｽE
  `core.recomputeVisibleSet()` 縺御ｿ晁ｨｼ縺吶ｋ

### 6.8.5 renderer 蜀・・ｽ・ｽ縺ｧ縺ｮ遖∵ｭ｢莠矩・

renderer / microFX 螳溯｣・・ｽ・ｽ陦後▲縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽ縺ｨ・ｽE・ｽE

- microState 繧呈嶌縺肴鋤縺医ｋ
- struct・ｽE・ｽEDSS・ｽE・ｽ繧貞盾・ｽE縺帙★縺ｫ迢ｬ閾ｪ縺ｮ縲梧э蜻ｳ縲阪ｒ豎ｺ繧√ｋ
  - 萓具ｼ啅UID 譛ｫ蟆ｾ縺ｮ險伜捷繧・・ｽ・ｽ蜑阪↓蠢懊§縺ｦ迚ｹ蛻･謇ｱ縺・・ｽ・ｽ繧・
- uiState.mode / selection 繧堤峩謗･譖ｸ縺肴鋤縺医ｋ
- 讒矩繝・・ｽE繧ｿ縺ｫ萓晏ｭ倥☆繧九ｈ縺・・ｽ・ｽ縲梧￡荵・・ｽ・ｽ縺ｪ陬懈ｭ｣縲阪ｒ蜀・・ｽ・ｽ縺ｫ繧ｭ繝｣繝・・ｽ・ｽ繝･縺吶ｋ

microFX 縺ｯ縺ゅ￥縺ｾ縺ｧ縲檎ｴ皮ｲ九↑隕冶ｦ壼柑譫懊Ξ繧､繝､縲阪〒縺ゅｊ縲・ 
讒矩繝・・ｽE繧ｿ繧・・ｽ・ｽ諷具ｿｽE遘ｻ繝ｭ繧ｸ繝・・ｽ・ｽ縺ｫ縺ｯ莉具ｿｽE縺励↑縺・・ｽ・ｽE


---

# 7 諡｡蠑ｵ繝ｻ莠呈鋤諤ｧ・ｽE・ｽEiewer・ｽE・ｽschema 縺ｮ螟牙喧縺ｸ縺ｮ霑ｽ蠕難ｼ・

## 7.1 viewer 縺ｮ諡｡蠑ｵ譁ｹ驥晢ｼ亥渕譛ｬ蜴溷援・ｽE・ｽE

viewer 縺ｯ 3DSS 縺ｫ蟇ｾ縺励※縲√▽縺ｭ縺ｫ谺｡縺ｮ蜴溷援繧貞ｮ医ｋ縲・

1. **讒矩繝・・ｽE繧ｿ縺ｯ邨ｶ蟇ｾ縺ｫ螟画峩縺励↑縺・・ｽ・ｽEtrict read-only・ｽE・ｽE*
   - `.3dss.json` 縺ｯ AJV 縺ｫ繧医ｋ strict validation 繧帝夐℃縺励◆蠕後・
     `core.data` / `core.document3dss` 縺ｨ縺励※ deep-freeze 縺輔ｌ繧九・
   - runtime / renderer / UI 縺ｮ縺・・ｽ・ｽ縺ｪ繧句ｱ､繧ゅ√％縺ｮ讒矩繧・mutate 縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

2. **繧ｹ繧ｭ繝ｼ繝樊ｺ匁侠繧呈怙蜆ｪ蜈医＠縲∝ｯ帛ｮｹ繝｢繝ｼ繝峨ｒ謖√◆縺ｪ縺・*
   - 謗｡逕ｨ荳ｭ縺ｮ `3DSS.schema.json` 縺ｫ蜷茨ｿｽE縺励↑縺・・ｽ・ｽ繧｡繧､繝ｫ縺ｯ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ縺ｨ縺吶ｋ縲・
   - `additionalProperties:false` 蜑肴署縺ｧ驕狗畑縺励∵悴遏･繝励Ο繝代ユ繧｣縺ｮ鮟呵ｪ搾ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽE

3. **窶懃炊隗｣縺ｯ縺励↑縺上※繧ゅｈ縺・・ｽ・ｽ縲∝｣翫＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE*
   - viewer 縺瑚｡ｨ遉ｺ繧・UI 縺ｫ菴ｿ繧上↑縺・・ｽ・ｽE・ｽ・ｽ縺ｧ縺ゅ▲縺ｦ繧ゅ∵ｧ矩縺ｨ縺励※縺ｯ縺晢ｿｽE縺ｾ縺ｾ菫晄戟縺吶ｋ縲・
   - 荳崎ｦ√→隕九↑縺励◆鬆・・ｽ・ｽ縺ｮ蜑企勁繝ｻ豁｣隕丞喧繝ｻ陬懷ｮ後↑縺ｩ縺ｯ荳蛻・・ｽ・ｽ繧上↑縺・・ｽ・ｽE
 ・ｽE・ｽ陬懆ｶｳ・ｽE・ｽ縺薙％縺ｧ縺・・ｽ・ｽ縲御ｿ晄戟縲阪→縺ｯ縲・*繧ｹ繧ｭ繝ｼ繝槭〒險ｱ蜿ｯ縺輔ｌ縺ｦ縺・・ｽ・ｽ繝輔ぅ繝ｼ繝ｫ繝・*繧・
 viewer 縺悟茜逕ｨ縺励↑縺上※繧らｴ譽・・ｽE豁｣隕丞喧縺励↑縺・・ｽ・ｽ縺ｨ縺・・ｽ・ｽ諢丞袖縺ｧ縺ゅｋ縲・
 繧ｹ繧ｭ繝ｼ繝槫､夜・・ｽ・ｽ縺ｯ strict validation 縺ｫ繧医ｊ隱ｭ霎ｼ諡貞凄縺吶ｋ縲・


4. **諡｡蠑ｵ縺ｮ菴吝慍縺ｯ UI・ｽE・ｽ謠冗判陬懷勧縺ｮ縺ｿ縺ｫ髯仙ｮ壹☆繧・*
   - microFX繝ｻHUD繝ｻgizmo 縺ｪ縺ｩ縲∫ｴ皮ｲ九↓謠冗判繝ｬ繧､繝､縺ｫ髢峨§縺滓ｩ滂ｿｽE縺ｮ縺ｿ霑ｽ蜉蜿ｯ閭ｽ縲・
   - 讒矩繝・・ｽE繧ｿ縺ｫ蠖ｱ髻ｿ縺吶ｋ諡｡蠑ｵ・ｽE・ｽ菫晏ｭ假ｿｽE邱ｨ髮・・ｽE繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ遲会ｼ会ｿｽE蜈ｨ縺ｦ遖∵ｭ｢縲・


## 7.2 繧ｹ繧ｭ繝ｼ繝橸ｿｽE蟆・・ｽ・ｽ諡｡蠑ｵ縺ｸ縺ｮ蟇ｾ蠢・

3DSS 繧ｹ繧ｭ繝ｼ繝橸ｿｽE SemVer・ｽE・ｽEMAJOR.MINOR.PATCH`・ｽE・ｽ縺ｫ蠕薙▲縺ｦ譖ｴ譁ｰ縺輔ｌ繧九・ 
viewer 縺ｯ **隱ｭ縺ｿ蜿悶ｊ蟆ら畑繧ｯ繝ｩ繧､繧｢繝ｳ繝・*縺ｨ縺励※縲√％繧後↓縺薙≧霑ｽ蠕薙☆繧九・

### 7.2.1 SemVer 縺ｨ validator

- 繧ｹ繧ｭ繝ｼ繝槭ヵ繧｡繧､繝ｫ縺ｯ蟶ｸ縺ｫ蜊倅ｸ縺ｮ `3DSS.schema.json` 繧・canonical 縺ｨ縺吶ｋ縲・
- viewer 縺ｯ襍ｷ蜍墓凾縺ｫ縺難ｿｽE schema 繧・AJV 縺ｸ隱ｭ縺ｿ霎ｼ縺ｿ縲《trict 繝｢繝ｼ繝峨〒 validator 繧呈ｧ具ｿｽE縺吶ｋ縲・
  - `removeAdditional = false`
  - `useDefaults = false`
  - `coerceTypes = false`
  - `allErrors = true`
  - `strict` 邉ｻ繧ｪ繝励す繝ｧ繝ｳ縺ｯ隴ｦ蜻翫〒縺ｯ縺ｪ縺上お繝ｩ繝ｼ縺ｨ縺励※謇ｱ縺・・ｽ・ｽE
- 蜈･蜉・`.3dss.json` 縺ｮ
  - `document_meta.version`・ｽE・ｽEDSS 繝峨く繝･繝｡繝ｳ繝茨ｿｽE繝撰ｿｽE繧ｸ繝ｧ繝ｳ・ｽE・ｽE
  - schema 蛛ｴ `$id` / `$defs` 遲・ 
  繧貞盾辣ｧ縺励・*major 繝撰ｿｽE繧ｸ繝ｧ繝ｳ縺・schema 縺ｨ荳閾ｴ縺励※縺・・ｽ・ｽ縺薙→**繧堤｢ｺ隱阪☆繧九・

### 7.2.2 minor / patch 縺ｧ縺ｮ霑ｽ蜉繝ｻ螟画峩

`MAJOR` 縺御ｸ閾ｴ縺励～MINOR/PATCH` 縺ｮ蟾ｮ蛻・・ｽ・ｽ schema 蛛ｴ縺ｧ蜷ｸ蜿主庄閭ｽ縺ｪ蝣ｴ蜷茨ｼ・

- viewer 縺梧眠縺励＞ schema 縺ｫ霑ｽ蠕捺ｸ医∩縺ｮ蝣ｴ蜷・
  - 譁ｰ隕擾ｿｽE繝ｭ繝代ユ繧｣繝ｻenum 蛟､繝ｻ$defs 縺ｪ縺ｩ縺ｯ縲∵ｧ矩縺ｨ縺励※縺晢ｿｽE縺ｾ縺ｾ deep-freeze 縺励※菫晄戟縺吶ｋ縲・
  - viewer 縺後∪縺諢丞袖繧堤炊隗｣縺励※縺・・ｽ・ｽ縺・・ｽ・ｽE・ｽ・ｽ縺ｯ
    - UI 縺ｫ蜃ｺ縺輔↑縺・・ｽ・ｽ繧ゅ＠縺上・縲罫aw JSON縲阪→縺励※陬懷勧陦ｨ遉ｺ縺吶ｋ縺ｫ逡吶ａ繧九・
    - 蛟､縺ｮ螟画鋤繧・・ｽ・ｽ螳鯉ｿｽE陦後ｏ縺ｪ縺・・ｽ・ｽE
- viewer 縺悟商縺・schema 縺ｮ縺ｾ縺ｾ縺ｮ蝣ｴ蜷・
  - `additionalProperties:false` 縺ｫ繧医ｊ譛ｪ遏･繝励Ο繝代ユ繧｣縺ｯ validation NG 縺ｨ縺ｪ繧九・
  - 縺難ｿｽE蝣ｴ蜷医」iewer 縺ｯ繝輔ぃ繧､繝ｫ蜈ｨ菴難ｿｽE隱ｭ縺ｿ霎ｼ縺ｿ繧呈拠蜷ｦ縺励・ 
    modeler 繧・schema 譖ｴ譁ｰ蛛ｴ縺ｮ蟇ｾ蠢懊ｒ蠕・・ｽ・ｽ縲・

窶ｻ縲悟商縺・viewer 縺梧眠縺励＞ schema 繧堤ｷｩ縺丞女縺托ｿｽE繧後ｋ縲肴嫌蜍包ｿｽE謗｡逕ｨ縺励↑縺・・ｽ・ｽE

### 7.2.3 major 繝撰ｿｽE繧ｸ繝ｧ繝ｳ縺ｮ髱樔ｺ呈鋤螟画峩

- **major 荳堺ｸ閾ｴ = 隱ｭ霎ｼ荳榊庄** 縺ｨ縺吶ｋ縲・
  - 萓具ｼ嘖chema `2.x` 縺ｫ蟇ｾ縺励※ `1.x` 縺ｮ繝輔ぃ繧､繝ｫ縲√ｂ縺励￥縺ｯ縺晢ｿｽE騾・・ｽ・ｽE
- viewer 縺瑚｡後▲縺ｦ繧医＞縺ｮ縺ｯ縲」alidation 繧ｨ繝ｩ繝ｼ縺ｨ縺励※蝣ｱ蜻翫☆繧九→縺薙ｍ縺ｾ縺ｧ縲・
- **繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝ｻ閾ｪ蜍募､画鋤繝ｻ謗ｨ貂ｬ陬懷ｮ・*縺ｯ荳蛻・・ｽ・ｽ豁｢縲・
  - 驕主悉 竊・迴ｾ陦後∵悴譚･ 竊・迴ｾ陦・縺・・ｽ・ｽ繧鯉ｿｽE譁ｹ蜷代ｂ蜷梧ｧ倥・
- 縲悟ｯ帛ｮｹ繝｢繝ｼ繝峨阪鯉ｿｽE蜍輔い繝・・ｽE繧ｰ繝ｬ繝ｼ繝峨阪↑縺ｩ縺ｯ  
  modeler 繧・・ｽ・ｽ逕ｨ螟画鋤繝・・ｽE繝ｫ縺ｮ雋ｬ莉ｻ遽・・ｽ・ｽ縺ｨ縺吶ｋ縲・


## 7.3 aux.extension 縺ｮ謇ｱ縺・

`aux.extension` 縺ｯ縲∵ｧ矩繝・・ｽE繧ｿ蛛ｴ縺ｮ諡｡蠑ｵ逕ｨ繝輔ャ繧ｯ縺ｧ縺ゅｊ縲」iewer 縺ｯ谺｡縺ｮ繧医≧縺ｫ謇ｱ縺・・ｽ・ｽE

### 7.3.1 extension 縺ｮ蟄伜惠縺ｯ險ｱ螳ｹ縺吶ｋ

- internal state・ｽE・ｽEore.data・ｽE・ｽ縺ｫ縺ｯ **縺晢ｿｽE縺ｾ縺ｾ菫晄戟** 縺吶ｋ・ｽE・ｽEeep-freeze 蟇ｾ雎｡・ｽE・ｽ縲・
- viewer 縺檎炊隗｣縺ｧ縺阪ｋ譛蟆丞腰菴搾ｼ井ｾ具ｼ壻ｽ咲ｽｮ繝ｻ繝吶け繝医Ν繝ｻ濶ｲ縺ｪ縺ｩ・ｽE・ｽ・ｽE縺ｿ謠冗判縺ｫ蛻ｩ逕ｨ縺励※繧医＞縲・
- extension 蜀・・ｽE諢丞袖隲悶↓縺､縺・・ｽ・ｽ
  - 閾ｪ蜍戊｣懷ｮ鯉ｿｽE謗ｨ隲也函謌撰ｿｽE遖∵ｭ｢縲・
  - 縲瑚ｶｳ繧翫↑縺・・ｽ・ｽ蝣ｱ繧・AI 縺ｧ蝓九ａ繧九阪↑縺ｩ繧らｦ∵ｭ｢縲・

### 7.3.2 extension 蟆ら畑 UI 縺ｯ莉ｻ諢擾ｼ磯夢隕ｧ髯仙ｮ夲ｼ・

- 險ｱ縺輔ｌ繧具ｿｽE縺ｯ莉･荳具ｿｽE繧医≧縺ｪ **髢ｲ隕ｧ陬懷勧 UI** 縺ｫ髯舌ｉ繧後ｋ・ｽE・ｽE
  - extension 縺ｮ逕・JSON 繧定｡ｨ遉ｺ縺吶ｋ繧､繝ｳ繧ｹ繝壹け繧ｿ
  - extension 縺ｮ荳驛ｨ繝輔ぅ繝ｼ繝ｫ繝峨ｒ繝ｩ繝吶Ν繧・tooltip 縺ｫ陦ｨ遉ｺ
- extension 繧堤ｷｨ髮・・ｽE菫晏ｭ倥☆繧・UI・ｽE・ｽ霑ｽ蜉 / 蜑企勁 / 譖ｴ譁ｰ・ｽE・ｽ・ｽE viewer 縺九ｉ縺ｯ謠蝉ｾ帙＠縺ｪ縺・・ｽ・ｽE 
  縺薙ｌ繧会ｿｽE modeler 縺ｾ縺滂ｿｽE蛻･繝・・ｽE繝ｫ縺ｮ雋ｬ蜍吶→縺吶ｋ縲・


## 7.4 蜑肴婿莠呈鋤諤ｧ・ｽE・ｽ譛ｪ譚･繝撰ｿｽE繧ｸ繝ｧ繝ｳ・ｽE・ｽE

譛ｪ譚･縺ｮ schema 縺ｫ蜷医ｏ縺帙※菴懊ｉ繧後◆ `.3dss.json` 縺ｫ縺､縺・・ｽ・ｽ・ｽE・ｽE

- 迴ｾ蝨ｨ謗｡逕ｨ荳ｭ縺ｮ `3DSS.schema.json` 縺ｫ縺ｪ縺・・ｽ・ｽE・ｽ・ｽ 竊・`additionalProperties:false` 縺ｫ繧医ｊ NG縲・
- `$defs` 縺ｪ縺ｩ縺ｫ譛ｪ遏･縺ｮ螳夂ｾｩ縺悟性縺ｾ繧後※縺・・ｽ・ｽ繧ょ酔讒倥↓ NG縲・
- 縲梧悴譚･繝撰ｿｽE繧ｸ繝ｧ繝ｳ繧堤ｷｩ縺剰ｪｭ縺ｿ霎ｼ繧縲阪％縺ｨ縺ｯ縺励↑縺・・ｽ・ｽE

縺薙％縺ｧ縺・・ｽ・ｽ viewer 縺ｨ縺ｯ縲∵悽逡ｪ蛻ｩ逕ｨ繧呈Φ螳壹＠縺・`runtime/*`・ｽE・ｽEore / hub / renderer・ｽE・ｽ縺ｧ縺ゅｊ縲・ 
髢狗匱閠・・ｽ・ｽ縺托ｿｽE螳滄ｨ薙Ο繝ｼ繝繧・・ｽ・ｽ繝舌ャ繧ｬ・ｽE・ｽEev-only 繝・・ｽE繝ｫ・ｽE・ｽ・ｽE縺難ｿｽE髯舌ｊ縺ｧ縺ｯ縺ｪ縺・・ｽ・ｽE 
縺昴ｌ繧・dev 逕ｨ繝・・ｽE繝ｫ縺ｯ viewer 莉墓ｧ假ｿｽE蟇ｾ雎｡螟悶→縺吶ｋ縲・


## 7.5 蠕梧婿莠呈鋤諤ｧ・ｽE・ｽ驕主悉繝撰ｿｽE繧ｸ繝ｧ繝ｳ・ｽE・ｽE

蜿､縺・3DSS 繝輔ぃ繧､繝ｫ縺ｫ縺､縺・・ｽ・ｽ・ｽE・ｽE

- 蠢・・ｽ・ｽ鬆・・ｽ・ｽ荳崎ｶｳ 竊・`required` 縺ｧ NG・ｽE・ｽEiewer 縺瑚｣懷ｮ後＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽ縲・
- 蝙倶ｸ堺ｸ閾ｴ 竊・NG・ｽE・ｽ謨ｰ蛟､繧呈枚蟄暦ｿｽE縺ｨ縺励※邱ｩ蜥後☆繧九↑縺ｩ縺ｯ NG・ｽE・ｽ縲・
- 蜿､縺・・ｽ・ｽ騾 竊・NG・ｽE・ｽ莠呈鋤繝ｬ繧､繝､縺ｯ謖√◆縺ｪ縺・・ｽ・ｽ縲・
- viewer 縺檎峡閾ｪ縺ｫ譌ｧ繝撰ｿｽE繧ｸ繝ｧ繝ｳ繧貞､画鋤繝ｻ陬應ｿｮ縺吶ｋ縺薙→縺ｯ遖∵ｭ｢縲・

驕主悉繝撰ｿｽE繧ｸ繝ｧ繝ｳ縺九ｉ迴ｾ陦後ヰ繝ｼ繧ｸ繝ｧ繝ｳ縺ｸ縺ｮ遘ｻ陦鯉ｿｽE縲・ 
modeler / 蟆ら畑螟画鋤繧ｹ繧ｯ繝ｪ繝励ヨ / 莠ｺ髢難ｿｽE菴懈･ｭ遽・・ｽ・ｽ縺ｧ縺ゅｊ縲」iewer 縺ｮ蠖ｹ蜑ｲ螟悶→縺吶ｋ縲・


## 7.6 viewer 蛛ｴ縺ｮ險ｱ螳ｹ縺輔ｌ繧区僑蠑ｵ

viewer 縺梧僑蠑ｵ縺励※繧医＞縺ｮ縺ｯ **UI 繝ｬ繧､繝､縺ｨ謠冗判陬懷勧繝ｬ繧､繝､縺ｮ縺ｿ**縲・

### 險ｱ螳ｹ縺輔ｌ繧区僑蠑ｵ萓・

- 繝・・ｽE繝橸ｿｽE譖ｿ・ｽE・ｽ繝ｩ繧､繝・/ 繝繝ｼ繧ｯ縺ｪ縺ｩ・ｽE・ｽE
- HUD 隕∫ｴ
  - 霆ｸ繝ｻ繧ｰ繝ｪ繝・・ｽ・ｽ蠑ｷ隱ｿ
  - 蜃｡萓具ｿｽE繧ｹ繧ｱ繝ｼ繝ｫ繝撰ｿｽE
  - 繝｢繝ｼ繝会ｿｽE繝輔Ξ繝ｼ繝繝ｻ繝輔ぅ繝ｫ繧ｿ迥ｶ諷具ｿｽE陦ｨ遉ｺ
- 繧ｫ繝｡繝ｩ謫堺ｽ懶ｿｽE謾ｹ蝟・
  - ease 莉倥″ orbit / pan / zoom
  - 隕也せ繝励Μ繧ｻ繝・・ｽ・ｽ・ｽE・ｽEront / side / top / iso 遲会ｼ・
- microFX 邉ｻ縺ｮ隕冶ｦ夊｣懷勧
  - focus 蜻ｨ霎ｺ縺ｮ glow / bounds / axes 陦ｨ遉ｺ縺ｪ縺ｩ
- 陦ｨ遉ｺ譛驕ｩ蛹・
  - instancing / caching / LOD 縺ｪ縺ｩ縲∵ｧ矩荳榊､会ｿｽE遽・・ｽ・ｽ縺ｧ縺ｮ譛驕ｩ蛹・

縺・・ｽ・ｽ繧後ｂ **3DSS 縺ｮ讒矩・ｽE・ｽEoints / lines / aux / document_meta・ｽE・ｽ繧呈嶌縺肴鋤縺医↑縺・*  
縺ｨ縺・・ｽ・ｽ譚｡莉ｶ繧呈ｺ縺溘☆髯舌ｊ縲・ｿｽE逕ｱ縺ｫ諡｡蠑ｵ縺励※繧医＞縲・


## 7.7 遖∵ｭ｢縺輔ｌ繧区僑蠑ｵ

viewer 縺ｫ蟇ｾ縺励※縲∵ｬ｡縺ｮ繧医≧縺ｪ諡｡蠑ｵ繧定ｿｽ蜉縺励※縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

1. **讒矩繝・・ｽE繧ｿ縺ｮ邱ｨ髮・・ｽ・ｽ・ｽE**
   - 鬆・・ｽ・ｽ縺ｮ霑ｽ蜉繝ｻ譖ｴ譁ｰ繝ｻ蜑企勁
   - Undo / Redo
   - annotation / comment / note 縺ｪ縺ｩ邱ｨ髮・・ｽ・ｽ蠢ｵ
2. **讒矩繝・・ｽE繧ｿ縺ｮ菫ｮ蠕ｩ繝ｻ陬懷ｮ鯉ｿｽE繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ**
   - 谺謳榊､縺ｮ謗ｨ貂ｬ蝓九ａ
   - 譛ｪ譚･繧ｹ繧ｭ繝ｼ繝樣・・ｽ・ｽ縺ｮ謗ｨ貂ｬ逕滂ｿｽE
   - 縲計iewer 迢ｬ閾ｪ蠖｢蠑上阪∈縺ｮ菫晏ｭ・
3. **AI 陬懷ｮ鯉ｿｽE螟画鋤**
   - 諢丞袖隲悶↓蝓ｺ縺･縺擾ｿｽE蜍募､画鋤繝ｻ隕∫ｴ・・ｽE蜀搾ｿｽE鄂ｮ
   - extension 縺ｮ蜀・・ｽ・ｽ繧・AI 縺ｧ閾ｪ蜍戊｣懷ｮ・
4. **viewerSettings 縺ｮ豌ｸ邯壼喧**
   - viewerSettings 繧・JSON 縺ｨ縺励※菫晏ｭ倥＠縲・ｿｽE隱ｭ縺ｿ霎ｼ縺ｿ縺吶ｋ縺薙→・ｽE・ｽ隧ｳ邏ｰ縺ｯ 5.x 蜿ゑｿｽE・ｽE・ｽ縲・
   - v1 縺ｧ縺ｯ UI 迥ｶ諷具ｿｽE繧ｻ繝・・ｽ・ｽ繝ｧ繝ｳ蜀・・ｽE荳譎ら憾諷九↓髯仙ｮ壹☆繧九・
5. **繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ / export 讖滂ｿｽE縺ｮ蜀・・ｽ・ｽ**
   - glTF / SVG / CSV 縺ｪ縺ｩ縺ｸ縺ｮ讒矩 export 繧・viewer runtime 縺ｫ逶ｴ謗･謖√◆縺帙ｋ縺薙→縲・
   - Canvas 縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ蜿門ｾ・API 繧・viewer 縺ｮ豁｣蠑乗ｩ滂ｿｽE縺ｨ縺励※謠蝉ｾ帙☆繧九％縺ｨ縲・ 
     ・ｽE・ｽ蠢・・ｽ・ｽ縺ｪ繧・host 蛛ｴ縺後ヶ繝ｩ繧ｦ繧ｶ讓呎ｺ匁ｩ滂ｿｽE繧・・ｽ・ｽ驛ｨ繝・・ｽE繝ｫ縺ｧ蜿門ｾ励☆繧九ゑｼ・

縺薙ｌ繧会ｿｽE遖∵ｭ｢莠矩・・ｽ・ｽ縺励※譏守､ｺ縺励」iewer 縺ｯ **邏秘夢隕ｧ繧｢繝励Μ** 縺ｧ縺ゅｋ縺薙→繧剃ｿ晁ｨｼ縺吶ｋ縲・


## 7.8 莉墓ｧ伜､画峩譎ゑｿｽE viewer 蛛ｴ縺ｮ蟇ｾ蠢・

3DSS 繧ｹ繧ｭ繝ｼ繝槭ｄ viewer 莉墓ｧ倥′譖ｴ譁ｰ縺輔ｌ縺溷ｴ蜷医」iewer 縺瑚｡後≧縺ｹ縺榊ｯｾ蠢懶ｿｽE莉･荳九↓髯仙ｮ壹＆繧後ｋ縲・

1. **Validator 縺ｮ譖ｴ譁ｰ**
   - 謗｡逕ｨ縺吶ｋ `3DSS.schema.json` 繧貞ｷｮ縺玲崛縺医、JV 蛻晄悄蛹悶ｒ譖ｴ譁ｰ縺吶ｋ縲・
   - validation 繧ｨ繝ｩ繝ｼ縺ｮ繝ｭ繧ｰ繝ｻ繝｡繝・・ｽ・ｽ繝ｼ繧ｸ蠖｢蠑上ｒ蠢・・ｽ・ｽ縺ｫ蠢懊§縺ｦ隱ｿ謨ｴ縺吶ｋ縲・

2. **謠冗判繝ｭ繧ｸ繝・・ｽ・ｽ縺ｮ譛蟆城剞縺ｮ譖ｴ譁ｰ**
   - appearance / aux.module 縺ｪ縺ｩ縲《chema 諡｡蠑ｵ縺ｫ蠢懊§縺ｦ renderer 縺ｮ隗｣驥医ｒ諡｡蠑ｵ縺吶ｋ縲・
   - 譌｢蟄假ｿｽE讒矩隗｣驥医ｒ螢翫＆縺ｪ縺・・ｽ・ｽE・ｽ・ｽ縺ｧ縺ｮ縺ｿ螟画峩縺吶ｋ縲・

3. **UI 縺ｮ隱ｿ謨ｴ**
   - 譁ｰ縺励＞ module / signification / tags 縺ｪ縺ｩ繧偵ヵ繧｣繝ｫ繧ｿ繝ｻ蜃｡萓九↓霑ｽ蜉縺吶ｋ縲・
   - 荳崎ｦ√↓縺ｪ縺｣縺・UI 隕∫ｴ繧貞炎髯､縺吶ｋ縲・

4. **讒矩繝・・ｽE繧ｿ縺ｸ縺ｮ譖ｸ縺肴綾縺暦ｿｽE遖∵ｭ｢**
   - 莉墓ｧ伜､画峩繧堤炊逕ｱ縺ｫ viewer 蛛ｴ縺鯉ｿｽE蜍募､画鋤繧定｡後＞縲・ 
     譁ｰ縺励＞ .3dss.json 繧呈嶌縺搾ｿｽE縺吶％縺ｨ縺ｯ陦後ｏ縺ｪ縺・・ｽ・ｽE


## 7.9 諡｡蠑ｵ繝ｻ莠呈鋤諤ｧ縺ｫ髢｢縺吶ｋ遖∵ｭ｢莠矩・・ｽ・ｽ邨ｱ蜷茨ｼ・

譛ｬ遶縺ｮ蜀・・ｽ・ｽ繧偵∪縺ｨ繧√ｋ縺ｨ縲」iewer 縺ｯ谺｡繧偵＠縺ｦ縺ｯ縺ｪ繧峨↑縺・・ｽ・ｽE

1. 謗｡逕ｨ荳ｭ縺ｮ `3DSS.schema.json` 縺ｫ螳夂ｾｩ縺輔ｌ縺ｦ縺・・ｽ・ｽ縺・・ｽ・ｽE・ｽ・ｽ・ｽE・ｽ繧ｹ繧ｭ繝ｼ繝槫､夜・・ｽ・ｽ・ｽE・ｽ・ｽE隱ｭ霎ｼ繝ｻ菫晄戟繝ｻ隗｣驥医・
2. major 荳堺ｸ閾ｴ縺ｮ 3DSS 繝輔ぃ繧､繝ｫ繧偵悟ｯ帛ｮｹ繝｢繝ｼ繝峨阪〒隱ｭ縺ｿ霎ｼ繧縺薙→縲・
3. 讒矩繝・・ｽE繧ｿ縺ｮ菫ｮ蠕ｩ繝ｻ閾ｪ蜍戊｣懷ｮ鯉ｿｽE繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縲・
4. AI 縺ｫ繧医ｋ讒矩謗ｨ貂ｬ繝ｻ霑ｽ蜉鬆・・ｽ・ｽ縺ｮ逕滂ｿｽE縲・
5. 邱ｨ髮・UI・ｽE・ｽEdd / update / remove / undo / redo・ｽE・ｽ・ｽE蟆趣ｿｽE縲・
6. viewerSettings 繧呈ｰｸ邯壼喧縺励∵ｬ｡蝗櫁ｵｷ蜍墓凾縺ｫ閾ｪ蜍募ｾｩ蜈・・ｽ・ｽ繧九％縺ｨ縲・
7. extension 縺ｮ諢丞袖隗｣驥茨ｿｽE讒矩逕滂ｿｽE繝ｻ陬懷ｮ鯉ｼ域ｧ矩螟画峩縺ｫ逶ｸ蠖薙☆繧九ｂ縺ｮ・ｽE・ｽ縲・
8. 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・・ｽ・ｽ / export 繧・viewer runtime 縺ｮ雋ｬ蜍吶→縺励※蜀・・ｽ・ｽ縺吶ｋ縺薙→縲・

縺薙ｌ繧峨ｒ遖√§繧九％縺ｨ縺ｧ縲」iewer 縺ｯ **縲茎trict 縺九▽髱樒ｴ螢翫↑髢ｲ隕ｧ蟆ら畑繧ｯ繝ｩ繧､繧｢繝ｳ繝医・* 縺ｨ縺励※
髟ｷ譛溽噪縺ｪ莠呈鋤諤ｧ繧堤ｶｭ謖√☆繧九・


## 7.10 Frame UI 謫堺ｽ懶ｿｽE繝ｪ繧ｷ繝ｼ・ｽE・ｽ繝輔Ξ繝ｼ繝謫堺ｽ懆ｦ冗ｯ・・ｽ・ｽE

### 7.10.1 蝓ｺ譛ｬ譁ｹ驥・

- frame 縺ｯ荳谺｡蜈・・ｽE謨ｴ謨ｰ ID 縺ｧ邂｡逅・・ｽ・ｽ繧具ｼ・frameId: number`・ｽE・ｽ縲・
- `frame.range = {min, max}` 繧呈ｺ縺溘☆ `min 竕､ frameId 竕､ max` 縺ｮ髮｢謨｣蛟､縺ｮ縺ｿ繧呈桶縺・・ｽ・ｽE
- viewer 繧ｳ繧｢・ｽE・ｽEcore.frameController`・ｽE・ｽ・ｽE **髮｢謨｣繧ｹ繝・・ｽ・ｽ繝・* 縺ｨ縺励※ frame 繧堤ｮ｡逅・・ｽ・ｽ縲・ 
  騾｣邯壼､繧・・ｽ・ｽ髢薙・謇ｱ繧上↑縺・・ｽ・ｽE
- frame 蛻・・ｽ・ｽ縺ｮ雋ｬ蜍呻ｿｽE
  - 蜈･蜉帶桃菴・竊・`activeFrameId` 譖ｴ譁ｰ
  - 縺昴ｌ縺ｫ莨ｴ縺・`visibleSet` 蜀崎ｨ育ｮ・ 
  縺ｫ髯仙ｮ壹＠縲・D 繧ｿ繧､繝繝ｩ繧､繝ｳ UI 縺ｮ陦ｨ迴ｾ繧・・ｽ・ｽE・ｽ・ｽ縺ｯ UI 螻､縺ｫ蟋費ｿｽE繧九・

### 7.10.2 謫堺ｽ應ｽ鍋ｳｻ・ｽE・ｽﾂｱ1 繧ｹ繝・・ｽ・ｽ繝嶺ｸｭ蠢・・ｽ・ｽE

v1 縺ｮ蝓ｺ譛ｬ謫堺ｽ懶ｿｽE縲・*ﾂｱ1 繧ｹ繝・・ｽ・ｽ繝暦ｿｽE繝夲ｿｽE繧ｸ騾√ｊ** 繧剃ｸｭ蠢・・ｽ・ｽ險ｭ險医☆繧九・

- UI 繝懊ち繝ｳ
  - Step Back: `prev`
  - Step Forward: `next`
  - Rew/Home: `frame.set(range.min)`
  - FF: `frame.set(range.max)`
  - Play: 荳螳夐俣髫斐〒 `next`・ｽE・ｽ譛ｫ蟆ｾ蛻ｰ驕疲凾縺ｯ `range.min` 縺ｫ繝ｫ繝ｼ繝暦ｼ・
- 繧ｹ繝ｩ繧､繝
  - `range.min`縲彖range.max` 縺ｮ謨ｴ謨ｰ蛟､縺ｮ縺ｿ繧貞叙繧九・
  - `input` / `change` 繧､繝吶Φ繝医〒 `frame.set(value)` 繧貞他縺ｶ縲・
- 繧ｭ繝ｼ繝懶ｿｽE繝会ｼ域ｨ呎ｺ悶ワ繝ｳ繝峨Μ繝ｳ繧ｰ・ｽE・ｽE
  - `PageUp`: `next`
  - `PageDown`: `prev`
  - 縺薙ｌ繧会ｿｽE `KeyboardInput` 竊・`hub.core.frame.next`/`hub.core.frame.prev/` 邨檎罰縺ｧ蜃ｦ逅・・ｽ・ｽ縲・ 
    UI 繝擾ｿｽE繝阪せ蛛ｴ縺九ｉ逶ｴ謗･ frameController 繧定ｧｦ繧峨↑縺・・ｽ・ｽE

Space 竊・Play/Pause 繝医げ繝ｫ縺ｪ縺ｩ縲ゞI 蟆ら畑繧ｷ繝ｧ繝ｼ繝医き繝・・ｽ・ｽ縺ｯ  
viewerDevHarness 蛛ｴ縺ｧ縺ｮ縺ｿ螳溯｣・・ｽ・ｽ縺ｦ繧医＞・ｽE・ｽ譛ｬ逡ｪ viewer 縺ｧ縺ｯ莉ｻ諢擾ｼ峨・

### 7.10.3 mode / microFX 縺ｨ縺ｮ髢｢菫・

- 蜊倡匱縺ｮ frame 遘ｻ蜍包ｼ按ｱ1 step / slider・ｽE・ｽ・ｽE
  macro / meso / micro 縺・・ｽ・ｽ繧鯉ｿｽE mode 縺九ｉ繧ょｮ溯｡後＠縺ｦ繧医＞縲・

  - 縺溘□縺励’rame 螟画峩蠕鯉ｿｽE豢ｾ逕溽憾諷区峩譁ｰ縺ｯ **蠢・・ｽ・ｽ**
    `core.recomputeVisibleSet()` 縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧九・
    ・ｽE・ｽEisibleSet / selection謨ｴ蜷・/ microState 縺ｮ譖ｴ譁ｰ/隗｣髯､繧貞性繧・ｽE・ｽE

- **frame 蜀咲函・ｽE・ｽElay・ｽE・ｽ荳ｭ縺ｮ蛻ｶ邏・*
  - 蜀咲函髢句ｧ区凾縺ｫ `uiState.mode` 繧・`"macro"` 縺ｫ謌ｻ縺吶・
  - `uiState.runtime.isFramePlaying = true` 縺ｨ縺励［icroFX 繧堤┌蜉ｹ蛹悶☆繧九・
  - 蜀咲函荳ｭ縺ｯ `core.recomputeVisibleSet()` 縺・
    `uiState.microState = null` 繧剃ｿ晁ｨｼ縺吶ｋ縲・
  - 蜀咲函蛛懈ｭ｢譎ゅ↓ `isFramePlaying = false` 縺ｨ縺励∝ｿ・・ｽ・ｽ縺ｪ繧・
    `core.recomputeVisibleSet()` 縺ｧ microState 繧抵ｿｽE隧穂ｾ｡縺吶ｋ縲・

豕ｨ險假ｼ・
- v1 縺ｧ縺ｯ `meso` 縺ｯ **optional** 縺ｨ縺励∝ｮ溯｣・・ｽ・ｽ辟｡縺・・ｽ・ｽ蜷茨ｿｽE
  macro 逶ｸ蠖難ｼ・icroFX辟｡縺暦ｼ峨→縺励※謇ｱ縺｣縺ｦ繧医＞縲・


### 7.10.4 camera / filter 縺ｨ縺ｮ髢｢菫・

- frame 謫堺ｽ懶ｿｽE繧ｫ繝｡繝ｩ state 繧堤峩謗･螟画峩縺励↑縺・・ｽ・ｽ・ｽE蜍輔き繝｡繝ｩ縺ｯ蟆・・ｽ・ｽ諡｡蠑ｵ・ｽE・ｽ縲・
- filter・ｽE・ｽEoints/lines/aux・ｽE・ｽ螟画峩譎ゅ→蜷梧ｧ倥↓縲’rame 螟画峩蠕鯉ｿｽE
  - `visibleSet` 繧抵ｿｽE險育ｮ・
  - microFX / selection 繝上う繝ｩ繧､繝医ｒ蠢・・ｽ・ｽ縺ｫ蠢懊§縺ｦ蜀埼←逕ｨ  
  縺吶ｋ縺ｮ縺ｿ縺ｨ縺励∵ｧ矩繝・・ｽE繧ｿ縺ｫ縺ｯ莉具ｿｽE縺励↑縺・・ｽ・ｽE

### 7.10.5 髻ｳ螢ｰ繝昴Μ繧ｷ繝ｼ

viewer / modeler 縺ｨ繧ゅ↓ **UI 蜉ｹ譫憺浹縺ｯ謗｡逕ｨ縺励↑縺・*縲・

- 繧ｳ繝ｳ繝・・ｽ・ｽ繝・・ｽE・ｽE・ｽ蜍慕判繝ｻ3D 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ遲会ｼ峨′迢ｬ閾ｪ縺ｫ魑ｴ繧峨☆髻ｳ縺ｯ萓句､悶・
- viewer UI 縺ｮ謫堺ｽ懶ｼ・rame 遘ｻ蜍包ｿｽE蜀咲函繝懊ち繝ｳ繝ｻgizmo 遲会ｼ会ｿｽE螳鯉ｿｽE繧ｵ繧､繝ｬ繝ｳ繝医→縺吶ｋ縲・
- 險ｭ螳夂判髱｢縺ｫ繧ゅ郡ound縲阪郡FX縲阪↑縺ｩ縺ｮ鬆・・ｽ・ｽ縺ｯ霑ｽ蜉縺励↑縺・・ｽ・ｽE


## 7.11 microFX 窶・繝溘け繝ｭ隕冶ｦ夊｣懷勧繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝・ｽE・ｽEiewer 蟆ら畑・ｽE・ｽE

### 7.11.0 讎りｦ√→繝｢繧ｸ繝･繝ｼ繝ｫ讒矩

microFX 縺ｯ縲梧ｧ矩繝・・ｽE繧ｿ繧剃ｸ蛻・・ｽ・ｽ譖ｴ縺帙★縲［icro / meso 繝｢繝ｼ繝画凾縺ｮ螻謇讒矩繧・ 
隱ｭ縺ｿ蜿悶ｊ繧・・ｽ・ｽ縺上☆繧九◆繧・ｿｽE隕冶ｦ夊｣懷勧縲搾ｿｽE邱冗ｧｰ縺ｨ縺吶ｋ縲・

蜀・・ｽ・ｽ逧・・ｽ・ｽ縺ｯ谺｡縺ｮ 3 繝ｬ繧､繝､縺ｫ蛻・・ｽ・ｽ繧後ｋ縲・

1. **microState・ｽE・ｽEore.microController・ｽE・ｽE*
   - selection / cameraState / structIndex 縺ｪ縺ｩ縺九ｉ縲・
     繝輔か繝ｼ繧ｫ繧ｹ UUID繝ｻ蜴溽せ蠎ｧ讓呻ｿｽE螻謇繝舌え繝ｳ繝・・ｽ・ｽ繝ｳ繧ｰ縺ｪ縺ｩ繧定ｨ育ｮ励☆繧九・
   - three.js 縺ｮ Object3D 縺ｫ縺ｯ萓晏ｭ倥＠縺ｪ縺・・ｽ・ｽ繝峨Γ繧､繝ｳ螻､縲・
2. **microFX-core**
   - `visibleSet` 繧貞燕謠舌↓縲√ヵ繧ｩ繝ｼ繧ｫ繧ｹ蜴溽せ縺九ｉ縺ｮ霍晞屬繝ｻ謗･邯夐未菫ゅ↑縺ｩ繧定ｩ穂ｾ｡縺励・
     縲後←縺ｮ uuid 繧偵←縺ｮ遞句ｺｦ蠑ｷ隱ｿ / 貂幄｡ｰ縺吶ｋ縺九阪ｒ豎ｺ螳壹☆繧九・
   - opacity繝ｻcolor 縺ｪ縺ｩ縺ｸ縺ｮ蠖ｱ髻ｿ蠎ｦ・ｽE・ｽ菫よ焚・ｽE・ｽ繧堤ｮ暦ｿｽE縺吶ｋ縲・
3. **microFX-overlays・ｽE・ｽEenderer 蛛ｴ・ｽE・ｽE*
   - microState 縺ｨ microFX-core 縺ｮ邨先棡繧貞女縺大叙繧翫・
     three.js 繧ｷ繝ｼ繝ｳ蜀・・ｽ・ｽ glow / bounds / axes / highlight 縺ｪ縺ｩ縺ｮ  
     陬懷勧繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ霑ｽ蜉繝ｻ譖ｴ譁ｰ繝ｻ蜑企勁縺吶ｋ縲・

### 7.11.1 microState 縺ｮ蠖｢蠑・

microState 縺ｯ `MicroFXPayload` 縺ｨ蜻ｼ縺ｶ蜀・・ｽ・ｽ繧ｪ繝悶ず繧ｧ繧ｯ繝医〒縲∵ｦゑｿｽE谺｡縺ｮ蠖｢繧偵→繧九・

```ts
type MicroFXPayload = {
  focusUuid: string;                      // 繝輔か繝ｼ繧ｫ繧ｹ蟇ｾ雎｡縺ｮ UUID
  kind: "points" | "lines" | "aux" | null;
  focusPosition: [number, number, number];// 繝橸ｿｽE繧ｫ繝ｼ遲会ｿｽE蝓ｺ貅紋ｽ咲ｽｮ・ｽE・ｽEorld 蠎ｧ讓呻ｼ・
  relatedUuids: string[];                 // 1hop 謗･邯壹↑縺ｩ縲・・ｽ・ｽ騾｣ UUID 鄒､
  localBounds: {
    center: [number, number, number];
    size:   [number, number, number];
  } | null;
};
```

- `core.microController` 縺ｯ selection / structIndex / cameraState 繧偵ｂ縺ｨ縺ｫ  
  豈弱ヵ繝ｬ繝ｼ繝縺ｧ縺ｯ縺ｪ縺上∝ｿ・・ｽ・ｽ縺ｪ縺ｨ縺阪□縺・`MicroFXPayload | null` 繧呈峩譁ｰ縺吶ｋ縲・
- `uiState.microState` 縺ｫ縺難ｿｽE payload 縺御ｿ晄戟縺輔ｌ縲」iewerHub 竊・renderer 縺ｫ莨晞＃縺輔ｌ繧九・

### 7.11.2 驕ｩ逕ｨ譚｡莉ｶ・ｽE・ｽEode繝ｻ繝ｩ繝ｳ繧ｿ繧､繝迥ｶ諷具ｼ・

microFX 縺ｯ谺｡縺ｮ譚｡莉ｶ繧偵☆縺ｹ縺ｦ貅縺溘☆縺ｨ縺搾ｿｽE縺ｿ譛牙柑縺ｨ縺ｪ繧九・

1. `uiState.mode === "micro"`  
   - mode 縺ｮ螳夂ｾｩ繝ｻ驕ｷ遘ｻ譚｡莉ｶ縺ｯ隨ｬ 4.6 遽・ｽE・ｽ繧ｫ繝｡繝ｩ繝｢繝ｼ繝会ｼ峨ｒ蜿ゑｿｽE縲・
2. `uiState.viewerSettings.fx.micro.enabled === true`
3. `uiState.runtime.isFramePlaying === false`
4. `uiState.runtime.isCameraAuto === false`・ｽE・ｽ蟆・・ｽ・ｽ縺ｮ閾ｪ蜍輔き繝｡繝ｩ逕ｨ繝輔Λ繧ｰ・ｽE・ｽE

縺・・ｽ・ｽ繧後°縺梧ｺ縺溘＆繧後↑縺・・ｽ・ｽ蜷医〉enderer 縺ｯ

- `applyMicroFX(null)` 逶ｸ蠖難ｿｽE蜃ｦ逅・・ｽ・ｽ陦後＞縲・
- `visibleSet` 蜀・・ｽE蜈ｨ隕∫ｴ縺ｮ謠冗判螻樊ｧ繧・baseStyle・ｽE・ｽ讒矩縺ｫ蝓ｺ縺･縺上ョ繝輔か繝ｫ繝茨ｼ峨∈謌ｻ縺吶・

### 7.11.3 microFX-overlays・ｽE・ｽEarker / glow / axes / bounds / highlight・ｽE・ｽE

microFX-overlays 縺ｯ縲［icroState 繧抵ｿｽE縺ｫ three.js 繧ｷ繝ｼ繝ｳ蜀・・ｽ・ｽ霑ｽ蜉縺輔ｌ繧・ 
陬懷勧繧ｪ繝悶ず繧ｧ繧ｯ繝育ｾ､縺ｮ邱冗ｧｰ縺ｨ縺吶ｋ縲・

v1 縺ｧ縺ｯ谺｡縺ｮ繝｢繧ｸ繝･繝ｼ繝ｫ繧呈Φ螳壹☆繧九・

- **marker**
  - `focusPosition` 繧貞渕貅悶↓縲∝ｰ上＆縺ｪ繝橸ｿｽE繧ｫ繝ｼ・ｽE・ｽ繧｢繧､繧ｳ繝ｳ・ｽE・ｽ繧定｡ｨ遉ｺ縺吶ｋ縲・
- **glow**
  - 繝輔か繝ｼ繧ｫ繧ｹ隕∫ｴ縺ｮ蜻ｨ霎ｺ縺ｫ逅・・ｽ・ｽ / 繝√Η繝ｼ繝也憾縺ｮ繝上Ο繝ｼ繧帝㍾縺ｭ繧九・
- **axes**
  - microFocus 蜻ｨ霎ｺ縺ｫ螻謇蠎ｧ讓呵ｻｸ・ｽE・ｽE/Y/Z・ｽE・ｽ繧定｡ｨ遉ｺ縺吶ｋ縲・
- **bounds**
  - `localBounds` 縺ｫ蝓ｺ縺･縺丞ｱ謇 bounding box 繧定｡ｨ遉ｺ縺吶ｋ縲・
- **highlight**
  - 繝輔か繝ｼ繧ｫ繧ｹ隕∫ｴ縺ｫ豐ｿ縺｣縺溘が繝ｼ繝撰ｿｽE繝ｬ繧､邱壹ｒ謠冗判縺吶ｋ縲・

蜈ｱ騾壹Ν繝ｼ繝ｫ・ｽE・ｽE

- 縺・・ｽ・ｽ繧後ｂ struct・ｽE・ｽEDSS・ｽE・ｽ縺ｫ縺ｯ荳蛻・・ｽ・ｽ繧後★縲》hree.js 縺ｮ Object3D 霑ｽ蜉繝ｻ蜑企勁縺ｨ  
  material・ｽE・ｽEolor / opacity / transparent 遲会ｼ会ｿｽE螟画峩縺ｮ縺ｿ縺ｧ螳溯｣・・ｽ・ｽ繧九・
- macro 繝｢繝ｼ繝峨〒縺ｯ microFX-overlays 縺ｯ蟶ｸ縺ｫ辟｡蜉ｹ・ｽE・ｽE.11.7 蜿ゑｿｽE・ｽE・ｽ縲・

v1 縺ｧ縺ｯ **highlight 繧貞ｿ・・ｽ・ｽE* 縺ｨ縺励√◎縺ｮ莉厄ｿｽE繝｢繧ｸ繝･繝ｼ繝ｫ縺ｯ optional 縺ｨ縺吶ｋ縲・

### 7.11.4 霍晞屬繝輔ぉ繝ｼ繝峨→謗･邯壼ｼｷ隱ｿ

microFX-core 縺ｯ縲√ヵ繧ｩ繝ｼ繧ｫ繧ｹ蜴溽せ縺ｨ縺ｮ霍晞屬縺ｨ謗･邯夐未菫ゅ↓蝓ｺ縺･縺・ 
蜷・・ｽ・ｽ邏縺ｮ謠冗判蠑ｷ蠎ｦ繧呈ｱｺ繧√ｋ縲・

1. **霍晞屬繝輔ぉ繝ｼ繝・*
   - 莉ｻ諢剰ｦ∫ｴ `u` 縺ｫ蟇ｾ縺励√◎縺ｮ莉｣陦ｨ菴咲ｽｮ `p(u)` 縺ｨ `focusPosition` 縺ｨ縺ｮ霍晞屬 `d` 繧定ｨ育ｮ励☆繧九・
   - 霍晞屬 `d` 縺ｫ蝓ｺ縺･縺・・ｽ・ｽ 0縲・ 縺ｮ繝輔ぉ繝ｼ繝我ｿよ焚 `fade(d)` 繧貞ｮ夂ｾｩ縺吶ｋ縲・
   - 萓具ｼ・
     - `d 竕､ R1` 竊・`fade = 1.0`・ｽE・ｽ螳鯉ｿｽE荳埼擾ｿｽE・ｽE・ｽE
     - `d 竕･ R2` 竊・`fade = minOpacity`・ｽE・ｽ驕譁ｹ縺ｯ阮・・ｽ・ｽ・ｽE・ｽE
     - `R1 < d < R2` 竊・邱壼ｽ｢陬憺俣縲√ｂ縺励￥縺ｯ ease 莉倥″繧ｫ繝ｼ繝・

2. **謗･邯壼ｼｷ隱ｿ・ｽE・ｽE hop 蜻ｨ霎ｺ・ｽE・ｽE*
   - 繝輔か繝ｼ繧ｫ繧ｹ縺・point 縺ｮ蝣ｴ蜷茨ｼ・
     - 縺晢ｿｽE point 繧堤ｫｯ轤ｹ縺ｫ謖√▽ line 繧・1hop line 縺ｨ縺吶ｋ縲・
     - 縺昴ｌ繧会ｿｽE line 縺ｮ繧ゅ≧荳譁ｹ縺ｮ遶ｯ轤ｹ point 繧・1hop point 縺ｨ縺吶ｋ縲・
   - 繝輔か繝ｼ繧ｫ繧ｹ縺・line 縺ｮ蝣ｴ蜷茨ｼ・
     - 縺晢ｿｽE line 縺ｮ遶ｯ轤ｹ point 繧・1hop point 縺ｨ縺吶ｋ縲・
     - 縺薙ｌ繧峨→縺､縺ｪ縺後ｋ line 繧・1hop line 縺ｨ縺吶ｋ縲・
   - 1hop 隕∫ｴ縺ｯ霍晞屬繝輔ぉ繝ｼ繝峨↓蜉縺医※縲∝刈轤ｹ・ｽE・ｽ・ｽE繧九＆蠅励＠繝ｻ螟ｪ縺募｢励＠縺ｪ縺ｩ・ｽE・ｽ縺ｧ蠑ｷ隱ｿ縺励※繧医＞縲・

蜈ｷ菴鍋噪縺ｪ菫よ焚繧・・ｽ・ｽ繝ｼ繝厄ｿｽE `renderer/microFX/config.js` 縺ｫ髮・・ｽ・ｽE・ｽ・ｽ縲・ 
謨ｰ蛟､繝√Η繝ｼ繝九Φ繧ｰ縺ｯ縺晢ｿｽE繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧貞､画峩縺吶ｌ縺ｰ繧医＞險ｭ險医→縺吶ｋ縲・

### 7.11.5 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ縺ｨ繧ｹ繧ｳ繝ｼ繝・

- microFX 縺ｯ **蟶ｸ縺ｫ `visibleSet` 蜀・・ｽE隕∫ｴ縺ｮ縺ｿ** 繧貞ｯｾ雎｡縺ｨ縺吶ｋ縲・
  - 髱櫁｡ｨ遉ｺ隕∫ｴ縺ｫ蟇ｾ縺励※霍晞屬險育ｮ励ｄ overlay 繧定｡後ｏ縺ｪ縺・・ｽ・ｽE
- 螟ｧ隕乗ｨ｡繝・・ｽE繧ｿ縺ｫ蟇ｾ縺励※繧らｴ邯ｻ縺励↑縺・・ｽ・ｽ縺・・ｽ・ｽE
  - per-frame 縺ｧ縺ｮ螟ｧ驥・`new` 繧帝∩縺代ｋ・ｽE・ｽ・ｽE蛻暦ｿｽE蛻ｩ逕ｨ縺ｪ縺ｩ・ｽE・ｽ縲・
  - 繧ｪ繝ｼ繝撰ｿｽE繝ｬ繧､逕ｨ Object3D 縺ｮ蜀榊茜逕ｨ・ｽE・ｽEensure*` 繝代ち繝ｼ繝ｳ・ｽE・ｽ繧貞渕譛ｬ縺ｨ縺吶ｋ縲・
- frame / filter 螟画峩譎ゑｿｽE縺ｿ蜀崎ｩ穂ｾ｡縺励√き繝｡繝ｩ縺ｮ蠕ｮ蟆冗ｧｻ蜍輔＃縺ｨ縺ｫ  
  蜈ｨ菴薙ｒ蜀崎ｨ育ｮ励＠縺ｪ縺・・ｽ・ｽ縺・・ｽ・ｽ螳溯｣・・ｽ・ｽ縺ｦ繧医＞・ｽE・ｽ霑台ｼｼ縺ｮ遽・・ｽ・ｽ縺ｧ・ｽE・ｽ縲・

### 7.11.6 renderer 縺ｨ縺ｮ繧､繝ｳ繧ｿ繝輔ぉ繝ｼ繧ｹ

renderer 蛛ｴ縺ｮ microFX 髢｢騾｣ API 縺ｯ谺｡縺ｮ繧医≧縺ｪ譛蟆上う繝ｳ繧ｿ繝輔ぉ繝ｼ繧ｹ縺ｨ縺吶ｋ縲・

- `applyMicroFX(microState: MicroFXPayload | null): void`
  - `null` 縺ｮ蝣ｴ蜷茨ｼ夲ｿｽE繧ｪ繝ｼ繝撰ｿｽE繝ｬ繧､繧貞炎髯､縺励｜aseStyle 縺ｫ謌ｻ縺吶・
  - payload 縺後≠繧句ｴ蜷茨ｼ・
    - microFX-overlays 繧・`ensure*/update*/remove*` 縺ｧ譖ｴ譁ｰ縲・
    - 蟇ｾ雎｡隕∫ｴ縺ｮ material 繧偵ヵ繧ｧ繝ｼ繝我ｿよ焚縺ｫ蠢懊§縺ｦ螟画峩縲・
- renderer 縺ｯ microState 縺ｮ繝輔ぅ繝ｼ繝ｫ繝峨ｒ **隱ｭ縺ｿ蜿悶ｋ縺縺・* 縺ｧ繧医＞縲・ 
  struct 縺ｫ譖ｸ縺肴綾縺吶％縺ｨ繧・・ｽ・ｽmicroState 繧・mutate 縺吶ｋ縺薙→縺ｯ遖∵ｭ｢縲・

### 7.11.7 mode繝ｻ莉匁ｩ滂ｿｽE縺ｨ縺ｮ逶ｸ莠剃ｽ懃畑

- **macro 繝｢繝ｼ繝・*
  - microFX 縺ｯ蟶ｸ縺ｫ辟｡蜉ｹ・ｽE・ｽEenderer 縺ｯ `applyMicroFX(null)` 縺ｮ迥ｶ諷九ｒ菫昴▽・ｽE・ｽ縲・
  - 螻謇蠑ｷ隱ｿ縺ｯ 7.12 遽縺ｮ selection 繝上う繝ｩ繧､繝医↓蟋費ｿｽE繧九・

- **meso 繝｢繝ｼ繝会ｼ・ptional・ｽE・ｽE*
  - v1 縺ｧ縺ｯ meso 縺ｯ **螳溯｣・・ｽ・ｽ縺ｪ縺上※繧医＞**縲・
  - 螳溯｣・・ｽ・ｽ縺ｪ縺・・ｽ・ｽ蜷医［eso 縺ｯ macro 縺ｨ蜷檎ｭ会ｿｽE隕九∴譁ｹ
    ・ｽE・ｽEicroFX 辟｡縺・/ `microState = null`・ｽE・ｽ縺ｧ蝠城｡後↑縺・・ｽ・ｽE
  - meso 繧貞ｮ溯｣・・ｽ・ｽ繧句ｴ蜷茨ｿｽE縺ｿ縲［eso 蟆ら畑縺ｮ microState 繧貞ｰ趣ｿｽE縺励※繧医＞縲・

- **frame 蜀咲函**
  - 蜀咲函髢句ｧ区凾縺ｫ `uiState.mode = "macro"` 縺ｨ縺励［icroState 繧偵け繝ｪ繧｢縺吶ｋ縲・
  - 蜀咲函荳ｭ縺ｫ microFX 縺鯉ｿｽE蠎ｦ譛牙柑蛹悶＆繧後↑縺・・ｽ・ｽ縺ｨ繧・
    `uiState.runtime.isFramePlaying` 縺ｨ `core.recomputeVisibleSet()` 縺ｧ菫晁ｨｼ縺吶ｋ縲・

- **filter 蛻・・ｽ・ｽ / frame 蛻・・ｽ・ｽ**
  - filter / frame 縺ｮ螟画峩蠕鯉ｿｽE縲∵ｴｾ逕溽憾諷区峩譁ｰ繧・**蠢・・ｽ・ｽ**
    `core.recomputeVisibleSet()` 縺ｫ髮・・ｽ・ｽE・ｽ・ｽ繧九・
  - renderer 縺ｯ縲梧ｸ｡縺輔ｌ縺・`visibleSet` 縺ｨ `microState`縲阪□縺代ｒ蜿肴丐縺励・
    閾ｪ蜑阪〒蜀崎ｨ育ｮ励＠縺ｪ縺・・ｽ・ｽE


## 7.12 Selection 繝上う繝ｩ繧､繝茨ｼ・acro 繝｢繝ｼ繝臥畑・ｽE・ｽE

### 7.12.1 逶ｮ逧・

selection 繝上う繝ｩ繧､繝茨ｿｽE縲・*macro 繝｢繝ｼ繝画凾縺ｫ縲檎樟蝨ｨ驕ｸ謚樔ｸｭ縺ｮ 1 隕∫ｴ縲阪ｒ譏守､ｺ縺吶ｋ**縺溘ａ縺ｮ  
霆ｽ驥上↑蠑ｷ隱ｿ陦ｨ迴ｾ縺ｨ縺吶ｋ縲・

- macro・ｽE・ｽ・ｽE菴謎ｿｯ迸ｰ・ｽE・ｽ縲後←繧後ｒ驕ｸ繧薙□縺九阪ｒ荳ｭ蠢・・ｽ・ｽ selection 繝上う繝ｩ繧､繝医ｒ菴ｿ縺・・ｽ・ｽE
- micro・ｽE・ｽmicroFX 繧剃ｸｭ蠢・・ｽ・ｽ縺励《election 繝上う繝ｩ繧､繝茨ｿｽE謚大宛縺吶ｋ縲・

縺難ｿｽE蠖ｹ蜑ｲ蛻・・ｽ・ｽ縺ｫ繧医ｊ縲∝酔縺・uuid 縺ｫ蟇ｾ縺励※  
縲稽acro 縺ｧ縺ｯ selection highlight縲阪稽icro 縺ｧ縺ｯ microFX縲阪→縺・・ｽ・ｽ  
蛻・・ｽ・ｽ繧翫ｄ縺吶＞謖吝虚縺ｫ邨ｱ荳縺吶ｋ縲・

### 7.12.2 驕ｩ逕ｨ譚｡莉ｶ

selection 繝上う繝ｩ繧､繝茨ｿｽE縲∵ｬ｡縺ｮ譚｡莉ｶ繧偵☆縺ｹ縺ｦ貅縺溘☆縺ｨ縺阪↓縺ｮ縺ｿ謠冗判縺輔ｌ繧九・

1. `uiState.mode === "macro"`
2. `uiState.selection` 縺・`{kind, uuid}` 縺ｧ縲～uuid` 縺碁撼 null
3. `uuid` 縺・`visibleSet` 縺ｫ蜷ｫ縺ｾ繧後※縺・・ｽ・ｽ

縺難ｿｽE譚｡莉ｶ繧呈ｺ縺溘＆縺ｪ縺・・ｽ・ｽ蜷医〉enderer 縺ｯ selection 繝上う繝ｩ繧､繝育畑繧ｪ繝ｼ繝撰ｿｽE繝ｬ繧､繧定ｧ｣髯､縺励・ 
baseStyle・ｽE・ｽ讒矩縺ｫ蝓ｺ縺･縺上ョ繝輔か繝ｫ繝茨ｼ会ｿｽE縺ｿ繧定｡ｨ遉ｺ縺吶ｋ縲・

### 7.12.3 蛻ｶ蠕｡繝輔Ο繝ｼ縺ｨ雋ｬ蜍呻ｿｽE諡・

- `core.selectionController`
  - selection 縺ｮ蜚ｯ荳縺ｮ豁｣隕上Ν繝ｼ繝医→縺吶ｋ縲・
  - `select(uuid)` / `clear()` / `get()` 繧呈署萓帙＠縲・
    `uiState.selection` 繧呈峩譁ｰ縺吶ｋ縲・
  - selection 縺・`visibleSet` 縺九ｉ螟悶ｌ縺溷ｴ蜷茨ｿｽE謨ｴ蜷茨ｼ・ull蛹也ｭ会ｼ峨ｂ
    `core.recomputeVisibleSet()` 縺御ｿ晁ｨｼ縺吶ｋ縲・

- `viewerHub`
  - render loop 縺ｮ tick 縺ｧ `uiState` 縺ｮ繧ｹ繝翫ャ繝励す繝ｧ繝・・ｽ・ｽ繧定ｪｭ縺ｿ蜿悶ｊ縲・
    谺｡繧偵％縺ｮ鬆・・ｽ・ｽ renderer 縺ｫ驕ｩ逕ｨ縺吶ｋ・ｽE・ｽE
    - `renderer.applyFrame(uiState.visibleSet)`
    - `renderer.applySelection(uiState.selection)`・ｽE・ｽEacro 縺ｮ縺ｿ譛牙柑譚｡莉ｶ縺ｯ renderer 蛛ｴ縺ｧ蛻､螳壹＠縺ｦ繧医＞・ｽE・ｽE
    - `renderer.applyMicroFX(uiState.microState)`
    - `renderer.updateCamera(uiState.cameraState)`
    - `renderer.render()`

- renderer
  - `applySelection({kind, uuid} | null)` 繧貞女縺代※
    macro 繝｢繝ｼ繝臥畑縺ｮ霆ｽ縺・・ｽ・ｽ隱ｿ・ｽE・ｽ荳頑嶌縺搾ｼ峨ｒ陦後≧縲・
  - `visibleSet` 縺ｫ蜷ｫ縺ｾ繧後↑縺・uuid 縺ｫ縺ｯ繝上う繝ｩ繧､繝医ｒ謠冗判縺励↑縺・・ｽ・ｽE
  - 隗｣髯､譎ゑｿｽE baseStyle 縺ｫ螳鯉ｿｽE蠕ｩ蜈・・ｽ・ｽ縺阪ｋ縺薙→・ｽE・ｽ蜿ｯ騾・・ｽ・ｽ繧剃ｿ晁ｨｼ縺吶ｋ縲・

### 7.12.4 microFX / mode 驕ｷ遘ｻ縺ｨ縺ｮ髢｢菫・

- **macro 竊・micro 縺ｸ縺ｮ驕ｷ遘ｻ**
  - `modeController.setMode("micro", uuid)` 縺ｫ繧医ｊ micro 繝｢繝ｼ繝峨∈蜈･繧九→縺阪・
    - `uiState.selection` 閾ｪ菴難ｿｽE菫晄戟縺励※繧医＞縺後・
    - 謠冗判荳奇ｿｽE selection 繝上う繝ｩ繧､繝茨ｿｽE辟｡蜉ｹ蛹悶☆繧具ｼ・clearAllHighlights()`・ｽE・ｽ縲・
  - 蜷後§ `uuid` 繧偵ヵ繧ｩ繝ｼ繧ｫ繧ｹ縺ｨ縺励◆ microFX・ｽE・ｽE.11・ｽE・ｽ縺梧怏蜉ｹ縺ｫ縺ｪ繧九・
- **micro 竊・macro 縺ｸ縺ｮ驕ｷ遘ｻ**
  - `modeController.setMode("macro")` 縺ｧ謌ｻ縺｣縺滓凾轤ｹ縺ｧ縲・
    - microFX 縺ｯ `applyMicroFX(null)` 縺ｫ繧医ｊ隗｣髯､縲・
    - `selectionController` 蛛ｴ縺ｧ縲∫樟蝨ｨ縺ｮ selection 繧貞渕縺ｫ  
      `setHighlight({kind, uuid})` 繧抵ｿｽE驕ｩ逕ｨ縺吶ｋ縲・
- **frame / filter 螟画峩譎・*
  - frame / filter 縺ｮ螟画峩縺ｧ selection 縺ｮ蟇ｾ雎｡縺碁撼陦ｨ遉ｺ縺ｫ縺ｪ縺｣縺溷ｴ蜷医・
    - selection 繧堤ｶｭ謖√☆繧九°縺ｩ縺・・ｽ・ｽ縺ｯ `selectionController` 縺ｮ繝昴Μ繧ｷ繝ｼ縺ｨ縺吶ｋ縲・
    - 縺・・ｽ・ｽ繧後↓縺帙ｈ縲～visibleSet` 縺ｫ蜷ｫ縺ｾ繧後↑縺・・ｽ・ｽ邏縺ｸ縺ｮ highlight 縺ｯ謠冗判縺励↑縺・・ｽ・ｽE

### 7.12.5 莉墓ｧ倅ｸ奇ｿｽE菴咲ｽｮ縺･縺・

- selection 繝上う繝ｩ繧､繝茨ｿｽE **縲稽acro 繝｢繝ｼ繝臥畑縺ｮ譛菴朱剞縺ｮ螻謇蠑ｷ隱ｿ縲・* 縺ｨ菴咲ｽｮ縺･縺代ｋ縲・
- microFX 縺ｯ 7.11 縺ｮ縺ｨ縺翫ｊ縲［icro 繝｢繝ｼ繝峨↓縺翫￠繧玖ｩｳ邏ｰ縺ｪ螻謇隱ｭ隗｣縺ｮ縺溘ａ縺ｮ  
  隕冶ｦ夊｣懷勧縺ｧ縺ゅｊ縲∽ｸ｡閠・・ｽE遶ｶ蜷医○縺夊｣懷ｮ後＠蜷医≧繧医≧縺ｫ險ｭ險医☆繧九・
- 縺ｩ縺｡繧会ｿｽE讖滓ｧ九ｂ 3DSS 讒矩縺ｯ荳蛻・・ｽ・ｽ譖ｴ縺帙★縲∵緒逕ｻ螻樊ｧ縺ｨ overlay 縺ｫ縺ｮ縺ｿ菴懃畑縺吶ｋ縲・
