import type Konva from "konva";

/**
 * Maps element ids to their Konva group so the Transformer (rendered in an
 * unclipped overlay) can attach to whichever element is selected.
 */
const nodes = new Map<string, Konva.Group>();

export function registerElementNode(id: string, node: Konva.Group) {
  nodes.set(id, node);
}

export function unregisterElementNode(id: string) {
  nodes.delete(id);
}

export function getElementNode(id: string | null) {
  if (!id) return null;
  return nodes.get(id) ?? null;
}
