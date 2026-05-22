import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InstallModal } from "@/app/apps/page";

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <InstallModal onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("InstallModal", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ install_id: "x", status: "installing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("installForm.empty_install_dir.shows_error", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("e.g. homeassistant"), "myapp");
    await user.click(screen.getByText("Install"));

    expect(screen.getByText("install_dir is required")).toBeInTheDocument();
  });

  it("installForm.whitespace_only.shows_error", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("e.g. homeassistant"), "myapp");
    await user.type(screen.getByPlaceholderText("~/apps/{slug}"), "   ");
    await user.click(screen.getByText("Install"));

    expect(
      screen.getByText("install_dir cannot be whitespace only"),
    ).toBeInTheDocument();
  });

  it("installForm.no_undefined_fallback", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.mocked(globalThis.fetch);
    renderModal();

    await user.type(screen.getByPlaceholderText("e.g. homeassistant"), "myapp");
    await user.type(screen.getByPlaceholderText("~/apps/{slug}"), "/opt/myapp");
    await user.click(screen.getByText("Install"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;

    expect(typeof body.install_dir).toBe("string");
    expect(body.install_dir).not.toBe("");
    expect(body.install_dir).not.toBeUndefined();
    expect(body.install_dir).not.toBeNull();
  });
});
