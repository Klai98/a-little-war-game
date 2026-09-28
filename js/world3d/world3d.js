import * as THREE from "three";
import { buildTerrainMesh, getHeight } from "./terrain.js";
import { buildRiverMeshes } from "./rivers.js";
import { buildTrees } from "./trees.js";
import { buildCityTowers } from "./cityMarkers.js";
import { buildHistoricalMapLayer } from "./historicalMap.js";
import { buildMovementRangeMesh, isPositionInMovementRange } from "./pathfinding.js";
import { CameraRig } from "./cameraRig.js?v=mapzoom-five-ticks";
import { GameData } from "../gameData.js";
import { buildArmyGeneral, animateArmyGeneral } from "./armyGeneral.js";
import { MAP_SCALE } from "../worldConstants.js";

// Assembles the 3D scene (terrain, rivers, trees, city towers, camera, lights)
// and exposes helpers for the 2D UI overlay to project world positions to screen space.

export class World3D {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8cb8d9);
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(50, 1, 1, 4500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(800, 600, 500);
    this.scene.add(sun);

    this.terrainMesh = buildTerrainMesh();
    this.scene.add(this.terrainMesh);
    this.riverMeshes = buildRiverMeshes();
    this.scene.add(this.riverMeshes);
    this.scene.add(buildTrees());
    this.historicalMapLayer = buildHistoricalMapLayer();
    this.scene.add(this.historicalMapLayer);

    this.citiesGroup = buildCityTowers();
    this.scene.add(this.citiesGroup);
    this.movementRangeMesh = null;
    this.armyModels = new Map();
    this.armyModelsGroup = new THREE.Group();
    this.routeGroup = new THREE.Group();
    this.scene.add(this.armyModelsGroup, this.routeGroup);
    this.refreshArmyRoutes();

    this.cameraRig = new CameraRig(this.camera, this.renderer.domElement);

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  // Rebuilds all city towers/farm patches/soldier tokens - call after a level-up,
  // building construction, or ownership change so the 3D visuals stay in sync.
  refreshCities() {
    this.scene.remove(this.citiesGroup);
    this.citiesGroup.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    this.citiesGroup = buildCityTowers();
    this.scene.add(this.citiesGroup);
  }

  setMovementRange(army) {
    if (this.movementRangeMesh) {
      this.scene.remove(this.movementRangeMesh);
      this.movementRangeMesh.geometry.dispose();
      this.movementRangeMesh.material.dispose();
      this.movementRangeMesh = null;
    }
    if (!army || army.movementPoints <= 0) return;
    this.movementRangeMesh = buildMovementRangeMesh(army.position, army.movementPoints);
    this.scene.add(this.movementRangeMesh);
  }

  canMoveTo(position) {
    return Boolean(this.movementRangeMesh && isPositionInMovementRange(position, this.movementRangeMesh.userData.cellIds));
  }

  pickGround(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const [hit] = raycaster.intersectObject(this.terrainMesh, false);
    return hit?.point ?? null;
  }

  refreshArmyRoutes() {
    this.scene.remove(this.routeGroup);
    this.routeGroup.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    this.routeGroup = new THREE.Group();
    for (const army of Object.values(GameData.armies)) {
      if (!army.routePath || army.routePath.length < 2) continue;
      const points = army.routePath.map((point) => new THREE.Vector3(point.x, this.heightAt(point.x, point.z) + 2.5 * MAP_SCALE, point.z));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: GameData.factions[army.factionId].color,
        dashSize: 12,
        gapSize: 7,
        transparent: true,
        opacity: 0.9,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.routeGroup.add(line);
      const goal = points[points.length - 1];
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(5 * MAP_SCALE, 13 * MAP_SCALE, 5),
        new THREE.MeshStandardMaterial({ color: GameData.factions[army.factionId].color, emissive: 0x332211 })
      );
      marker.position.copy(goal);
      marker.position.y += 6;
      marker.rotation.x = Math.PI;
      this.routeGroup.add(marker);
    }
    this.scene.add(this.routeGroup);
  }

  _syncArmyModels(timeSeconds) {
    const activeIds = new Set(Object.keys(GameData.armies));
    for (const [id, model] of this.armyModels) {
      if (activeIds.has(id)) continue;
      this.armyModelsGroup.remove(model);
      model.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) node.material.dispose();
      });
      this.armyModels.delete(id);
    }
    for (const army of Object.values(GameData.armies)) {
      let model = this.armyModels.get(army.id);
      if (!model) {
        model = buildArmyGeneral(GameData.factions[army.factionId].color);
        model.userData.previousX = army.position.x;
        model.userData.previousZ = army.position.z;
        this.armyModels.set(army.id, model);
        this.armyModelsGroup.add(model);
      }
      const { x, z } = army.position;
      const dx = x - model.userData.previousX;
      const dz = z - model.userData.previousZ;
      if (Math.hypot(dx, dz) > 0.05) model.rotation.y = Math.atan2(dx, dz);
      model.userData.previousX = x;
      model.userData.previousZ = z;
      model.userData.baseY = this.heightAt(x, z) + 0.8 * MAP_SCALE;
      model.position.set(x, model.userData.baseY, z);
      animateArmyGeneral(model, timeSeconds, army.isMarching && army.visualProgress < army.routeProgress - 0.01);
    }
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  update(delta) {
    this.cameraRig.update(delta);
    this.riverMeshes.userData.update(performance.now() / 1000);
    this._syncArmyModels(performance.now() / 1000);
    this.renderer.render(this.scene, this.camera);
  }

  heightAt(x, z) {
    return getHeight(x, z);
  }

  // Projects a THREE.Vector3 world position to CSS pixel coordinates within the container.
  projectToScreen(worldPos) {
    const v = worldPos.clone().project(this.camera);
    const behind = v.z > 1;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    return { x, y, behind };
  }
}
