import "@testing-library/jest-dom";

// Provide next-intl translations without requiring a provider in tests.
// Uses the English message catalogue so test assertions match English text.
vi.mock("next-intl", async (importOriginal) => {
  const enMessages: Record<string, Record<string, string>> = (
    await import("../messages/en.json")
  ).default as Record<string, Record<string, string>>;

  return {
    useTranslations: (namespace?: string) => (key: string) => {
      if (!namespace) return key;
      return enMessages[namespace]?.[key] ?? key;
    },
    useLocale: () => "en",
    useFormatter: () => ({}),
  };
});
