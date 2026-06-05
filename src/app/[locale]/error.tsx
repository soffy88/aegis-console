"use client";

import { useTranslations } from "next-intl";
import { OErrorBoundaryPage } from "@helios/oui/pages";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  return <OErrorBoundaryPage title={t("title")} error={error} onReset={reset} />;
}
