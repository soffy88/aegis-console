"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "zh" ? "en" : "zh";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={toggle}
      className="mr-2 rounded px-2 py-1 text-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
