import type { CardType, Rarity } from "@prisma/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

export const RARITY_CLASS: Record<Rarity, string> = {
  C: "rarity-common",
  U: "rarity-common",
  R: "rarity-rare",
  RR: "rarity-rare",
  AR: "rarity-epic",
  SR: "rarity-epic",
  SAR: "rarity-epic",
  IM: "rarity-legendary",
  UR: "rarity-legendary",
  S: "rarity-legendary",
  SSR: "rarity-legendary",
  UNKNOWN: "rarity-common",
};

export function getRarityLabel(rarity: Rarity, locale: Locale) {
  return getDictionary(locale).rarity[rarity];
}

export function getTypeLabel(type: CardType, locale: Locale) {
  return getDictionary(locale).cardType[type];
}

export function getElementLabel(element: string, locale: Locale) {
  const label = (getDictionary(locale).element as Record<string, string | undefined>)[element];
  return label ?? capitalize(element);
}

export function formatDate(date: Date | null, locale: Locale) {
  const dict = getDictionary(locale);
  if (!date) return dict.display.unknownDate;
  return new Intl.DateTimeFormat(dict.display.dateLocale, { dateStyle: "long" }).format(date);
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
