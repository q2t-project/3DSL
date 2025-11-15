// 3DSL 共通の簡易ロガー（あとから差し替え可能なシンプル実装）

const LEVELS = ["debug", "info", "warn", "error"];

let currentLevel = "info";

export function setLogLevel(level) {
  if (LEVELS.includes(level)) {
    currentLevel = level;
  }
}

function shouldLog(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(currentLevel);
}

export function logDebug(...args) {
  if (shouldLog("debug")) console.debug("[3DSL]", ...args);
}

export function logInfo(...args) {
  if (shouldLog("info")) console.info("[3DSL]", ...args);
}

export function logWarn(...args) {
  if (shouldLog("warn")) console.warn("[3DSL]", ...args);
}

export function logError(...args) {
  if (shouldLog("error")) console.error("[3DSL]", ...args);
}
