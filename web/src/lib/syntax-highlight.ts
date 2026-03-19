import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["bash", "shell", "python", "cpp", "javascript"],
    });
  }
  return highlighterPromise;
}

/**
 * Highlight a code string at build time using Shiki.
 * Returns an HTML string with inline-styled `<span>` elements.
 */
export async function highlightCode(
  code: string,
  lang: string = "bash"
): Promise<string> {
  const highlighter = await getHighlighter();

  const supportedLangs = highlighter.getLoadedLanguages();
  const resolvedLang = supportedLangs.includes(lang) ? lang : "bash";

  return highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: "github-dark",
  });
}
