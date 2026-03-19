/**
 * Mock for D3 force simulation used in TaxonomyGraph tests.
 *
 * Instead of running a real physics simulation (which is non-deterministic
 * and slow in jsdom), this mock immediately assigns static positions to
 * nodes and provides no-op methods for the force API.
 */

import { vi } from "vitest";

interface MockNode {
  id: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  vx: number;
  vy: number;
  index?: number;
  [key: string]: unknown;
}

interface MockLink {
  source: string | MockNode;
  target: string | MockNode;
  index?: number;
  [key: string]: unknown;
}

/**
 * Creates a mock forceSimulation that immediately sets x/y positions
 * on nodes in a grid layout and provides chainable no-op methods.
 */
export function createMockForceSimulation(): Record<string, unknown> {
  let nodes: MockNode[] = [];
  let tickCallback: (() => void) | null = null;
  let endCallback: (() => void) | null = null;

  const simulation = {
    nodes: vi.fn((n?: MockNode[]) => {
      if (n !== undefined) {
        nodes = n;
        // Assign deterministic positions in a grid
        const cols = Math.ceil(Math.sqrt(nodes.length));
        nodes.forEach((node, i) => {
          node.x = (i % cols) * 100 + 50;
          node.y = Math.floor(i / cols) * 100 + 50;
          node.vx = 0;
          node.vy = 0;
          node.index = i;
        });
        return simulation;
      }
      return nodes;
    }),
    force: vi.fn(() => simulation),
    alpha: vi.fn(() => simulation),
    alphaTarget: vi.fn(() => simulation),
    alphaDecay: vi.fn(() => simulation),
    alphaMin: vi.fn(() => simulation),
    velocityDecay: vi.fn(() => simulation),
    restart: vi.fn(() => {
      // Fire tick and end immediately for deterministic testing
      if (tickCallback) tickCallback();
      if (endCallback) endCallback();
      return simulation;
    }),
    stop: vi.fn(() => simulation),
    tick: vi.fn(() => simulation),
    on: vi.fn((event: string, callback: (() => void) | null) => {
      if (event === "tick") tickCallback = callback;
      if (event === "end") endCallback = callback;
      return simulation;
    }),
    find: vi.fn((_x: number, _y: number) => nodes[0]),
  };

  return simulation;
}

/**
 * Creates a mock forceLink that provides chainable no-op methods.
 */
export function createMockForceLink(): Record<string, unknown> {
  let links: MockLink[] = [];

  const forceObj: Record<string, unknown> = {};

  const force = vi.fn((_links?: MockLink[]) => {
    if (_links !== undefined) links = _links;
    return forceObj;
  });

  Object.assign(forceObj, force, {
    id: vi.fn(() => forceObj),
    distance: vi.fn(() => forceObj),
    strength: vi.fn(() => forceObj),
    links: vi.fn((_l?: MockLink[]) => {
      if (_l !== undefined) {
        links = _l;
        return forceObj;
      }
      return links;
    }),
  });

  return forceObj;
}

/**
 * Creates a mock forceManyBody.
 */
export function createMockForceManyBody(): Record<string, unknown> {
  const forceObj: Record<string, unknown> = {};
  const force = vi.fn(() => forceObj);
  Object.assign(forceObj, force, {
    strength: vi.fn(() => forceObj),
    distanceMin: vi.fn(() => forceObj),
    distanceMax: vi.fn(() => forceObj),
    theta: vi.fn(() => forceObj),
  });
  return forceObj;
}

/**
 * Creates a mock forceCenter.
 */
export function createMockForceCenter(): Record<string, unknown> {
  const forceObj: Record<string, unknown> = {};
  const force = vi.fn(() => forceObj);
  Object.assign(forceObj, force, {
    x: vi.fn(() => forceObj),
    y: vi.fn(() => forceObj),
    strength: vi.fn(() => forceObj),
  });
  return forceObj;
}

/**
 * Creates a mock forceCollide.
 */
export function createMockForceCollide(): Record<string, unknown> {
  const forceObj: Record<string, unknown> = {};
  const force = vi.fn(() => forceObj);
  Object.assign(forceObj, force, {
    radius: vi.fn(() => forceObj),
    strength: vi.fn(() => forceObj),
    iterations: vi.fn(() => forceObj),
  });
  return forceObj;
}
