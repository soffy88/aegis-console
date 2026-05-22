import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/health")) return Promise.resolve({ status: "ok" });
      if ((path as string).includes("/events")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it("renders OHealthBanner", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/All systems operational/i)).toBeInTheDocument();
    });
  });

  it("renders KPI card labels after data loads", async () => {
    render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Total Apps")).toBeInTheDocument();
      expect(screen.getByText("Running Apps")).toBeInTheDocument();
    });
  });

  it("shows Recent Events section heading", () => {
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText("Recent Events")).toBeInTheDocument();
  });
});
