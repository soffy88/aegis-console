"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { OJsonViewer } from "@helios/blocks";
import type { CausalChainNode } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs hover:bg-gray-200"
      aria-label="Copy trace ID"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

function ChainNode({ node, onExpand, expanded }: { node: CausalChainNode; onExpand: () => void; expanded: boolean }) {
  return (
    <div
      className="border-l-2 border-blue-300 pl-4 py-2 cursor-pointer hover:bg-blue-50 rounded"
      style={{ marginLeft: `${node.depth * 24}px` }}
      onClick={onExpand}
      data-testid={`chain-node-${node.id}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{new Date(node.ts).toLocaleTimeString()}</span>
        <span className="font-medium">{node.event_type}</span>
        {expanded ? <span className="text-xs text-blue-500">▼</span> : <span className="text-xs text-muted-foreground">▶</span>}
      </div>
      {expanded && (
        <div className="mt-2">
          <OJsonViewer data={node.payload} />
        </div>
      )}
    </div>
  );
}

export default function EventDetailPage() {
  const { event_id } = useParams<{ event_id: string }>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: chain, isLoading, error } = useQuery<CausalChainNode[]>({
    queryKey: ["causal-chain", event_id],
    queryFn: () => aegisFetch<CausalChainNode[]>(`/api/v1/events/${event_id}/causal-chain`),
  });

  const rootNode = chain?.find((n) => n.id === event_id);
  const traceId = rootNode ? (rootNode.payload as Record<string, unknown>)?.trace_id as string | undefined : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Event: {event_id}</h1>
      {traceId && (
        <p className="text-sm text-muted-foreground">
          Trace: <code className="font-mono">{traceId}</code>
          <CopyButton text={traceId} />
        </p>
      )}
      {isLoading && <p>Loading causal chain…</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}
      <div className="space-y-1" data-testid="causal-chain-tree">
        {chain?.map((node) => (
          <ChainNode
            key={node.id}
            node={node}
            expanded={expandedId === node.id}
            onExpand={() => setExpandedId(expandedId === node.id ? null : node.id)}
          />
        ))}
      </div>
    </div>
  );
}
