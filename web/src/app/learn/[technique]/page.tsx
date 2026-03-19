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
import {
  getRawMdxContent,
  extractHeadings,
  parseFrontmatter,
  getFurtherReading,
} from "@/lib/mdx";
import { generatePageMetadata, truncate } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
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
    return generatePageMetadata({
      title: "Technique Not Found",
      description: "The requested rendering technique could not be found.",
      path: `/learn/${slug}`,
    });
  }

  return generatePageMetadata({
    title: `${technique.name} — How It Works`,
    description: truncate(technique.shortDescription, 160),
    path: `/learn/${technique.id}`,
    ogImage: `/og/learn-${technique.id}.png`,
    keywords: [
      technique.name,
      "rendering technique",
      "computer graphics",
    ],
  });
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
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
          { name: technique.name, path: `/learn/${technique.id}` },
        ])}
      />
      <TechniquePageLayout
        technique={technique}
        allTechniques={allTechniques}
        headings={headings}
        relatedRenderers={relatedRenderers}
        furtherReading={furtherReading}
      >
        {content}
      </TechniquePageLayout>
    </>
  );
}
