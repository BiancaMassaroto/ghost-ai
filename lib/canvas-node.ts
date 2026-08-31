import type { NodeShape } from "@/types/canvas";

/**
 * Generates a canvas node ID from its shape, the current timestamp, and a
 * caller-supplied counter, per `12-shape-panel.md` — the counter
 * disambiguates nodes dropped within the same millisecond (e.g. two fast
 * repeat drops), since `Date.now()` alone isn't guaranteed unique.
 */
export function generateNodeId(shape: NodeShape, counter: number): string {
  return `${shape}-${Date.now()}-${counter}`;
}
