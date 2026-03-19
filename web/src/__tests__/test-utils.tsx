import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import type { ReactElement } from "react";

/**
 * Wraps the component under test with all required providers.
 * Add new providers here as needed (e.g., NuqsAdapter for URL state tests).
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Override render with our custom version
export { customRender as render };
