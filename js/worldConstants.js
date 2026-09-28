// Expand strategic coordinates around the central plains so regional towns have
// room to breathe while preserving their relative locations.
export const MAP_SPREAD = 1.2;
export const MAP_SCALE = Math.sqrt(10);

export function spreadMapPosition(x, z) {
  return {
    x: x * MAP_SPREAD,
    z: z * MAP_SPREAD,
  };
}
