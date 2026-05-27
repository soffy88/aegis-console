import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContainerPage from "@/app/orgs/[org_slug]/containers/[name]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("@/hooks/use-org-id", () => ({ useOrgIdBySlug: vi.fn().mockReturnValue("org-111") }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ org_slug: "test-org", name: "my-container" }),
}));

const mockInspect = { name: "my-container", status: "running", image: "nginx:latest" };
const mockLogs = { lines: ["line1", "line2"] };

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ContainerPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/logs")) return Promise.resolve(mockLogs);
      return Promise.resolve(mockInspect);
    });
  });

  it("renders container name in heading", async () => {
    render(<ContainerPage />, { wrapper });
    expect(screen.getByText("my-container")).toBeInTheDocument();
  });

  it("shows start/stop/restart buttons", () => {
    render(<ContainerPage />, { wrapper });
    expect(screen.getByRole("button", { name: "start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "stop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "restart" })).toBeInTheDocument();
  });

  it("opens confirm dialog on stop click", async () => {
    render(<ContainerPage />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /stop container/i })).toBeInTheDocument();
    });
  });
});
