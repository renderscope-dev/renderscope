import { Suspense } from "react";
import { getAllRenderers } from "@/lib/data";
import { FeatureMatrixTestContent } from "./content";

export const metadata = {
  title: "Feature Matrix Test",
  robots: { index: false, follow: false },
};

/**
 * Dev/test page for the FeatureMatrix component in isolation.
 * Loads all renderers at build time and passes them to the client.
 */
export default function FeatureMatrixTestPage() {
  const allRenderers = getAllRenderers();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          Loading...
        </div>
      }
    >
      <FeatureMatrixTestContent renderers={allRenderers} />
    </Suspense>
  );
}
