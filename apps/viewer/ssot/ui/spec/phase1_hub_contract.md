# A) Public entrypoints（bootstrapViewer.js）
- bootstrapViewerFromUrl(canvasOrId, url, options?) -> Promise<ViewerHub>
- bootstrapViewer(canvasOrId, doc3dssValidated, options?) -> ViewerHub
- 禁止：Host が runtime 配下の他モジュールを直接 import しない

# B) ViewerHub contract（viewerHub.js）
最低限 “壊さない” と決めるのはここ：
- hub.start() / hub.stop() / hub.pickObjectAt()
- hub.viewerSettings.*（worldAxes / lineWidthMode / microFXProfile）
- hub.core.frame.*
- hub.core.selection.*
- hub.core.camera.*
- hub.core.mode.*
- hub.core.micro.*
- hub.core.filters.*
- hub.core.runtime.*
- hub.core.recomputeVisibleSet()

（必要なら read-only）hub.core.data / document_meta / documentCaption / structIndex / uiState