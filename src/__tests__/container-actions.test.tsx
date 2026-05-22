import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContainerPage from "@/app/containers/[name]/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockInspect = { name: "my-container", status: "running", image: "nginx:latest" };
const mockLogs = { lines: ["line1", "line2"] };

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeParams(name: string) {
  return { name };
}

describe("ContainerPage", () => {
  beforeEach(() => {
    vi.mocked(api.aegisFetch).mockImplementation((path: string) => {
      if ((path as string).includes("/logs")) return Promise.resolve(mockLogs);
      return Promise.resolve(mockInspect);
    });
  });

  it("renders container name in heading", async () => {
    render(<ContainerPage params={makeParams("my-container")} />, { wrapper });
    expect(screen.getByText("my-container")).toBeInTheDocument();
  });

  it("shows start/stop/restart buttons", () => {
    render(<ContainerPage params={makeParams("my-container")} />, { wrapper });
    expect(screen.getByRole("button", { name: "start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "stop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "restart" })).toBeInTheDocument();
  });

  it("opens confirm dialog on stop click", async () => {
    render(<ContainerPage params={makeParams("my-container")} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /stop container/i })).toBeInTheDocument();
    });
  });
});
