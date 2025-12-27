// viewer/ui/orbitMapping.js

export const ORBIT_SENS = {
  theta: 0.01,
  phi: 0.01,
};

// dy は「下に動かすと +」→ phi にそのまま足す
export function mapDragToOrbitDelta(dx, dy, sens = ORBIT_SENS) {
  let ndx = Number(dx);
  let ndy = Number(dy);
  if (!Number.isFinite(ndx)) ndx = 0;
  if (!Number.isFinite(ndy)) ndy = 0;

  const dTheta = ndx * sens.theta;
  const dPhi = ndy * sens.phi;
  return { dTheta, dPhi };
}

// ★ 矢印キー → (dTheta, dPhi)
// 右: +theta / 左: -theta / 下: +phi / 上: -phi
export function mapArrowKeyToOrbitDelta(code, step) {
  let s = Number(step);
  if (!Number.isFinite(s)) s = 0;

  let dTheta = 0;
  let dPhi = 0;

  switch (code) {
    case "ArrowLeft":
      dTheta = -s;
      break;
    case "ArrowRight":
      dTheta = s;
      break;
    case "ArrowUp":
      dPhi = -s;
      break;
    case "ArrowDown":
      dPhi = s;
      break;
    default:
      break;
  }

  return { dTheta, dPhi };
}
