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
      // Headline KPI cards derive from the live containers query (?all=true),
      // not the apps query — 2 containers, 1 running, 1 stopped.
      if ((path as string).includes("/containers"))
        return Promise.resolve([
          { id: "c1", name: "redis", image: "redis", status: "running", state: "running" },
          { id: "c2", name: "broken", image: "broken", status: "exited", state: "exited" },
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
      expect(screen.getByText("Containers")).toBeInTheDocument();
    });
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
    expect(screen.getByText("Events (1h)")).toBeInTheDocument();
    expect(document.querySelector(".oui-widget-grid")).toBeTruthy();
  });

  it("renders container counts derived from the containers query", async () => {
    render(<DashboardPage />, { wrapper });
    // 2 containers total, 1 running, 1 stopped → "2" and at least one "1" rendered.
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
