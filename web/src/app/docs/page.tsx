import type { Metadata } from "next";
import { DocsContent } from "@/components/DocsContent";

export const metadata: Metadata = {
  title: "Docs — The Under-grounders",
  description:
    "How the The Under-grounders works: architecture, pipeline, search, graph, scoring, API, and self-hosting.",
};

export default function DocsPage() {
  return <DocsContent />;
}
