import * as THREE from "three";
import { MAP_WIDTH, MAP_DEPTH, getHeight, isWalkable as isTerrainWalkable } from "./terrain.js";
import { MAP_SCALE } from "../worldConstants.js";

const CELL = 24 * MAP_SCALE;
const COLS = Math.round(MAP_WIDTH / CELL) + 1;
const ROWS = Math.round(MAP_DEPTH / CELL) + 1;
const NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].priority <= item.priority) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return null;
    const first = items[0];
    const last = items.pop();
    if (items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= items.length) break;
        const child = right < items.length && items[right].priority < items[left].priority ? right : left;
        if (items[child].priority >= last.priority) break;
        items[index] = items[child];
        index = child;
      }
      items[index] = last;
    }
    return first;
  }
  get length() { return this.items.length; }
}

function nodeId(col, row) { return row * COLS + col; }
function nodePoint(id) { return { x: (id % COLS) * CELL, z: Math.floor(id / COLS) * CELL }; }

function isWalkable(point) {
  return isTerrainWalkable(point.x, point.z);
}

function terrainStepCost(fromId, toId, diagonal) {
  const from = nodePoint(fromId);
  const to = nodePoint(toId);
  const rise = Math.abs(getHeight(from.x, from.z) - getHeight(to.x, to.z));
  const slope = Math.min(2.2, rise / CELL);
  return CELL * (diagonal ? Math.SQRT2 : 1) * (1 + slope * 0.85);
}

// A* searches an 8-way heightmap grid, preferring gentle ground and avoiding river cells.
export function findTerrainPath(start, destination) {
  const startCol = Math.max(0, Math.min(COLS - 1, Math.round(start.x / CELL)));
  const startRow = Math.max(0, Math.min(ROWS - 1, Math.round(start.z / CELL)));
  const goalCol = Math.max(0, Math.min(COLS - 1, Math.round(destination.x / CELL)));
  const goalRow = Math.max(0, Math.min(ROWS - 1, Math.round(destination.z / CELL)));
  const startId = nodeId(startCol, startRow);
  const goalId = nodeId(goalCol, goalRow);
  if (startId !== goalId && !isWalkable(nodePoint(goalId))) return [];
  const count = COLS * ROWS;
  const gScore = new Float64Array(count);
  gScore.fill(Infinity);
  const parent = new Int32Array(count);
  parent.fill(-1);
  const open = new MinHeap();
  const heuristic = (id) => {
    const p = nodePoint(id);
    return Math.hypot((goalCol * CELL) - p.x, (goalRow * CELL) - p.z);
  };
  gScore[startId] = 0;
  open.push({ id: startId, priority: heuristic(startId) });

  while (open.length) {
    const current = open.pop();
    if (current.id === goalId) break;
    const col = current.id % COLS;
    const row = Math.floor(current.id / COLS);
    for (const [dc, dr] of NEIGHBORS) {
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue;
      const nextId = nodeId(nextCol, nextRow);
      const nextPoint = nodePoint(nextId);
      if (!isWalkable(nextPoint)) continue;
      if (dc !== 0 && dr !== 0) {
        if (!isWalkable(nodePoint(nodeId(col + dc, row))) || !isWalkable(nodePoint(nodeId(col, row + dr)))) continue;
      }
      const tentative = gScore[current.id] + terrainStepCost(current.id, nextId, dc !== 0 && dr !== 0);
      if (tentative >= gScore[nextId]) continue;
      parent[nextId] = current.id;
      gScore[nextId] = tentative;
      open.push({ id: nextId, priority: tentative + heuristic(nextId) });
    }
  }

  if (startId !== goalId && parent[goalId] === -1) return [];
  const nodes = [];
  for (let id = goalId; id !== -1; id = parent[id]) {
    nodes.push(nodePoint(id));
    if (id === startId) break;
  }
  nodes.reverse();
  return [start, ...nodes.slice(1, -1), destination];
}

export function getMovementRangeCells(start, movementPoints) {
  const startCol = Math.max(0, Math.min(COLS - 1, Math.round(start.x / CELL)));
  const startRow = Math.max(0, Math.min(ROWS - 1, Math.round(start.z / CELL)));
  const startId = nodeId(startCol, startRow);
  const budget = Math.max(0, movementPoints) * 55 * MAP_SCALE;
  const costs = new Float64Array(COLS * ROWS);
  costs.fill(Infinity);
  costs[startId] = 0;
  const open = new MinHeap();
  open.push({ id: startId, priority: 0 });

  while (open.length) {
    const current = open.pop();
    if (current.priority !== costs[current.id] || current.priority > budget) continue;
    const col = current.id % COLS;
    const row = Math.floor(current.id / COLS);
    for (const [dc, dr] of NEIGHBORS) {
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue;
      const nextId = nodeId(nextCol, nextRow);
      const nextPoint = nodePoint(nextId);
      if (nextId !== startId && !isWalkable(nextPoint)) continue;
      if (dc !== 0 && dr !== 0) {
        if (!isWalkable(nodePoint(nodeId(col + dc, row))) || !isWalkable(nodePoint(nodeId(col, row + dr)))) continue;
      }
      const nextCost = costs[current.id] + terrainStepCost(current.id, nextId, dc !== 0 && dr !== 0);
      if (nextCost > budget || nextCost >= costs[nextId]) continue;
      costs[nextId] = nextCost;
      open.push({ id: nextId, priority: nextCost });
    }
  }

  const cells = [];
  for (let id = 0; id < costs.length; id++) {
    if (costs[id] <= budget) cells.push({ ...nodePoint(id), cost: costs[id], id });
  }
  return cells;
}

export function isPositionInMovementRange(position, cells) {
  const col = Math.max(0, Math.min(COLS - 1, Math.round(position.x / CELL)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.round(position.z / CELL)));
  const id = nodeId(col, row);
  return cells instanceof Set ? cells.has(id) : cells.some((cell) => cell.id === id);
}

export function buildMovementRangeMesh(start, movementPoints) {
  const cells = getMovementRangeCells(start, movementPoints);
  const positions = [];
  const indices = [];
  const half = CELL * 0.5;
  for (const cell of cells) {
    const x0 = Math.max(0, cell.x - half);
    const x1 = Math.min(MAP_WIDTH, cell.x + half);
    const z0 = Math.max(0, cell.z - half);
    const z1 = Math.min(MAP_DEPTH, cell.z + half);
    const base = positions.length / 3;
    positions.push(
      x0, getHeight(x0, z0) + 3 * MAP_SCALE, z0,
      x1, getHeight(x1, z0) + 3 * MAP_SCALE, z0,
      x0, getHeight(x0, z1) + 3 * MAP_SCALE, z1,
      x1, getHeight(x1, z1) + 3 * MAP_SCALE, z1
    );
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: 0x52b85a,
    transparent: true,
    opacity: 0.31,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.userData.cells = cells;
  mesh.userData.cellIds = new Set(cells.map((cell) => cell.id));
  return mesh;
}

export function measurePath(path) {
  let length = 0;
  for (let i = 1; i < path.length; i++) length += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return length;
}

export function pointAlongPath(path, distance) {
  if (!path?.length) return { x: 0, z: 0 };
  let remaining = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= segment || i === path.length - 1) {
      const t = segment > 0 ? Math.min(1, remaining / segment) : 1;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    remaining -= segment;
  }
  return { ...path[path.length - 1] };
}
