import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WebhookDetailPage from "@/app/[locale]/orgs/[org_slug]/webhooks/[sub_id]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({
  useOrgIdBySlug: vi.fn().mockReturnValue("org-111"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", sub_id: "sub-0001" }),
}));
vi.mock("@/lib/auth/use-permission", () => ({
  usePermission: vi.fn().mockReturnValue({
    role: "member",
    canView: true,
    canOperate: true,
    canWrite: true,
    canAdmin: false,
    isOwner: false,
  }),
}));

const mockSub = {
  sub_id: "sub-0001",
  org_id: "org-111",
  name: "my-webhook",
  url: "https://example.com/webhook",
  has_secret: true,
  event_types: ["alert.fired", "autoheal.completed"],
  retry_count: 3,
  retry_backoff_seconds: [5, 15, 45],
  enabled: true,
  created_by: "user-aaa",
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
};

const mockDelivery = {
  delivery_id: "del-0001",
  sub_id: "sub-0001",
  org_id: "org-111",
  event_type: "alert.fired",
  payload: { rule_id: "rule-001" },
  attempt_no: 0,
  max_attempts: 4,
  next_attempt_at: "2026-06-01T10:00:00Z",
  last_attempt_at: null,
  last_status_code: 200,
  last_error: null,
  state: "succeeded" as const,
  created_at: "2026-06-01T10:00:00Z",
  succeeded_at: "2026-06-01T10:00:05Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// webhook-detail page has 3 queries: useWebhookEventTypes + sub + deliveries
const mockEventTypes = { event_types: [] };

describe("WebhookDetailPage", () => {
  it("renders webhook name and url", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockEventTypes)
      .mockResolvedValueOnce(mockSub)
      .mockResolvedValueOnce([]);
    render(<WebhookDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("my-webhook")).toBeInTheDocument();
      expect(screen.getByText(/example\.com/)).toBeInTheDocument();
    });
  });

  it("shows secret masked indicator when has_secret true", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockEventTypes)
      .mockResolvedValueOnce(mockSub)
      .mockResolvedValueOnce([]);
    render(<WebhookDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/••••/)).toBeInTheDocument();
    });
  });

  it("renders delivery history with state badge", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockEventTypes)
      .mockResolvedValueOnce(mockSub)
      .mockResolvedValueOnce([mockDelivery]);
    render(<WebhookDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("succeeded")).toBeInTheDocument();
      // "alert.fired" appears in config section AND delivery table — confirm at least one
      expect(screen.getAllByText("alert.fired").length).toBeGreaterThan(0);
    });
  });

  it("delete button triggers confirm dialog", async () => {
    vi.mocked(api.aegisFetch)
      .mockResolvedValueOnce(mockEventTypes)
      .mockResolvedValueOnce(mockSub)
      .mockResolvedValueOnce([]);
    render(<WebhookDetailPage />, { wrapper });
    await waitFor(() => screen.getByRole("button", { name: /delete/i }));
    screen.getByRole("button", { name: /delete/i }).click();
    await waitFor(() => {
      expect(
        screen.getByText(/delete this webhook subscription/i),
      ).toBeInTheDocument();
    });
  });
});
