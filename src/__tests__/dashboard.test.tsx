import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/orgs/[org_slug]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
  usePathname: () => "/orgs/test-org",
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DashboardPage (ORCAPanel)", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/health")) return Promise.resolve({ status: "ok" });
      if ((path as string).includes("/apps")) return Promise.resolve([{ id: "1", app_name: "redis", status: "running", installed_at: "" }]);
      if ((path as string).includes("/events")) return Promise.resolve([{ id: "e1", ts: "2026-01-01T00:00:00Z", event_type: "test", severity: "info" }]);
      if ((path as string).includes("/projects")) return Promise.resolve([
        { id: "p-1", org_id: "org-111", slug: "stratum", name: "Stratum", display_name: "Stratum", environment: "prod", config: null, docker_labels: null, archived_at: null, created_at: "" }
      ]);
      return Promise.resolve([]);
    });
  });

  it("renders KPI row with app counts", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("kpi-row")).toBeInTheDocument();
    });
  });

  it("renders app grid with status badges", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("app-grid")).toBeInTheDocument();
      expect(screen.getByText("redis")).toBeInTheDocument();
    });
  });

  it("renders project health panel", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("project-health-panel")).toBeInTheDocument();
      expect(screen.getByText("Stratum")).toBeInTheDocument();
    });
  });
});
