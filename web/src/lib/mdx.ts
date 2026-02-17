import fs from "fs";
import path from "path";
import type { TocHeading, FurtherReadingLink } from "@/types/learn";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "learn");

/**
 * Read raw MDX file content for a technique slug.
 * Returns null if the file doesn't exist.
 */
export function getRawMdxContent(slug: string): string | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Extract frontmatter from raw MDX content.
 * Returns the frontmatter object and the body without frontmatter.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = raw.match(fmRegex);

  if (!match) {
    return { frontmatter: {}, body: raw };
  }

  const fmBlock = match[1]!;
  const body = raw.slice(match[0].length).trim();
  const frontmatter: Record<string, unknown> = {};

  // Parse YAML-like frontmatter (simple key: value pairs and arrays)
  let currentKey = "";
  let currentArray: Record<string, string>[] | null = null;
  let currentItem: Record<string, string> | null = null;

  for (const line of fmBlock.split(/\r?\n/)) {
    // Array item property (e.g., "    url: https://...")
    if (currentArray && currentItem && /^\s{4,}\w/.test(line)) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
        currentItem[key] = val;
      }
      continue;
    }

    // Array item start (e.g., "  - title: ...")
    if (currentArray && /^\s{2,}-\s/.test(line)) {
      if (currentItem && Object.keys(currentItem).length > 0) {
        currentArray.push(currentItem);
      }
      currentItem = {};
      const rest = line.replace(/^\s*-\s*/, "");
      if (rest) {
        const colonIdx = rest.indexOf(":");
        if (colonIdx > 0) {
          const key = rest.slice(0, colonIdx).trim();
          const val = rest.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
          currentItem[key] = val;
        }
      }
      continue;
    }

    // Flush previous array
    if (currentArray && !/^\s/.test(line)) {
      if (currentItem && Object.keys(currentItem).length > 0) {
        currentArray.push(currentItem);
      }
      frontmatter[currentKey] = currentArray;
      currentArray = null;
      currentItem = null;
    }

    // Top-level key: value
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");

      if (val === "" || val === undefined) {
        // Could be the start of an array
        currentKey = key;
        currentArray = [];
        currentItem = null;
      } else {
        frontmatter[key] = val;
      }
    }
  }

  // Flush trailing array
  if (currentArray) {
    if (currentItem && Object.keys(currentItem).length > 0) {
      currentArray.push(currentItem);
    }
    frontmatter[currentKey] = currentArray;
  }

  return { frontmatter, body };
}

/**
 * Extract headings from raw MDX content for TOC generation.
 * Matches h2 (##) and h3 (###) headings.
 */
export function extractHeadings(rawMdxContent: string): TocHeading[] {
  const { body } = parseFrontmatter(rawMdxContent);
  const headings: TocHeading[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(body)) !== null) {
    const level = match[1]!.length;
    const text = match[2]!.trim();
    const id = slugify(text);
    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Extract further reading links from frontmatter.
 */
export function getFurtherReading(
  frontmatter: Record<string, unknown>
): FurtherReadingLink[] {
  const raw = frontmatter["furtherReading"];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is Record<string, string> =>
        typeof item === "object" && item !== null && "title" in item && "url" in item
    )
    .map((item) => ({
      title: item["title"] ?? "",
      url: item["url"] ?? "",
      description: item["description"],
      type: (item["type"] as FurtherReadingLink["type"]) ?? "tutorial",
    }));
}

/**
 * Generate a URL-safe slug from heading text.
 * Matches what rehype-slug produces.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
