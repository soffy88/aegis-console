import { useQuery } from "@tanstack/react-query";
import { aegisFetch } from "@/lib/api";
import { paths } from "@/lib/api-paths";

export interface WebhookEventTypeInfo {
  event_type: string;
  category: "alert" | "autoheal" | "release" | "error";
}

export interface WebhookEventTypesResponse {
  event_types: WebhookEventTypeInfo[];
}

export function useWebhookEventTypes(orgId: string | null) {
  return useQuery<WebhookEventTypesResponse>({
    queryKey: ["webhookEventTypes", orgId],
    queryFn: () =>
      aegisFetch<WebhookEventTypesResponse>(
        paths.webhookEventTypes(orgId ?? ""),
      ),
    enabled: !!orgId,
  });
}
