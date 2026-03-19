/**
 * Tests for scene data loading utilities.
 *
 * These functions use Node.js `fs` for build-time data loading.
 * Since Vitest runs in Node, we can test them directly against
 * the actual data files.
 */
import { describe, it, expect } from "vitest";
import { getAllScenes, getSceneById, getSceneSlugs } from "./scenes";
import type { SceneComplexity } from "@/types/scene";

const COMPLEXITY_ORDER: Record<SceneComplexity, number> = {
  trivial: 0,
  low: 1,
  medium: 2,
  high: 3,
  extreme: 4,
};

describe("getAllScenes", () => {
  it("returns a non-empty array", () => {
    const scenes = getAllScenes();
    expect(scenes).toBeInstanceOf(Array);
    expect(scenes.length).toBeGreaterThan(0);
  });

  it("every scene has required fields", () => {
    const scenes = getAllScenes();
    for (const s of scenes) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("complexity");
      expect(s).toHaveProperty("vertices");
      expect(s).toHaveProperty("faces");
      expect(s).toHaveProperty("lights");
      expect(s).toHaveProperty("camera");
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it("returns scenes sorted by complexity then name", () => {
    const scenes = getAllScenes();
    for (let i = 1; i < scenes.length; i++) {
      const prevOrder = COMPLEXITY_ORDER[scenes[i - 1]!.complexity] ?? 2;
      const currOrder = COMPLEXITY_ORDER[scenes[i]!.complexity] ?? 2;

      if (prevOrder === currOrder) {
        // Same complexity — alphabetical by name
        const prevName = scenes[i - 1]!.name.toLowerCase();
        const currName = scenes[i]!.name.toLowerCase();
        expect(prevName <= currName).toBe(true);
      } else {
        expect(prevOrder).toBeLessThanOrEqual(currOrder);
      }
    }
  });

  it("every scene has a valid complexity value", () => {
    const validComplexities: SceneComplexity[] = [
      "trivial",
      "low",
      "medium",
      "high",
      "extreme",
    ];
    const scenes = getAllScenes();
    for (const s of scenes) {
      expect(validComplexities).toContain(s.complexity);
    }
  });

  it("every scene has a valid camera", () => {
    const scenes = getAllScenes();
    for (const s of scenes) {
      expect(s.camera).toHaveProperty("position");
      expect(s.camera).toHaveProperty("look_at");
      expect(s.camera).toHaveProperty("fov");
      expect(s.camera.position).toHaveLength(3);
      expect(s.camera.look_at).toHaveLength(3);
      expect(typeof s.camera.fov).toBe("number");
    }
  });

  it("does not include template files", () => {
    const scenes = getAllScenes();
    const ids = scenes.map((s) => s.id);
    expect(ids.every((id) => !id.startsWith("_"))).toBe(true);
  });
});

describe("getSceneById", () => {
  it("returns correct scene for known id", () => {
    const scenes = getAllScenes();
    if (scenes.length === 0) return;

    const firstScene = scenes[0]!;
    const found = getSceneById(firstScene.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(firstScene.id);
    expect(found!.name).toBe(firstScene.name);
  });

  it("returns null for unknown id", () => {
    const found = getSceneById("nonexistent-scene-xyz");
    expect(found).toBeNull();
  });
});

describe("getSceneSlugs", () => {
  it("returns a non-empty array of strings", () => {
    const slugs = getSceneSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(typeof slug).toBe("string");
      expect(slug.length).toBeGreaterThan(0);
    }
  });

  it("does not include file extensions", () => {
    const slugs = getSceneSlugs();
    for (const slug of slugs) {
      expect(slug).not.toContain(".json");
    }
  });

  it("does not include template entries", () => {
    const slugs = getSceneSlugs();
    expect(slugs.every((s) => !s.startsWith("_"))).toBe(true);
  });

  it("matches the ids from getAllScenes", () => {
    const scenes = getAllScenes();
    const slugs = getSceneSlugs();

    const sceneIds = scenes.map((s) => s.id).sort();
    const sortedSlugs = [...slugs].sort();
    expect(sortedSlugs).toEqual(sceneIds);
  });
});
