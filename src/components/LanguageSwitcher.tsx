"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageSwitcher({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { label: string; pt: string; en: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="language-switcher">
      <span className="sr-only">{labels.label}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(() => {
            setLocale(next);
          });
        }}
      >
        <option value="pt">{labels.pt}</option>
        <option value="en">{labels.en}</option>
      </select>
    </label>
  );
}
