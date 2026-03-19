/**
 * Lightweight class name merging utility.
 *
 * Replaces the web app's `cn()` (which depends on clsx + tailwind-merge).
 * Since the npm package uses plain CSS with `rs-` prefixed classes,
 * a simple concatenation is sufficient.
 */
export function cx(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(" ");
}
