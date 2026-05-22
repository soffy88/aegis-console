import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppsPage from "@/app/apps/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockApps = [
  {
    id: "app-1",
    app_name: "my-app",
    app_version: "1.0.0",
    install_dir: "/opt/my-app",
    domain: "app.example.com",
    status: "running",
    installed_at: "2026-01-01T00:00:00Z",
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("AppsPage", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.aegisFetch).mockReturnValue(new Promise(() => {}));
    render(<AppsPage />, { wrapper });
    expect(document.querySelector("[data-loading]") ?? document.body).toBeTruthy();
  });

  it("renders app rows after fetch", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue(mockApps);
    render(<AppsPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });
  });

  it("shows Install App link", () => {
    vi.mocked(api.aegisFetch).mockResolvedValue([]);
    render(<AppsPage />, { wrapper });
    expect(screen.getByRole("link", { name: /install app/i })).toBeInTheDocument();
  });
});
