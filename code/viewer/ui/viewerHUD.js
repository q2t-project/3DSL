const DEFAULT_FLASH_DURATION = 120;

const getGlobalDocument = () => {
  if (typeof document !== "undefined") {
    return document;
  }
  return null;
};

export class ViewerHUD {
  constructor(doc = getGlobalDocument()) {
    this.doc = doc ?? null;
    this.flashDuration = DEFAULT_FLASH_DURATION;
    this.#flashTimeout = null;
  }

  updateFrameIndicator(frameId) {
    const targetDoc = this.doc ?? getGlobalDocument();
    if (!targetDoc) {
      return;
    }
    const element = typeof targetDoc.getElementById === "function" ? targetDoc.getElementById("hud-frame") : null;
    if (!element) {
      return;
    }
    element.textContent = `Frame: ${frameId}`;
    element.classList.add("flash");
    if (this.#flashTimeout) {
      clearTimeout(this.#flashTimeout);
    }
    this.#flashTimeout = setTimeout(() => {
      element.classList.remove("flash");
      this.#flashTimeout = null;
    }, this.flashDuration);
  }

  dispose() {
    if (this.#flashTimeout) {
      clearTimeout(this.#flashTimeout);
      this.#flashTimeout = null;
    }
  }

  #flashTimeout;
}
