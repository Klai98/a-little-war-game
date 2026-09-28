import * as THREE from "three";
import { MAP_WIDTH, MAP_DEPTH } from "./terrain.js";
import { MAP_SCALE } from "../worldConstants.js";

// Total-War style oblique top-down camera: WASD/arrow pan, mouse wheel zoom.

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.target = new THREE.Vector3(MAP_WIDTH / 2, 0, MAP_DEPTH / 2 + 60);
    this.distance = 620 * MAP_SCALE;
    this.pitch = THREE.MathUtils.degToRad(-55);
    this.panSpeed = 420 * MAP_SCALE;
    this.zoomSpeed = 60 * MAP_SCALE;
    this.minDistance = 180 * MAP_SCALE;
    this.maxDistance = 1140 * MAP_SCALE;
    this.outwardTicksAtMax = 0;
    this.keys = new Set();

    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    domElement.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoomBy(e.deltaY);
      },
      { passive: false }
    );

    this._updateTransform();
  }

  zoomBy(deltaY) {
    const direction = deltaY > 0 ? 1 : -1;
    const wasAtMaximum = this.distance >= this.maxDistance;
    if (direction < 0) this.outwardTicksAtMax = 0;
    else if (wasAtMaximum) this.outwardTicksAtMax = Math.min(5, this.outwardTicksAtMax + 1);
    this.distance = THREE.MathUtils.clamp(
      this.distance + direction * this.zoomSpeed,
      this.minDistance,
      this.maxDistance
    );
    if (direction > 0 && !wasAtMaximum && this.distance >= this.maxDistance) this.outwardTicksAtMax = 0;
    this._updateTransform();
  }

  get isStrategicView() {
    return this.distance >= this.maxDistance && this.outwardTicksAtMax >= 5;
  }

  update(delta) {
    let mx = 0;
    let mz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) mz -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) mz += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.sqrt(mx * mx + mz * mz);
      this.target.x += (mx / len) * this.panSpeed * delta;
      this.target.z += (mz / len) * this.panSpeed * delta;
      this.target.x = THREE.MathUtils.clamp(this.target.x, 0, MAP_WIDTH);
      this.target.z = THREE.MathUtils.clamp(this.target.z, 0, MAP_DEPTH);
      this._updateTransform();
    }
  }

  _updateTransform() {
    const offsetY = Math.sin(-this.pitch) * this.distance;
    const offsetZ = Math.cos(-this.pitch) * this.distance;
    this.camera.position.set(this.target.x, offsetY, this.target.z + offsetZ);
    this.camera.lookAt(this.target);
  }
}
