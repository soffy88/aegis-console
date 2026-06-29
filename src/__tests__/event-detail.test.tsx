import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EventDetailPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/events/[event_id]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", event_id: "evt-1" }),
  usePathname: () => "/orgs/test-org/events/evt-1",
}));

const mockChain = [
  { id: "evt-1", parent_id: null, event_type: "alert_fired", payload: { trace_id: "trc_abc123", detail: "CPU high" }, ts: "2026-01-01T10:00:00Z", depth: 0 },
  { id: "evt-2", parent_id: "evt-1", event_type: "autoheal_triggered", payload: { action: "restart" }, ts: "2026-01-01T10:00:05Z", depth: 1 },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockChain);
  });

  it("renders causal chain tree", async () => {
    render(<EventDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("causal-chain-tree")).toBeInTheDocument();
      expect(screen.getByText("alert_fired")).toBeInTheDocument();
      expect(screen.getByText("autoheal_triggered")).toBeInTheDocument();
    });
  });

  it("expands node to show payload on click", async () => {
    render(<EventDetailPage />, { wrapper });
    await waitFor(() => screen.getByText("alert_fired"));
    fireEvent.click(screen.getByTestId("chain-node-evt-1"));
    await waitFor(() => {
      expect(screen.getByText("▼")).toBeInTheDocument();
    });
  });

  it("shows trace_id with copy button", async () => {
    render(<EventDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("trc_abc123")).toBeInTheDocument();
      expect(screen.getByLabelText("Copy trace ID")).toBeInTheDocument();
    });
  });
});
