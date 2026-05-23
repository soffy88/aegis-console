import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DashboardPage (ORCAPanel)", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if (path === "/health") return Promise.resolve({ status: "ok" });
      if (path.includes("/apps")) return Promise.resolve([{ id: "1", app_name: "redis", status: "running", installed_at: "" }]);
      if (path.includes("/events")) return Promise.resolve([{ id: "e1", ts: "2026-01-01T00:00:00Z", event_type: "test", severity: "info" }]);
      if (path.includes("/projects")) return Promise.resolve([{ name: "stratum", status: "ok", health_url: "", version: null, timestamp: "" }]);
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
      expect(screen.getByText("stratum")).toBeInTheDocument();
    });
  });
});
