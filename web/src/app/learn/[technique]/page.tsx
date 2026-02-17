import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import {
  getAllTechniqueSlugs,
  getTechniqueBySlug,
  getAllTechniques,
  getRenderersByTechnique,
} from "@/lib/learn-data";
import { getRawMdxContent, extractHeadings, parseFrontmatter, getFurtherReading } from "@/lib/mdx";
import { getMdxComponents } from "@/components/learn/mdx-components";
import { TechniquePageLayout } from "@/components/learn";

interface TechniquePageProps {
  params: Promise<{ technique: string }>;
}

export function generateStaticParams() {
  return getAllTechniqueSlugs().map((technique) => ({ technique }));
}

export async function generateMetadata({
  params,
}: TechniquePageProps): Promise<Metadata> {
  const { technique: slug } = await params;
  const technique = getTechniqueBySlug(slug);

  if (!technique) {
    return { title: "Not Found" };
  }

  return {
    title: `${technique.name} — Learn`,
    description: technique.shortDescription,
    openGraph: {
      title: `${technique.name} — Learn | RenderScope`,
      description: technique.shortDescription,
    },
  };
}

export default async function TechniquePage({ params }: TechniquePageProps) {
  const { technique: slug } = await params;
  const technique = getTechniqueBySlug(slug);

  if (!technique) notFound();

  const rawContent = getRawMdxContent(slug);

  if (!rawContent) notFound();

  const allTechniques = getAllTechniques();
  const headings = extractHeadings(rawContent);
  const { frontmatter, body } = parseFrontmatter(rawContent);
  const furtherReading = getFurtherReading(frontmatter);
  const relatedRenderers = getRenderersByTechnique(slug);

  const { content } = await compileMDX({
    source: body,
    options: {
      mdxOptions: {
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ],
        remarkPlugins: [remarkGfm],
      },
    },
    components: getMdxComponents(),
  });

  return (
    <TechniquePageLayout
      technique={technique}
      allTechniques={allTechniques}
      headings={headings}
      relatedRenderers={relatedRenderers}
      furtherReading={furtherReading}
    >
      {content}
    </TechniquePageLayout>
  );
}
