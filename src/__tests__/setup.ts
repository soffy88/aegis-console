import "@testing-library/jest-dom";

// Provide next-intl translations without requiring a provider in tests.
// Uses the English message catalogue so test assertions match English text.
vi.mock("next-intl", async () => {
  const enMessages: Record<string, Record<string, unknown>> = (
    await import("../messages/en.json")
  ).default as unknown as Record<string, Record<string, unknown>>;

  return {
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
      const raw = namespace ? enMessages[namespace]?.[key] : key;
      let s = typeof raw === "string" ? raw : key;
      // Mimic next-intl {param} interpolation so tests match rendered text.
      if (values) {
        for (const [k, val] of Object.entries(values)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(val));
        }
      }
      return s;
    },
    useLocale: () => "en",
    useFormatter: () => ({}),
  };
});
