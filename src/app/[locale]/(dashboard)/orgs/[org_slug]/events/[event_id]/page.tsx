"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { OJsonViewer } from "@helios/blocks";
import type { CausalChainNode } from "@/types/aegis";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";
import { useOrgIdBySlug } from "@/hooks/use-org-id";

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("events");
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--card-foreground)]"
      aria-label={t("copyAria")}
    >
      {copied ? "✓" : t("copy")}
    </button>
  );
}

function ChainNode({ node, onExpand, expanded }: { node: CausalChainNode; onExpand: () => void; expanded: boolean }) {
  return (
    <div
      className="border-l-2 border-[var(--primary)] pl-4 py-2 cursor-pointer hover:bg-[var(--muted)] rounded"
      style={{ marginLeft: `${node.depth * 24}px` }}
      onClick={onExpand}
      data-testid={`chain-node-${node.id}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{new Date(node.ts).toLocaleTimeString()}</span>
        <span className="font-medium">{node.event_type}</span>
        {expanded ? <span className="text-xs text-[var(--primary)]">▼</span> : <span className="text-xs text-muted-foreground">▶</span>}
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
  const t = useTranslations("events");
  const { org_slug, event_id } = useParams<{ org_slug: string; event_id: string }>();
  const orgId = useOrgIdBySlug(org_slug);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: chain, isLoading, error } = useQuery<CausalChainNode[]>({
    queryKey: ["causal-chain", orgId, event_id],
    queryFn: () => aegisFetch<CausalChainNode[]>(`${paths.event(orgId!, event_id)}/causal-chain`),
    enabled: !!orgId,
  });

  const rootNode = chain?.find((n) => n.id === event_id);
  const traceId = rootNode ? (rootNode.payload as Record<string, unknown>)?.trace_id as string | undefined : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("detailPrefix")}: {event_id}</h1>
      {traceId && (
        <p className="text-sm text-muted-foreground">
          {t("trace")}: <code className="font-mono">{traceId}</code>
          <CopyButton text={traceId} />
        </p>
      )}
      {isLoading && <p>{t("loadingChain")}</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
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
