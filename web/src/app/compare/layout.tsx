import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
