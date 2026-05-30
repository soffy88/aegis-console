import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/orgs/[org_slug]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ org_slug: "test-org" }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("Org Dashboard (smoke)", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/health")) return Promise.resolve({ status: "ok" });
      return Promise.resolve([]);
    });
  });

  it("renders health banner", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  it("renders KPI grid container", () => {
    render(<DashboardPage />, { wrapper });
    expect(document.querySelector(".grid")).toBeTruthy();
  });

  it("renders Project Health panel", () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByTestId("project-health-panel")).toBeInTheDocument();
  });
});
