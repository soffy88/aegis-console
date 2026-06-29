import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReleaseGatesListPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/projects/[project_slug]/release-gates/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({
  useOrgIdBySlug: vi.fn().mockReturnValue("org-111"),
}));
vi.mock("@/hooks/use-project-id", () => ({
  useProjectIdBySlug: vi.fn().mockReturnValue("proj-222"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", project_slug: "my-proj" }),
}));

const mockPendingGate = {
  gate_id: "gate-aaaa-0001",
  org_id: "org-111",
  project_id: "proj-222",
  autoheal_event_id: null,
  action_kind: "restart_container",
  action_payload: { container: "nginx" },
  requested_by: "user-aaa",
  requested_at: "2026-06-01T10:00:00Z",
  state: "pending" as const,
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  expires_at: "2026-06-02T10:00:00Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ReleaseGatesListPage", () => {
  it("renders empty state when no gates", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<ReleaseGatesListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/no release gates/i)).toBeInTheDocument();
    });
  });

  it("renders table with gate rows", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([mockPendingGate]);
    render(<ReleaseGatesListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("restart_container")).toBeInTheDocument();
    });
  });

  it("shows pending state badge", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([mockPendingGate]);
    render(<ReleaseGatesListPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
  });
});
