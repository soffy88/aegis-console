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

describe("Org Dashboard (smoke)", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation(() => Promise.resolve([]));
  });

  it("renders the widget grid container", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(document.querySelector(".oui-widget-grid")).toBeTruthy();
    });
  });

  it("renders the KPI widget titles", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Containers")).toBeInTheDocument();
    });
  });

  it("renders the event stream widget", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Event Stream")).toBeInTheDocument();
    });
  });
});
