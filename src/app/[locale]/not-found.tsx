"use client";

import { useTranslations } from "next-intl";
import { ONotFoundPage } from "@helios/oui/pages";

export default function NotFound() {
  const t = useTranslations("notFound");
  return <ONotFoundPage title={t("title")} message={t("message")} />;
}
