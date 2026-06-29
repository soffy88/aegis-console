import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EventsPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/events/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
}));

const mockEvents = [
  {
    id: "evt-1",
    ts: "2026-01-01T10:00:00Z",
    event_type: "alert_fired",
    severity: "warning",
    payload: {},
    omodul_kind: null,
    autoheal_plugin: null,
    trace_id: "trc_abc123",
  },
];

const mockChain = [
  { id: "evt-1", parent_id: null, event_type: "alert_fired", payload: {}, ts: "2026-01-01T10:00:00Z", depth: 0 },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("EventsPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("causal-chain")) return Promise.resolve(mockChain);
      return Promise.resolve(mockEvents);
    });
  });

  it("renders Events heading", () => {
    render(<EventsPage />, { wrapper });
    expect(screen.getByRole("heading", { name: "Events" })).toBeInTheDocument();
  });

  it("loads and shows events", async () => {
    render(<EventsPage />, { wrapper });
    await waitFor(() => {
      // "alert_fired" now appears in both OEventTimeline and ODataTable
      expect(screen.getAllByText("alert_fired")[0]).toBeInTheDocument();
    });
  });

  it("calls org-scoped causal-chain endpoint when row is clicked", async () => {
    render(<EventsPage />, { wrapper });
    await waitFor(() => screen.getAllByText("alert_fired"));
    // click the table row (index 1) — timeline click navigates; table click sets selectedId
    fireEvent.click(screen.getAllByText("alert_fired")[1]!);
    await waitFor(() => {
      expect(api.aegisFetch).toHaveBeenCalledWith(
        expect.stringContaining("causal-chain"),
      );
    });
  });
});
