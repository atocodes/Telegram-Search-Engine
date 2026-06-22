import { getGraph, getHubs, getBridges, getClusters } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { GraphView } from "@/components/GraphView";
import type { GraphOut, HubOut, ClusterOut } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  let graph: GraphOut | null = null;
  let hubs: HubOut[] = [];
  let bridges: HubOut[] = [];
  let clusters: ClusterOut[] = [];
  try {
    [graph, hubs, bridges, clusters] = await Promise.all([
      getGraph(400),
      getHubs(15),
      getBridges(15),
      getClusters(),
    ]);
  } catch {
    graph = null;
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <div className="mb-1 font-mono text-xs text-accent">network</div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">
          Community Graph
        </h1>
        <div className="mt-6">
          <EmptyState
            title="no graph yet"
            hint="Crawl channels, then run: python -m app.graph.metrics — once channels reference each other, the network appears here."
          />
        </div>
      </div>
    );
  }

  return (
    <GraphView graph={graph} hubs={hubs} bridges={bridges} clusters={clusters} />
  );
}
