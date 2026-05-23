import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsPage from "@/app/projects/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/projects",
}));

const mockProjects = [
  { name: "stratum", health_url: "http://localhost:8000/health", status: "ok", version: "1.0.0", timestamp: "2026-05-23T00:00:00Z" },
  { name: "hevi", health_url: "http://localhost:8001/health", status: "down", version: null, timestamp: "2026-05-23T00:00:00Z" },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ProjectsPage", () => {
  it("renders project cards after fetch", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("stratum")).toBeInTheDocument();
      expect(screen.getByText("hevi")).toBeInTheDocument();
    });
  });

  it("maps status to indicator correctly", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("ok")).toBeInTheDocument();
      expect(screen.getByText("down")).toBeInTheDocument();
    });
  });

  it("links to project detail page", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockProjects);
    render(<ProjectsPage />, { wrapper });
    await waitFor(() => {
      const link = screen.getByText("stratum").closest("a");
      expect(link).toHaveAttribute("href", "/projects/stratum");
    });
  });
});
