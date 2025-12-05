// viewer/runtime/renderer/labels/labelLayer.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { createTextSprite } from "./textSprite.js";

/**
 * labelIndex の想定形:
 *   Map<string, {
 *     uuid: string,
 *     kind: "points" | "lines" | "aux",
 *     text: string,
 *     size: number,           // marker.text.size or デフォルト 8
 *     align: string,          // "center&middle" など（いまは未使用でもOK）
 *     plane: "xy"|"yz"|"zx"|"billboard", // 未指定は 'zx'。billboard はメタ用途で明示指定された時だけ使う
 *     frames: number | number[] | null,  // 表示 frame 情報
 *   }>
 */
export class labelabelLayer {
  constructor(scene, { renderOrder = 900 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "label-layer";
    this.group.renderOrder = renderOrder;

    scene.add(this.group);

    this.labels = new Map(); // uuid -> { sprite, entry }
    this.visibleSet = new Set();
    this.cameraState = null;
    this.pointObjects = null; // uuid -> THREE.Object3D （context 側から渡す）
  }

  /**
   * document / structIndex 同期のタイミングで呼ぶ
   * @param {Map<string, any>} labelIndex
   * @param {Map<string, THREE.Object3D>} pointObjects
   */
  sync(labelIndex, pointObjects) {
    this.pointObjects = pointObjects;

    // 既存のうち、今回も残る uuid をチェック
    const nextUuids = new Set(labelIndex ? labelIndex.keys() : []);

    // いらなくなった sprite を削除
    for (const [uuid, info] of this.labels.entries()) {
      if (!nextUuids.has(uuid)) {
        this.group.remove(info.sprite);
        if (info.sprite.material.map) {
          info.sprite.material.map.dispose();
        }
        info.sprite.material.dispose();
        this.labels.delete(uuid);
      }
    }

    if (!labelIndex) return;

    // 新しく必要なラベルを作成
    for (const [uuid, entry] of labelIndex.entries()) {
      if (this.labels.has(uuid)) {
        // entry の内容は更新しておく
        this.labels.get(uuid).entry = entry;
        continue;
      }

      // ひとまず points だけ対象（lines, aux は後で拡張）
      if (entry.kind !== "points") continue;

      const sprite = createTextSprite(entry.text, {
        fontSize: (entry.size || 8) * 1.5, // ちょい拡大しておく
        color: "#ffffff",
        padding: 2,
        bgColor: "rgba(0,0,0,0.6)",
      });

      sprite.name = `label:${uuid}`;

      this.group.add(sprite);
      this.labels.set(uuid, { sprite, entry });
    }
  }

  setVisibleSet(visibleSet) {
    this.visibleSet = visibleSet || new Set();
  }

  setCameraState(cameraState) {
    this.cameraState = cameraState;
  }

  /**
   * 毎フレーム呼ぶ。位置とスケールを更新。
   */
  update() {
    if (!this.pointObjects || !this.cameraState) return;

    const { target, distance, fov } = this.cameraState;
    const camDistance = Math.max(distance || 1, 0.1);
    const baseScale = camDistance * 0.04; // 距離に応じた基準サイズ

    for (const [uuid, { sprite, entry }] of this.labels.entries()) {
      const visible = this.visibleSet.has(uuid);
      sprite.visible = visible;
      if (!visible) continue;

      const pointObj = this.pointObjects.get(uuid);
      if (!pointObj) {
        sprite.visible = false;
        continue;
      }

      // ポイント位置（ワールド座標）
      sprite.position.copy(pointObj.position);

      // 少し上に持ち上げる（ラベルを点の上に）
      sprite.position.y += baseScale * 0.6;

      // plane === "billboard" のときだけ、メタ用途としてカメラ向き（インフォ系ラベルなど）
      // それ以外（xy/yz/zx）は軸の意味を優先し、その平面に貼るのを原則とする

      // スケールを距離ベースで調整（text.size も反映）
      const sizeFactor = (entry.size || 8) / 8;
      const scaleY = baseScale * sizeFactor;
      const aspect = sprite.scale.x / (sprite.scale.y || 1);
      sprite.scale.set(scaleY * aspect, scaleY, 1);
    }
  }

  dispose() {
    for (const { sprite } of this.labels.values()) {
      this.group.remove(sprite);
      if (sprite.material.map) sprite.material.map.dispose();
      sprite.material.dispose();
    }
    this.labels.clear();
    this.scene.remove(this.group);
  }
}
