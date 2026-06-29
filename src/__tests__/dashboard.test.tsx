import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/[locale]/(dashboard)/orgs/[org_slug]/page";
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

describe("DashboardPage (widget grid)", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/apps"))
        return Promise.resolve([
          { id: "1", app_name: "redis", status: "running", installed_at: "" },
          { id: "2", app_name: "broken", status: "failed", installed_at: "" },
        ]);
      if ((path as string).includes("/events"))
        return Promise.resolve([
          { id: "e1", ts: "2026-01-01T00:00:00Z", event_type: "deploy", severity: "info" },
        ]);
      return Promise.resolve([]);
    });
  });

  it("renders the widget grid with the KPI titles", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Total Apps")).toBeInTheDocument();
    });
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Events (1h)")).toBeInTheDocument();
    expect(document.querySelector(".oui-widget-grid")).toBeTruthy();
  });

  it("renders app counts derived from the apps query", async () => {
    render(<DashboardPage />, { wrapper });
    // 2 apps total, 1 running, 1 failed → "2" and at least one "1" rendered.
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the event stream timeline", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Event Stream")).toBeInTheDocument();
    });
  });
});
