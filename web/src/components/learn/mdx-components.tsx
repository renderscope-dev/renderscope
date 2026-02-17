import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";

export function getMdxComponents(): MDXComponents {
  return {
    h2: ({ children, id, ...props }) => (
      <h2
        id={id}
        className="mt-12 mb-4 scroll-mt-24 border-b border-border/40 pb-2 text-2xl font-semibold tracking-tight text-foreground"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, id, ...props }) => (
      <h3
        id={id}
        className="mt-8 mb-3 scroll-mt-24 text-xl font-semibold text-foreground"
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p
        className="mb-4 max-w-[70ch] leading-7 text-muted-foreground"
        {...props}
      >
        {children}
      </p>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ children, ...props }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-muted-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-muted-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-7" {...props}>
        {children}
      </li>
    ),
    code: ({ children, className: codeClassName, ...props }) => {
      // Inline code (no language class)
      if (!codeClassName) {
        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground"
            {...props}
          >
            {children}
          </code>
        );
      }
      // Code block content (inside <pre>)
      return (
        <code className={cn("text-sm", codeClassName)} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre
        className="mb-4 overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-4 text-sm"
        {...props}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="mb-4 border-l-2 border-primary/40 pl-4 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),
    table: ({ children, ...props }) => (
      <div className="mb-4 overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="border border-border/50 bg-muted/30 px-4 py-2 text-left font-semibold text-foreground"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        className="border border-border/50 px-4 py-2 text-muted-foreground"
        {...props}
      >
        {children}
      </td>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    hr: () => <hr className="my-8 border-border/40" />,
  };
}
