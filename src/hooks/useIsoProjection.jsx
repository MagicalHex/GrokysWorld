import { useCallback } from 'react';

/**
 * Returns the two projection helpers:
 *   worldToScreen(x, y)        → 2-D ground tile
 *   worldToScreen3D(x, y, z)   → 3-D with height (z = tile-height)
 */
export const useIsoProjection = (tileSize) => {
  const isoW = tileSize / 2;      // 0.5 × tileSize
  const isoH = tileSize / 4;      // 0.25 × tileSize  (feel free to tweak)

  const worldToScreen = useCallback(
    (x, y) => ({
      x: (x - y) * isoW,
      y: (x + y) * isoH,
    }),
    [isoW, isoH]
  );

  const worldToScreen3D = useCallback(
    (x, y, z = 0) => {
      const base = worldToScreen(x, y);
      return {
        x: base.x,
        y: base.y - z * isoH,   // lift up by height
      };
    },
    [worldToScreen]
  );

  return { worldToScreen, worldToScreen3D, isoW, isoH };
};