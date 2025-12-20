initFilterControls / initViewerSettingsControls / initModeHudLoop / initGizmoButtons / initWorldAxesToggle / initOrbitControls

これらを全部ここに移して、addEventListener は全部 {signal: ac.signal} で張る

requestAnimationFrame ループ（mode表示）は cancelAnimationFrame できるように rafId 管理

setTimeout（HUD toast）も timer 管理して detach で clearTimeout