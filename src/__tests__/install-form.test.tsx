import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InstallPage from "@/app/apps/install/page";
import * as api from "@/lib/api";

vi.mock("@/lib/api", () => ({ aegisFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("InstallPage", () => {
  it("shows validation error when install_dir is empty", async () => {
    render(<InstallPage />, { wrapper });
    const nameInput = screen.getByPlaceholderText("my-app");
    fireEvent.change(nameInput, { target: { value: "test-app" } });
    fireEvent.click(screen.getByRole("button", { name: /install/i }));
    await waitFor(() => {
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
  });

  it("shows error when install_dir has whitespace", async () => {
    render(<InstallPage />, { wrapper });
    const nameInput = screen.getByPlaceholderText("my-app");
    const dirInput = screen.getByPlaceholderText("/opt/apps/my-app");
    fireEvent.change(nameInput, { target: { value: "test-app" } });
    fireEvent.change(dirInput, { target: { value: "/opt/bad dir" } });
    fireEvent.click(screen.getByRole("button", { name: /install/i }));
    await waitFor(() => {
      expect(screen.getByText("No whitespace allowed")).toBeInTheDocument();
    });
  });

  it("calls aegisFetch on valid submission", async () => {
    vi.mocked(api.aegisFetch).mockResolvedValue({ install_id: "x", status: "installing" });
    render(<InstallPage />, { wrapper });
    fireEvent.change(screen.getByPlaceholderText("my-app"), {
      target: { value: "my-app" },
    });
    fireEvent.change(screen.getByPlaceholderText("/opt/apps/my-app"), {
      target: { value: "/opt/my-app" },
    });
    fireEvent.click(screen.getByRole("button", { name: /install/i }));
    await waitFor(() => {
      expect(api.aegisFetch).toHaveBeenCalledWith(
        "/api/v1/apps/install",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
