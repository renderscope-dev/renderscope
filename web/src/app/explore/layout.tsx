import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
