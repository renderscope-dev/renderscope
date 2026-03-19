import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function BenchmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
