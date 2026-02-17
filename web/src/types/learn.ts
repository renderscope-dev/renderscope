/**
 * A rendering technique that has its own Learn page.
 * Loaded from data/techniques.json at build time.
 */
export interface Technique {
  id: string;
  name: string;
  shortDescription: string;
  icon: string;
  gradient: string;
  accentColor: string;
  order: number;
  rendererTechniqueId?: string;
}

/**
 * A glossary term entry.
 * Loaded from data/glossary.json at build time.
 */
export interface GlossaryTerm {
  term: string;
  definition: string;
  related: string[];
  seeAlso: string | null;
}

/**
 * A renderer as represented on the timeline.
 * Derived from the full renderer JSON data at build time.
 */
export interface TimelineRenderer {
  id: string;
  name: string;
  technique: string[];
  firstReleaseYear: number;
  status: string;
}

/**
 * A heading extracted from MDX content for table of contents generation.
 */
export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Further reading link entry for technique pages.
 */
export interface FurtherReadingLink {
  title: string;
  url: string;
  description?: string;
  type: "paper" | "book" | "tutorial" | "video" | "documentation";
}

/**
 * Compact renderer card data used in the "Related Renderers" section.
 */
export interface RendererCardData {
  id: string;
  name: string;
  language: string;
  status: string;
  technique: string[];
}
